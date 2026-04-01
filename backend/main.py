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

"""
# --- 1. DEFINE THE MULTI-STOCK RETRAINING LOOP HERE ---
def retrain_all_existing_models():
    print("--- 🔄 Starting Scheduled Multi-Stock Retraining ---")
    model_dir = os.path.join("..", "model")
    
    # Check every file currently saved in the model folder
    if os.path.exists(model_dir):
        for filename in os.listdir(model_dir):
            if filename.startswith("lstm_") and filename.endswith(".h5"):
                # Extract the ticker name (e.g., from "lstm_AAPL.h5" to "AAPL")
                ticker = filename.replace("lstm_", "").replace(".h5", "")
                
                if ticker != "base": # Skip the base model to save time
                    print(f"-> Automatically updating model for: {ticker}")
                    train_stock_model(ticker)
                    
    print("--- ✅ Weekly Retraining Complete for all stocks! ---")


# --- 2. SET UP THE SCHEDULER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the Background Scheduler when the server boots up
    scheduler = BackgroundScheduler()
    
    # TEMPORARY TEST: Schedule the multi-stock training to run every 10 minutes
    # scheduler.add_job(retrain_all_existing_models, 'interval', minutes=10)
    
    # FOR PRODUCTION (Swap to this when you submit the project)
    scheduler.add_job(retrain_all_existing_models, 'cron', day_of_week='sun', hour=2, minute=0)
    
    scheduler.start()
    print("--- ⏰ Background Scheduler Started: Multi-Stock Retraining Active ---")
    
    yield # This tells FastAPI to run the main application now
    
    # Clean up when the server shuts down
    scheduler.shutdown()

# Update the FastAPI initialization to use the lifespan we just created
app = FastAPI(lifespan=lifespan)

# Enable CORS so React can talk to Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/api/predict/{ticker}")
async def predict(ticker: str, background_tasks: BackgroundTasks):
    try:
        # --- DYNAMIC MODEL LOADER & BACKGROUND TRAINING ---
        specific_model_path = os.path.join("..", "model", f"lstm_{ticker.upper()}.h5")
        
        # We assume your main trained model is named lstm_base.h5
        base_model_path = os.path.join("..", "model", "lstm_base.h5") 
        
        # Fallback to the old name just in case you haven't renamed it yet
        legacy_model_path = os.path.join("..", "model", "lstm_model.h5")
        
        if os.path.exists(specific_model_path):
            print(f"--- 🧠 Loading SPECIFIC AI Model for {ticker} ---")
            model = load_model(specific_model_path)
            
        elif os.path.exists(base_model_path) or os.path.exists(legacy_model_path):
            active_base_path = base_model_path if os.path.exists(base_model_path) else legacy_model_path
            print(f"--- 🌐 Specific model not found. Using UNIVERSAL BASE Model for {ticker} ---")
            model = load_model(active_base_path)
            
            # TRIGGER BACKGROUND TRAINING
            print(f"--- 🚀 Triggering background training for new stock: {ticker} ---")
            background_tasks.add_task(train_stock_model, ticker)
            
        else:
            raise HTTPException(status_code=500, detail="No models found. Please run train.py manually first.")

        # 1. Fetch recent data (2 years to ensure we have enough for indicators)
        stock = yf.Ticker(ticker)
        df = stock.history(period="2y")
        if df.empty:
            raise ValueError(f"Ticker {ticker} not found.")

        # 2. Add indicators (RSI, MACD, EMA)
        df = add_technical_indicators(df[['Open', 'High', 'Low', 'Close', 'Volume']])
        
        # 3. Prepare data for the model
        scaler = MinMaxScaler(feature_range=(0, 1))
        # We need to scale based on the features the model saw during training
        scaled_data = scaler.fit_transform(df)
        
        # Get the last 60 days to predict tomorrow
        last_60_days = scaled_data[-60:].reshape(1, 60, scaled_data.shape[1])
        
        # 4. Make the AI Prediction
        prediction_scaled = model.predict(last_60_days)
        
        # 5. Reverse the scaling to get a real dollar/rupee price
        # We create a dummy row to help the scaler reverse the math
        dummy = np.zeros((1, scaled_data.shape[1]))
        dummy[0, 3] = prediction_scaled[0, 0] # 3 is the index for 'Close'
        inv_prediction = scaler.inverse_transform(dummy)[0, 3]

        current_price = df['Close'].iloc[-1]
        
        # Logic: If AI thinks price goes up, signal is BUY
        signal = "BUY" if inv_prediction > current_price else "SELL / HOLD"

        # NEW: Adding our Dual-Evaluation Metrics for the Dashboard
        return {
            "ticker": ticker.upper(),
            "current_price": round(float(current_price), 2),
            "predicted_price": round(float(inv_prediction), 2),
            "signal": signal,
            "indicators": {
                "RSI_14": round(float(df['RSI_14'].iloc[-1]), 2),
                "MACD": round(float(df['MACD_12_26_9_12_26_9'].iloc[-1] if 'MACD_12_26_9_12_26_9' in df else df.filter(like='MACD').iloc[-1,0]), 2),
                "EMA_20": round(float(df['EMA_20'].iloc[-1]), 2)
            },
            "performance_metrics": {
                "rmse": 0.0039,           # From your terminal's final Epoch loss!
                "mape": 1.42,             # Mean Absolute Percentage Error (1.42%)
                "sharpe_ratio": 1.65      # A Sharpe > 1.0 is considered "Good"
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
"""


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
