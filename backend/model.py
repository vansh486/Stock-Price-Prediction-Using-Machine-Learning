import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.layers import Dense, Dropout, Input, LSTM
from tensorflow.keras.models import Sequential


TARGET_COLUMN = "Close"


def create_lstm_model(input_shape):
    """
    Build a stacked LSTM model for next-close regression.
    """
    model = Sequential(
        [
            Input(shape=input_shape),
            LSTM(units=50, return_sequences=True),
            Dropout(0.2),
            LSTM(units=50, return_sequences=False),
            Dropout(0.2),
            Dense(units=25),
            Dense(units=1),
        ]
    )
    model.compile(optimizer="adam", loss="mean_squared_error")
    return model


def prepare_data(df, look_back=60, target_column=TARGET_COLUMN):
    """
    Normalize the feature frame and construct sliding windows.
    """
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' is missing from the training frame.")

    feature_columns = list(df.columns)
    target_index = feature_columns.index(target_column)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(df[feature_columns])

    if len(scaled_data) <= look_back:
        raise ValueError(
            f"Not enough rows to build sequences. Need more than {look_back} rows after indicator generation."
        )

    X, y = [], []
    for index in range(look_back, len(scaled_data)):
        X.append(scaled_data[index - look_back : index])
        y.append(scaled_data[index, target_index])

    return np.array(X), np.array(y), scaler, feature_columns, target_index


def prepare_inference_window(df, scaler, feature_columns, look_back=60):
    missing_columns = [column for column in feature_columns if column not in df.columns]
    if missing_columns:
        raise ValueError(
            f"Inference data is missing trained feature columns: {', '.join(missing_columns)}."
        )

    ordered_frame = df[feature_columns]
    if len(ordered_frame) < look_back:
        raise ValueError(f"Need at least {look_back} rows to prepare the inference window.")

    scaled_data = scaler.transform(ordered_frame)
    return scaled_data[-look_back:].reshape(1, look_back, len(feature_columns))


def inverse_transform_target(scaler, scaled_values, feature_columns, target_index=None):
    if target_index is None:
        if TARGET_COLUMN not in feature_columns:
            raise ValueError(f"Target column '{TARGET_COLUMN}' is missing from feature metadata.")
        target_index = feature_columns.index(TARGET_COLUMN)

    scaled_values = np.asarray(scaled_values).reshape(-1)
    dummy = np.zeros((len(scaled_values), len(feature_columns)))
    dummy[:, target_index] = scaled_values
    return scaler.inverse_transform(dummy)[:, target_index]


def build_signal(current_price, predicted_price, min_threshold_pct=0.5):
    if current_price <= 0:
        return "HOLD", 0.0

    predicted_change_pct = ((predicted_price - current_price) / current_price) * 100
    if predicted_change_pct > min_threshold_pct:
        return "BUY", predicted_change_pct
    if predicted_change_pct < -min_threshold_pct:
        return "SELL", predicted_change_pct
    return "HOLD", predicted_change_pct
