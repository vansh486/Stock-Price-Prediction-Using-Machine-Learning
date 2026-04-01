import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")


def _env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return int(raw_value)


def _env_float(name: str, default: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return float(raw_value)


def _env_origins(name: str, default: str) -> list[str]:
    raw_value = os.getenv(name, default)
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


@dataclass(frozen=True)
class AppSettings:
    backend_dir: Path = field(default_factory=lambda: _BACKEND_DIR)
    project_dir: Path = field(init=False)
    model_dir: Path = field(init=False)
    artifacts_dir: Path = field(init=False)
    data_dir: Path = field(init=False)
    api_title: str = field(default_factory=lambda: os.getenv("API_TITLE", "Stock Predictor API"))
    api_version: str = field(default_factory=lambda: os.getenv("API_VERSION", "1.0.0"))
    look_back_window: int = field(default_factory=lambda: _env_int("LOOK_BACK_WINDOW", 60))
    train_period: str = field(default_factory=lambda: os.getenv("TRAIN_PERIOD", "5y"))
    prediction_period: str = field(default_factory=lambda: os.getenv("PREDICTION_PERIOD", "2y"))
    min_signal_threshold_pct: float = field(default_factory=lambda: _env_float("MIN_SIGNAL_THRESHOLD_PCT", 0.5))
    training_epochs: int = field(default_factory=lambda: _env_int("TRAINING_EPOCHS", 10))
    training_batch_size: int = field(default_factory=lambda: _env_int("TRAINING_BATCH_SIZE", 32))
    early_stopping_patience: int = field(default_factory=lambda: _env_int("EARLY_STOPPING_PATIENCE", 3))
    scheduler_enabled: bool = field(default_factory=lambda: _env_bool("SCHEDULER_ENABLED", True))
    scheduler_day_of_week: str = field(default_factory=lambda: os.getenv("SCHEDULER_DAY_OF_WEEK", "sun"))
    scheduler_hour: int = field(default_factory=lambda: _env_int("SCHEDULER_HOUR", 2))
    scheduler_minute: int = field(default_factory=lambda: _env_int("SCHEDULER_MINUTE", 0))
    allow_origins: list[str] = field(default_factory=lambda: _env_origins("ALLOWED_ORIGINS", "http://localhost:5173"))
    allow_credentials: bool = field(default_factory=lambda: _env_bool("ALLOW_CREDENTIALS", False))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO").upper())

    def __post_init__(self) -> None:
        project_dir = self.backend_dir.parent
        object.__setattr__(self, "project_dir", project_dir)
        object.__setattr__(self, "model_dir", project_dir / "model")
        object.__setattr__(self, "artifacts_dir", project_dir / "model" / "artifacts")
        object.__setattr__(self, "data_dir", self.backend_dir / "data")


settings = AppSettings()
