from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from threading import Lock

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import BackgroundTasks, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sklearn.preprocessing import MinMaxScaler

try:
    from .artifacts import (
        BASE_TICKER,
        get_cached_model_count,
        get_model_status,
        list_trained_tickers,
        load_prediction_bundle,
        normalize_ticker,
    )
    from .indicators import extract_indicator_snapshot
    from .market_data import fetch_feature_frame
    from .model import build_signal, inverse_transform_target, prepare_inference_window
    from .schemas import (
        AvailableModelsResponse,
        HealthResponse,
        ModelStatusResponse,
        PredictionMetadata,
        PredictionResponse,
        TrainingAcceptedResponse,
    )
    from .settings import settings
    from .train import train_stock_model
except ImportError:
    from artifacts import (
        BASE_TICKER,
        get_cached_model_count,
        get_model_status,
        list_trained_tickers,
        load_prediction_bundle,
        normalize_ticker,
    )
    from indicators import extract_indicator_snapshot
    from market_data import fetch_feature_frame
    from model import build_signal, inverse_transform_target, prepare_inference_window
    from schemas import (
        AvailableModelsResponse,
        HealthResponse,
        ModelStatusResponse,
        PredictionMetadata,
        PredictionResponse,
        TrainingAcceptedResponse,
    )
    from settings import settings
    from train import train_stock_model


logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("stock_predictor.api")
_TRAINING_JOBS: set[str] = set()
_TRAINING_LOCK = Lock()
_SCHEDULER_RUNNING = False


def _mark_training_started(ticker: str) -> bool:
    with _TRAINING_LOCK:
        if ticker in _TRAINING_JOBS:
            return False
        _TRAINING_JOBS.add(ticker)
        return True


def _mark_training_finished(ticker: str) -> None:
    with _TRAINING_LOCK:
        _TRAINING_JOBS.discard(ticker)


def _training_in_progress(ticker: str) -> bool:
    with _TRAINING_LOCK:
        return ticker in _TRAINING_JOBS


def _run_training_job(ticker: str) -> None:
    try:
        train_stock_model(ticker)
    except Exception:
        logger.exception("Background training failed for %s", ticker)
    finally:
        _mark_training_finished(ticker)


def _queue_training(background_tasks: BackgroundTasks | None, ticker: str, reason: str) -> bool:
    normalized_ticker = normalize_ticker(ticker)
    scheduled = _mark_training_started(normalized_ticker)
    if not scheduled:
        return False

    logger.info("Scheduling background training for %s (%s)", normalized_ticker, reason)
    if background_tasks is None:
        _run_training_job(normalized_ticker)
    else:
        background_tasks.add_task(_run_training_job, normalized_ticker)
    return True


def retrain_all_existing_models() -> None:
    logger.info("Starting scheduled retraining run")
    for ticker in list_trained_tickers():
        if ticker == BASE_TICKER:
            continue
        if not _mark_training_started(ticker):
            logger.info("Skipping retrain for %s because a job is already running", ticker)
            continue
        _run_training_job(ticker)
    logger.info("Scheduled retraining run completed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _SCHEDULER_RUNNING

    scheduler = None
    if settings.scheduler_enabled:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            retrain_all_existing_models,
            "cron",
            day_of_week=settings.scheduler_day_of_week,
            hour=settings.scheduler_hour,
            minute=settings.scheduler_minute,
        )
        scheduler.start()
        _SCHEDULER_RUNNING = True
        logger.info("Background scheduler started")

    yield

    if scheduler is not None:
        scheduler.shutdown()
        _SCHEDULER_RUNNING = False
        logger.info("Background scheduler stopped")


def _legacy_predict(bundle, feature_frame):
    legacy_scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = legacy_scaler.fit_transform(feature_frame)
    look_back = settings.look_back_window
    if len(scaled_data) < look_back:
        raise ValueError(f"Need at least {look_back} rows of enriched data to build a prediction window.")

    prediction_scaled = bundle.model.predict(
        scaled_data[-look_back:].reshape(1, look_back, scaled_data.shape[1]),
        verbose=0,
    )
    predicted_price = inverse_transform_target(
        legacy_scaler,
        prediction_scaled.reshape(-1),
        list(feature_frame.columns),
        target_index=list(feature_frame.columns).index("Close"),
    )[0]
    logger.warning(
        "Using legacy prediction path for %s because scaler metadata is unavailable",
        bundle.source_ticker,
    )
    return float(predicted_price)


