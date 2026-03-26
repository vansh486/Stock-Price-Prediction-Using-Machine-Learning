import yfinance as yf
import pandas as pd
import numpy as np
from indicators import add_technical_indicators
from model import create_lstm_model, prepare_data
import os

def train_stock_model(ticker_symbol="RELIANCE.NS"):
    print(f"--- Starting Training for {ticker_symbol} ---")
    
    # 1. Collect Data (Step 1)
    stock = yf.Ticker(ticker_symbol)
    df = stock.history(period="5y")
    df = df[['Open', 'High', 'Low', 'Close', 'Volume']]
    
    # 2. Feature Engineering (Step 3)
    df_enriched = add_technical_indicators(df)
    
    # 3. Data Preprocessing (Step 2)
    # We use 'Close' as the target (index 3 usually)
    X, y, scaler = prepare_data(df_enriched)
    
    # Split Data 80:20 (Step 5)
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    # 4. Build & Train Model (Step 4 & 5)
    model = create_lstm_model((X_train.shape[1], X_train.shape[2]))
    
    print("Training neural network... this may take a minute.")
    model.fit(X_train, y_train, batch_size=32, epochs=10, validation_data=(X_test, y_test))
    
    # 5. Save the Model (Step 5)
    # Make sure we save it dynamically based on the ticker name!
    model_path = os.path.join("..", "model", f"lstm_{ticker_symbol.upper()}.h5")
    model.save(model_path)
    print(f"--- Training Complete! Model saved to {model_path} ---")

if __name__ == "__main__":
    train_stock_model()