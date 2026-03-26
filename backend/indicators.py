import pandas as pd
import pandas_ta as ta

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a Pandas DataFrame containing raw OHLCV stock data and 
    appends the technical indicators required for the LSTM model.
    """
    # Create a copy to avoid modifying the original data directly
    data = df.copy()

    # Make sure the dataframe has a 'Close' column (pandas-ta relies on it)
    if 'Close' not in data.columns:
        raise ValueError("DataFrame must contain a 'Close' column.")

    # 1. Moving Averages (MA-5, MA-10, MA-20)
    data.ta.sma(length=5, append=True)
    data.ta.sma(length=10, append=True)
    data.ta.sma(length=20, append=True)

    # 2. Relative Strength Index (RSI-14)
    data.ta.rsi(length=14, append=True)

    # 3. MACD & Signal Line (Standard periods: 12, 26, 9)
    data.ta.macd(fast=12, slow=26, signal=9, append=True)

    # 4. Bollinger Bands (20-day, 2 standard deviations)
    data.ta.bbands(length=20, std=2, append=True)

    # 5. Exponential Moving Average (EMA - 20-day)
    data.ta.ema(length=20, append=True)

    # 6. Lag Features (Capturing short-term price memory)
    data['Close_1d_ago'] = data['Close'].shift(1)
    data['Close_2d_ago'] = data['Close'].shift(2)

    # Drop any rows that have missing values (NaN) because of the rolling windows
    # For example, a 20-day moving average can't be calculated for the first 19 days.
    data.dropna(inplace=True)

    return data