# Stock Prediction Using Machine Learning.

## Introduction


Professional full-stack stock intelligence dashboard with an LSTM-based prediction backend, technical indicator pipeline, and a polished React frontend for market monitoring, signal review, alerts, and position planning.

## Overview

This project combines:

- a `FastAPI` backend for prediction, model management, and scheduled retraining
- a `TensorFlow` LSTM pipeline for next-price forecasting
- a `React + Vite` frontend for interactive stock analysis
- a lightweight artifact system that stores model metadata, scaler state, and evaluation metrics per ticker

The application is designed to let a user enter a ticker symbol, request a forecast, inspect technical context, review the AI signal, and use that output in a more professional dashboard workflow.

## What The Project Does

When a user searches for a ticker:

1. The frontend calls the backend prediction endpoint.
2. The backend selects the best available model for that ticker.
3. Recent market data is fetched with `yfinance`.
4. Technical indicators are generated from OHLCV data.
5. The model predicts the next close direction and price.
6. The backend returns:
   - current price
   - predicted price
   - projected change
   - signal: `BUY`, `SELL`, or `HOLD`
   - indicator snapshot
   - saved model metrics and metadata
7. The frontend renders that response into charts, signal panels, workflow cards, alert tools, and portfolio planning views.

## Key Features

- Professional market dashboard UI
- Signal flow / decision pipeline section
- Forecast-driven price visualization
- Technical indicator snapshot
- Alert builder and local alert persistence
- Portfolio simulator with signal-aware defaults
- Backend health and model status endpoints
- Background training queue for missing or legacy models
- Scheduled retraining support via `APScheduler`
- Saved scaler, feature metadata, and metrics for newer trained models

## Architecture

### Frontend

Location: `frontend/`

Main stack:

- React 19
- Vite
- Tailwind CSS
- Recharts
- Lucide React

Primary responsibilities:

- fetch predictions from the backend
- render dashboard metrics and charts
- show decision flow and signal context
- manage theme and local alert state

### Backend

Location: `backend/`

Main stack:

- FastAPI
- TensorFlow / Keras
- scikit-learn
- pandas / numpy / pandas-ta
- yfinance
- APScheduler

Primary responsibilities:

- fetch and enrich market data
- train and load LSTM models
- persist model artifacts
- expose prediction and model management APIs
- schedule background retraining

## Repository Structure

```text
stock-predictor/
├── backend/
│   ├── artifacts.py
│   ├── indicators.py
│   ├── main.py
│   ├── market_data.py
│   ├── metrics.py
│   ├── model.py
│   ├── schemas.py
│   ├── settings.py
│   ├── train.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── model/
│   ├── *.h5 / *.keras
│   └── artifacts/
└── README.md
```

## How The Backend Works

### Prediction Flow

The prediction API in `backend/main.py` follows this flow:

1. Normalize the requested ticker.
2. Try to load a ticker-specific model from `model/`.
3. If no ticker-specific model exists, fall back to the base model when available.
4. If only a legacy model exists without scaler metadata, use a compatibility path and trigger background retraining.
5. Download recent market history.
6. Add technical indicators.
7. Build the model input window.
8. Run inference.
9. Convert the scaled output back into a real price.
10. Build a `BUY`, `SELL`, or `HOLD` signal using the configured minimum threshold.

### Training Flow

The training pipeline in `backend/train.py`:

1. fetches historical data
2. generates indicator features
3. scales the feature frame
4. creates sliding LSTM windows
5. trains the model with validation, early stopping, and learning-rate reduction
6. computes evaluation metrics
7. saves:
   - the model file
   - the scaler
   - feature column metadata
   - training metadata
   - evaluation metrics

### Model Artifacts

Newer training runs store artifacts under `model/artifacts/<ticker>/`.

These artifacts are used so inference can stay consistent with training:

- `scaler.joblib`
- `metadata.json`
- `metrics.json`