def _predict_price(bundle, feature_frame):
    if bundle.artifact_status == "full" and bundle.scaler is not None and bundle.feature_columns:
        prediction_window = prepare_inference_window(
            feature_frame,
            bundle.scaler,
            bundle.feature_columns,
            look_back=settings.look_back_window,
        )
        prediction_scaled = bundle.model.predict(prediction_window, verbose=0).reshape(-1)
        return float(
            inverse_transform_target(
                bundle.scaler,
                prediction_scaled,
                bundle.feature_columns,
            )[0]
        )

    return _legacy_predict(bundle, feature_frame)


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=settings.allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": settings.api_title,
        "version": settings.api_version,
        "status": "ok",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        scheduler_enabled=_SCHEDULER_RUNNING,
        training_jobs_in_progress=len(_TRAINING_JOBS),
        cached_models=get_cached_model_count(),
        trained_models=len(list_trained_tickers()),
    )


@app.get("/api/models", response_model=AvailableModelsResponse)
async def available_models():
    tickers = [ticker for ticker in list_trained_tickers() if ticker != BASE_TICKER]
    return AvailableModelsResponse(tickers=tickers)


@app.get("/api/models/{ticker}/status", response_model=ModelStatusResponse)
async def model_status(ticker: str):
    try:
        status_payload = get_model_status(ticker)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    status_payload["training_in_progress"] = _training_in_progress(status_payload["ticker"])
    return ModelStatusResponse(**status_payload)


@app.post(
    "/api/models/{ticker}/train",
    response_model=TrainingAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def queue_model_training(ticker: str, background_tasks: BackgroundTasks):
    try:
        normalized_ticker = normalize_ticker(ticker)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    scheduled = _queue_training(background_tasks, normalized_ticker, "manual request")
    reason = "training queued" if scheduled else "training already in progress"
    return TrainingAcceptedResponse(ticker=normalized_ticker, scheduled=scheduled, reason=reason)


@app.get("/api/predict/{ticker}", response_model=PredictionResponse)
async def predict(ticker: str, background_tasks: BackgroundTasks):
    try:
        normalized_ticker = normalize_ticker(ticker)
        bundle = load_prediction_bundle(normalized_ticker)
        if bundle is None:
            scheduled = _queue_training(background_tasks, normalized_ticker, "first request without any model")
            detail = "Model artifacts are not available yet."
            if scheduled:
                detail += " Training has been scheduled."
            raise HTTPException(status_code=503, detail=detail)

        background_training_scheduled = False
        if bundle.source_ticker == BASE_TICKER:
            background_training_scheduled = _queue_training(
                background_tasks,
                normalized_ticker,
                "specific model missing; using base model",
            )
        elif bundle.artifact_status != "full":
            background_training_scheduled = _queue_training(
                background_tasks,
                normalized_ticker,
                "legacy model loaded without scaler metadata",
            )

        feature_frame = fetch_feature_frame(normalized_ticker, settings.prediction_period)
        predicted_price = _predict_price(bundle, feature_frame)
        current_price = float(feature_frame["Close"].iloc[-1])
        signal, predicted_change_pct = build_signal(
            current_price,
            predicted_price,
            min_threshold_pct=settings.min_signal_threshold_pct,
        )

        return PredictionResponse(
            ticker=normalized_ticker,
            current_price=round(current_price, 2),
            predicted_price=round(predicted_price, 2),
            predicted_change_pct=round(predicted_change_pct, 2),
            signal=signal,
            indicators=extract_indicator_snapshot(feature_frame),
            performance_metrics=bundle.metrics,
            metadata=PredictionMetadata(
                model_source=bundle.source_ticker,
                artifact_status=bundle.artifact_status,
                trained_at=bundle.metadata.get("trained_at"),
                prediction_period=settings.prediction_period,
                look_back_window=settings.look_back_window,
                background_training_scheduled=background_training_scheduled,
            ),
        )
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("Prediction request failed for %s: %s", ticker, exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error while predicting %s", ticker)
        raise HTTPException(status_code=500, detail="Prediction request failed unexpectedly.") from exc
