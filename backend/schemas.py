from typing import Literal

from pydantic import BaseModel, Field


Signal = Literal["BUY", "SELL", "HOLD"]
ArtifactStatus = Literal["full", "legacy_compat"]


class IndicatorSnapshot(BaseModel):
    RSI_14: float | None = None
    MACD: float | None = None
    EMA_20: float | None = None


class PerformanceMetrics(BaseModel):
    rmse: float | None = None
    mae: float | None = None
    mape: float | None = None
    directional_accuracy: float | None = None
    total_return_pct: float | None = None
    sharpe_ratio: float | None = None


class PredictionMetadata(BaseModel):
    model_source: str
    artifact_status: ArtifactStatus
    trained_at: str | None = None
    prediction_period: str
    look_back_window: int
    background_training_scheduled: bool = False


class PredictionResponse(BaseModel):
    ticker: str
    current_price: float
    predicted_price: float
    predicted_change_pct: float
    signal: Signal
    indicators: IndicatorSnapshot
    performance_metrics: PerformanceMetrics
    metadata: PredictionMetadata


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    scheduler_enabled: bool
    training_jobs_in_progress: int
    cached_models: int
    trained_models: int


class ModelStatusResponse(BaseModel):
    ticker: str
    specific_model_available: bool
    base_model_available: bool
    active_model_source: str | None = None
    artifact_status: ArtifactStatus | None = None
    trained_at: str | None = None
    model_path: str | None = None
    look_back_window: int | None = None
    training_period: str | None = None
    row_count: int | None = None
    feature_columns_count: int | None = None
    metrics_available: bool
    training_in_progress: bool


class TrainingAcceptedResponse(BaseModel):
    ticker: str
    scheduled: bool
    reason: str = Field(description="Why the job was accepted or skipped.")


class AvailableModelsResponse(BaseModel):
    tickers: list[str]
