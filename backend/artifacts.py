from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from threading import Lock
from typing import Any

import joblib
from tensorflow.keras.models import load_model

try:
    from .settings import settings
except ImportError:
    from settings import settings


MODEL_PREFIX = "lstm_"
BASE_TICKER = "BASE"
LEGACY_BASE_MODEL_NAME = "lstm_model.h5"
MODEL_EXTENSIONS = (".keras", ".h5")
_MODEL_CACHE: dict[str, tuple[tuple[int | None, ...], "ModelBundle"]] = {}
_CACHE_LOCK = Lock()


@dataclass
class ModelBundle:
    source_ticker: str
    model_path: Path
    model: Any
    scaler: Any | None
    feature_columns: list[str] | None
    metrics: dict[str, Any]
    metadata: dict[str, Any]
    artifact_status: str


def normalize_ticker(ticker: str) -> str:
    normalized = str(ticker or "").strip().upper()
    if not normalized:
        raise ValueError("Ticker symbol is required.")
    return normalized


def _json_load(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _json_dump(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def _artifact_dir(ticker: str) -> Path:
    return settings.artifacts_dir / ticker.lower()


def _scaler_path(ticker: str) -> Path:
    return _artifact_dir(ticker) / "scaler.joblib"


def _metadata_path(ticker: str) -> Path:
    return _artifact_dir(ticker) / "metadata.json"


def _metrics_path(ticker: str) -> Path:
    return _artifact_dir(ticker) / "metrics.json"


def _specific_model_candidates(ticker: str) -> list[Path]:
    return [settings.model_dir / f"{MODEL_PREFIX}{ticker}{extension}" for extension in MODEL_EXTENSIONS]


def _base_model_candidates() -> list[Path]:
    return [
        settings.model_dir / f"{MODEL_PREFIX}base.keras",
        settings.model_dir / f"{MODEL_PREFIX}base.h5",
        settings.model_dir / LEGACY_BASE_MODEL_NAME,
    ]


def _first_existing(paths: list[Path]) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    return None


def _artifact_signature(source_ticker: str, model_path: Path) -> tuple[int | None, ...]:
    artifact_paths = (
        model_path,
        _scaler_path(source_ticker),
        _metadata_path(source_ticker),
        _metrics_path(source_ticker),
    )
    return tuple(path.stat().st_mtime_ns if path.exists() else None for path in artifact_paths)


def _cache_key(source_ticker: str, model_path: Path) -> str:
    return f"{source_ticker}:{model_path.resolve()}"


def _load_bundle(source_ticker: str, model_path: Path) -> ModelBundle:
    source_ticker = normalize_ticker(source_ticker)
    signature = _artifact_signature(source_ticker, model_path)
    cache_key = _cache_key(source_ticker, model_path)

    with _CACHE_LOCK:
        cached = _MODEL_CACHE.get(cache_key)
        if cached and cached[0] == signature:
            return cached[1]

    scaler = joblib.load(_scaler_path(source_ticker)) if _scaler_path(source_ticker).exists() else None
    metadata = _json_load(_metadata_path(source_ticker))
    metrics = _json_load(_metrics_path(source_ticker))
    feature_columns = metadata.get("feature_columns")
    artifact_status = "full" if scaler is not None and feature_columns else "legacy_compat"
    bundle = ModelBundle(
        source_ticker=source_ticker,
        model_path=model_path,
        model=load_model(model_path, compile=False),
        scaler=scaler,
        feature_columns=feature_columns,
        metrics=metrics,
        metadata=metadata,
        artifact_status=artifact_status,
    )

    with _CACHE_LOCK:
        _MODEL_CACHE[cache_key] = (signature, bundle)

    return bundle


def save_model_artifacts(
    ticker: str,
    model: Any,
    scaler: Any,
    feature_columns: list[str],
    metrics: dict[str, Any],
    look_back_window: int,
    training_period: str,
    row_count: int,
) -> dict[str, Any]:
    ticker = normalize_ticker(ticker)
    settings.model_dir.mkdir(parents=True, exist_ok=True)
    settings.artifacts_dir.mkdir(parents=True, exist_ok=True)
    _artifact_dir(ticker).mkdir(parents=True, exist_ok=True)

    model_path = settings.model_dir / f"{MODEL_PREFIX}{ticker}.keras"
    model.save(model_path)
    joblib.dump(scaler, _scaler_path(ticker))

    metadata = {
        "ticker": ticker,
        "trained_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "feature_columns": feature_columns,
        "look_back_window": look_back_window,
        "training_period": training_period,
        "row_count": row_count,
        "model_path": str(model_path),
    }
    _json_dump(_metadata_path(ticker), metadata)
    _json_dump(_metrics_path(ticker), metrics)

    with _CACHE_LOCK:
        keys_to_drop = [key for key in _MODEL_CACHE if key.startswith(f"{ticker}:")]
        for key in keys_to_drop:
            _MODEL_CACHE.pop(key, None)

    return {
        "model_path": model_path,
        "metadata": metadata,
        "metrics": metrics,
    }


def load_prediction_bundle(requested_ticker: str) -> ModelBundle | None:
    requested_ticker = normalize_ticker(requested_ticker)
    specific_model_path = _first_existing(_specific_model_candidates(requested_ticker))
    if specific_model_path is not None:
        return _load_bundle(requested_ticker, specific_model_path)

    base_model_path = _first_existing(_base_model_candidates())
    if base_model_path is not None:
        return _load_bundle(BASE_TICKER, base_model_path)

    return None


def list_trained_tickers() -> list[str]:
    tickers: set[str] = set()
    for path in settings.model_dir.glob(f"{MODEL_PREFIX}*"):
        if path.suffix not in MODEL_EXTENSIONS:
            continue
        if path.name == LEGACY_BASE_MODEL_NAME:
            tickers.add(BASE_TICKER)
            continue

        stem = path.stem.replace(MODEL_PREFIX, "", 1).upper()
        if stem == "BASE":
            tickers.add(BASE_TICKER)
        elif stem:
            tickers.add(stem)

    return sorted(tickers)


def get_cached_model_count() -> int:
    with _CACHE_LOCK:
        return len(_MODEL_CACHE)


def get_model_status(ticker: str) -> dict[str, Any]:
    normalized_ticker = normalize_ticker(ticker)
    specific_model_path = _first_existing(_specific_model_candidates(normalized_ticker))
    base_model_path = _first_existing(_base_model_candidates())
    active_source = normalized_ticker if specific_model_path else BASE_TICKER if base_model_path else None
    active_model_path = specific_model_path or base_model_path

    metadata = _json_load(_metadata_path(active_source)) if active_source else {}
    metrics = _json_load(_metrics_path(active_source)) if active_source else {}
    artifact_status = None
    if active_source:
        artifact_status = "full" if _scaler_path(active_source).exists() and metadata.get("feature_columns") else "legacy_compat"

    return {
        "ticker": normalized_ticker,
        "specific_model_available": specific_model_path is not None,
        "base_model_available": base_model_path is not None,
        "active_model_source": active_source,
        "artifact_status": artifact_status,
        "trained_at": metadata.get("trained_at"),
        "model_path": str(active_model_path) if active_model_path else None,
        "look_back_window": metadata.get("look_back_window"),
        "training_period": metadata.get("training_period"),
        "row_count": metadata.get("row_count"),
        "feature_columns_count": len(metadata.get("feature_columns") or []),
        "metrics_available": bool(metrics),
    }
