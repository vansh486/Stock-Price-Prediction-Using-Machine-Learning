# Stock Predictor

AI-powered stock intelligence dashboard built with React, FastAPI, and TensorFlow LSTM forecasting. The project combines technical indicators, model-driven price prediction, market-session awareness, and a professional dashboard UI for both US and Indian equities.

## Overview

This project is a full-stack stock analysis workspace with:

- a `React + Vite` frontend for interactive market views
- a `FastAPI` backend for prediction, model management, and training workflows
- a `TensorFlow / Keras` LSTM pipeline for next-price forecasting
- technical indicator generation from OHLCV market data
- market-aware formatting and session handling for both US and India

The goal is to let a user search a ticker, fetch a prediction, inspect technical context, review the resulting signal, and use that output inside a clean execution-focused dashboard.

## Key Features

- Professional stock dashboard UI
- `BUY`, `SELL`, and `HOLD` signal generation
- LSTM-based next-price prediction
- Technical indicators including RSI, MACD, and EMA
- Signal flow / decision pipeline visualization
- Watchlist, heatmap, and dashboard metrics
- Alert builder with local persistence
- Portfolio simulator with signal-aware defaults
- Backend health and model status APIs
- Background training queue for missing or legacy models
- Scheduled retraining support with `APScheduler`
- Support for both US and Indian equities

## Supported Markets

The frontend adapts by ticker:

- US tickers such as `AAPL`, `MSFT`, and `NVDA` use `USD` formatting and US market-session logic
- Indian tickers such as `RELIANCE.NS`, `TCS.NS`, and `INFY.NS` use `INR` formatting and India market-session logic
- Indian stock symbols should be entered with `.NS` or `.BO`

Examples:

- `AAPL`
- `NVDA`
- `RELIANCE.NS`
- `TCS.NS`
- `INFY.NS`

## How It Works

When a user searches for a ticker:

1. The frontend sends a request to `GET /api/predict/{ticker}`.
2. The backend normalizes the ticker and selects the best available model.
3. Recent market data is downloaded with `yfinance`.
4. Technical indicators are added to the raw OHLCV frame.
5. The model prepares the inference window and predicts the next close.
6. The backend returns:
   - current price
   - predicted price
   - projected percent change
   - trading signal
   - indicator snapshot
   - saved model metrics
   - model metadata
7. The frontend renders the response into charts, signal panels, execution guidance, alerts, and portfolio planning tools.

## Architecture

### Frontend

Location: `frontend/`

Main stack:

- React 19
- Vite
- Tailwind CSS
- Recharts
- Lucide React

Responsibilities:

- search and request predictions
- render charts and dashboard panels
- display session status and market-aware pricing
- manage theme and locally saved alerts

### Backend

Location: `backend/`

Main stack:

- FastAPI
- TensorFlow / Keras
- scikit-learn
- pandas / numpy / pandas-ta
- yfinance
- APScheduler

Responsibilities:

- fetch and enrich market data
- train and load LSTM models
- persist model artifacts
- serve prediction and model-management APIs
- queue and schedule retraining

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

## Backend Flow

### Prediction Flow

The backend prediction flow in `backend/main.py` is:

1. normalize the ticker
2. load a ticker-specific model if available
3. fall back to the base model if needed
4. trigger background training when only a base model or legacy artifact path is available
5. fetch recent market history
6. add technical indicators
7. build the model input window
8. run inference
9. inverse-transform the predicted target
10. return a structured prediction response

### Training Flow

The training flow in `backend/train.py`:

1. fetches historical data
2. generates indicators
3. scales the feature frame
4. creates sliding LSTM windows
5. trains the model with validation
6. applies early stopping and learning-rate reduction
7. calculates evaluation metrics
8. saves:
   - model file
   - scaler
   - metadata
   - metrics

### Model Artifacts

Newer training runs save artifacts under `model/artifacts/<ticker>/`.

Artifact contents:

- `scaler.joblib`
- `metadata.json`
- `metrics.json`

If a ticker only has an older `.h5` model without saved metadata, the backend loads it as `legacy_compat` and can schedule retraining in the background.

## Frontend Workflow

The frontend is designed as a professional stock analysis workspace. It currently includes:

- API status and latency cards
- US and India market-session tracking
- live price and predicted price cards
- candlestick-style forecast chart
- signal and confidence display
- signal pipeline flowchart
- watchlist and sector heatmap panels
- alert builder
- portfolio simulator
- news and event panels

Note: some secondary dashboard panels are client-generated presentation helpers. The core prediction response comes from the backend API.

## API Endpoints

Base URL: `http://localhost:8000`

### Routes

- `GET /`
  Returns service name, version, and health status.

- `GET /health`
  Returns scheduler state, active training jobs, cached models, and trained model count.

- `GET /api/models`
  Returns the list of trained tickers.

- `GET /api/models/{ticker}/status`
  Returns model availability, active source, artifact status, and training metadata.

- `POST /api/models/{ticker}/train`
  Queues training for a ticker.

- `GET /api/predict/{ticker}`
  Returns the prediction payload used by the frontend.

### API Docs

FastAPI interactive docs:

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

Frontend default URL:

- `http://localhost:5173`

## Environment Variables

### Frontend

File: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Backend

File: `backend/.env`

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

## Manual Training

Train a ticker directly:

```powershell
.\backend\.venv\Scripts\Activate.ps1
python -c "from backend.train import train_stock_model; train_stock_model('AAPL')"
```

Train an Indian ticker:

```powershell
python -c "from backend.train import train_stock_model; train_stock_model('RELIANCE.NS')"
```

Or queue training through the API:

```powershell
curl -X POST http://localhost:8000/api/models/AAPL/train
```

## Recommended First Run

1. Start the backend.
2. Train or queue a few common tickers such as `AAPL`, `MSFT`, `RELIANCE.NS`, or `TCS.NS`.
3. Start the frontend.
4. Open the dashboard and search those symbols.

If your existing models are older `.h5` files without artifact metadata, retrain them once with the current pipeline so inference uses the saved scaler and feature schema.

## Validation

Frontend validation:

- `npm run lint`
- `npm run build`

Backend validation:

- AST parse check for backend modules
- import smoke test for `backend.main`
- model loading smoke test for saved models

## Deployment Note

This project is split into:

- a static frontend
- a Python ML backend

That means the frontend can be deployed to a static host such as Netlify or Vercel, but the backend should be deployed to a Python-capable platform such as Render, Railway, Fly.io, or a VM/container host. The full project cannot run from a static frontend host alone.

## Current Notes

- The backend supports both full artifact-based models and legacy-compatible models.
- Legacy models still work, but retraining them is recommended.
- The frontend expects the backend API at `http://localhost:8000` unless `VITE_API_BASE_URL` is overridden.
- Generated caches and temporary artifacts should not be committed unless you intentionally want to version trained model outputs.

## Future Improvements

- replace synthetic dashboard helper feeds with live market/news sources
- add authentication and saved user watchlists
- add model versioning and experiment tracking
- add automated tests for training and prediction paths
- add containerized deployment with Docker
- add CI for lint, build, and backend smoke checks

## Author

Project by the repository owner and contributors.