If a ticker only has an older `.h5` model and no artifact folder yet, the backend marks it as `legacy_compat`.

## Frontend Workflow

The frontend is built as a professional stock analysis workspace. The current UI includes:

- API status and latency indicators
- market session awareness
- signal card and performance panels
- price chart with projected direction
- watchlist and sector heatmap views
- signal pipeline / flowchart panel
- news and event cards
- alert builder
- portfolio simulator

Note: some non-core market panels in the UI are presentation helpers generated client-side to support the dashboard experience. The core forecast response still comes from the backend API.

## API Endpoints

Base URL: `http://localhost:8000`

### Public Routes

- `GET /`
  Returns service name, version, and status.

- `GET /health`
  Returns backend health, scheduler status, active training jobs, cached models, and trained model count.

- `GET /api/models`
  Returns the list of trained tickers.

- `GET /api/models/{ticker}/status`
  Returns whether a specific model exists, whether the base model is being used, artifact status, and training metadata.

- `POST /api/models/{ticker}/train`
  Queues model training for a ticker.

- `GET /api/predict/{ticker}`
  Returns the stock prediction payload consumed by the frontend.

### Interactive API Docs

FastAPI docs are available at:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## Local Setup

### Prerequisites

- Python 3.11+ recommended
- Node.js 18+ recommended
- npm

### 1. Clone And Enter The Project

```powershell
cd stock-predictor\stock-predictor
```

### 2. Backend Setup

Create and activate a virtual environment:

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
pip install -r backend\requirements.txt
```

Run the backend from the project root:

```powershell
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs by default at:

- `http://localhost:5173`

## Environment Variables

### Frontend

File: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Backend

File: `backend/.env`

Supported settings:

```env
API_TITLE=Stock Predictor API
API_VERSION=1.0.0
LOOK_BACK_WINDOW=60
TRAIN_PERIOD=5y
PREDICTION_PERIOD=2y
MIN_SIGNAL_THRESHOLD_PCT=0.5
TRAINING_EPOCHS=10
TRAINING_BATCH_SIZE=32
EARLY_STOPPING_PATIENCE=3
SCHEDULER_ENABLED=true
SCHEDULER_DAY_OF_WEEK=sun
SCHEDULER_HOUR=2
SCHEDULER_MINUTE=0
ALLOWED_ORIGINS=http://localhost:5173
ALLOW_CREDENTIALS=false
LOG_LEVEL=INFO
```

## Training A Model Manually

You can train a ticker directly from Python:

```powershell
.\backend\.venv\Scripts\Activate.ps1
python -c "from backend.train import train_stock_model; train_stock_model('AAPL')"
```

You can also queue training through the API:

```powershell
curl -X POST http://localhost:8000/api/models/AAPL/train
```

## Recommended First Run

For the cleanest setup:

1. Start the backend.
2. Train or queue one or two common tickers such as `AAPL` or `MSFT`.
3. Start the frontend.
4. Open the dashboard and request those tickers.

If your existing models are older `.h5` files without artifact metadata, retrain them once using the new backend pipeline so predictions can use the stored scaler and feature schema.

## Validation

Frontend validation used during development:

- `npm run lint`
- `npm run build`

Backend validation used during development:

- AST parse check for backend modules
- import smoke test for `backend.main`
- model loading smoke test for existing saved models

## Current Notes

- The backend now supports both fully persisted artifacts and older legacy models.
- Legacy models will still load, but retraining them is recommended.
- The frontend expects the backend API at `http://localhost:8000` unless overridden with `VITE_API_BASE_URL`.
- Do not commit `backend/__pycache__/` changes.

## Future Improvements

- Replace remaining synthetic UI helper feeds with live market/news data
- Add authentication and saved user watchlists
- Add model versioning and experiment tracking
- Add test coverage for training and prediction services
- Add containerized deployment with Docker
- Add CI checks for lint, build, and backend smoke tests

## Author

Project by the repository owner and contributors.
