import pandas as pd
import yfinance as yf

try:
    from .indicators import RAW_FEATURE_COLUMNS, add_technical_indicators
except ImportError:
    from indicators import RAW_FEATURE_COLUMNS, add_technical_indicators


def fetch_price_history(ticker: str, period: str) -> pd.DataFrame:
    stock = yf.Ticker(ticker)
    history = stock.history(period=period, auto_adjust=False, actions=False)

    if history.empty:
        raise ValueError(f"Ticker {ticker} was not found or returned no market data.")

    missing_columns = [column for column in RAW_FEATURE_COLUMNS if column not in history.columns]
    if missing_columns:
        raise ValueError(f"Market data for {ticker} is missing columns: {', '.join(missing_columns)}.")

    return history.sort_index()[RAW_FEATURE_COLUMNS].copy()


def fetch_feature_frame(ticker: str, period: str) -> pd.DataFrame:
    return add_technical_indicators(fetch_price_history(ticker, period))
