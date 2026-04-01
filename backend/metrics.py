import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error


def calculate_statistical_metrics(y_true, y_pred):
    """Calculates how accurate the model is at predicting numbers."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    safe_denominator = np.where(np.abs(y_true) < 1e-8, np.nan, np.abs(y_true))
    absolute_pct_error = np.abs((y_true - y_pred) / safe_denominator)
    mape = 0.0 if np.all(np.isnan(absolute_pct_error)) else np.nanmean(absolute_pct_error) * 100

    return {
        "rmse": round(float(rmse), 4),
        "mae": round(float(mae), 4),
        "mape": round(float(mape), 2),
    }


def calculate_trading_metrics(predictions, actual_prices):
    """Calculates if the strategy would be profitable."""
    predictions = np.asarray(predictions, dtype=float)
    actual_prices = np.asarray(actual_prices, dtype=float)

    if len(predictions) < 2 or len(actual_prices) < 2:
        return {
            "total_return_pct": 0.0,
            "sharpe_ratio": 0.0,
            "directional_accuracy": 0.0,
        }

    previous_prices = actual_prices[:-1]
    actual_returns = np.divide(
        actual_prices[1:] - previous_prices,
        previous_prices,
        out=np.zeros_like(previous_prices, dtype=float),
        where=previous_prices != 0,
    )
    predicted_direction = np.sign(predictions[1:] - previous_prices)
    actual_direction = np.sign(actual_prices[1:] - previous_prices)
    strategy_returns = np.where(
        predicted_direction > 0,
        actual_returns,
        np.where(predicted_direction < 0, -actual_returns, 0.0),
    )

    total_return = (np.prod(1 + strategy_returns) - 1) * 100
    volatility = np.std(strategy_returns)
    sharpe_ratio = (
        np.mean(strategy_returns) / volatility * np.sqrt(252)
        if volatility > 1e-12
        else 0.0
    )
    directional_accuracy = np.mean(predicted_direction == actual_direction) * 100

    return {
        "total_return_pct": round(float(total_return), 2),
        "sharpe_ratio": round(float(sharpe_ratio), 2),
        "directional_accuracy": round(float(directional_accuracy), 2),
    }
