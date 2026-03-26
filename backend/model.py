import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from sklearn.preprocessing import MinMaxScaler

def create_lstm_model(input_shape):
    """
    Constructs the Multi-layer LSTM model defined in Step 4 of the methodology.
    """
    model = Sequential([
        # Layer 1: First LSTM layer with Dropout
        LSTM(units=50, return_sequences=True, input_shape=input_shape),
        Dropout(0.2),
        
        # Layer 2: Second LSTM layer (Stacked)
        LSTM(units=50, return_sequences=False),
        Dropout(0.2),
        
        # Output Layers for Regression
        Dense(units=25),
        Dense(units=1)
    ])
    
    # Using Adam optimizer and Mean Squared Error loss as per Step 4
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

def prepare_data(df, look_back=60):
    """
    Step 2 & 4: Normalizes data and creates 60-day sliding windows.
    """
    # Min-Max Normalization to range [0, 1] for stable training
    scaler = MinMaxScaler(feature_range=(0, 1))
    
    # We use all features (Price + Technical Indicators)
    scaled_data = scaler.fit_transform(df)
    
    X, y = [], []
    for i in range(look_back, len(scaled_data)):
        # Create a window of 60 days
        X.append(scaled_data[i-look_back:i])
        # The target is the 'Close' price (usually the first column)
        y.append(scaled_data[i, 3]) # Adjust index if 'Close' is not at 3
        
    return np.array(X), np.array(y), scaler