import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error

def calculate_statistical_metrics(y_true, y_pred):
    """Calculates how accurate the model is at predicting numbers."""
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    # MAPE (Mean Absolute Percentage Error)
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    
    return {
        "rmse": round(float(rmse), 4),
        "mae": round(float(mae), 4),
        "mape": round(float(mape), 2)
    }

def calculate_trading_metrics(predictions, actual_prices):
    """Calculates if the strategy would be profitable."""
    # Simple strategy: Buy if prediction > yesterday's actual price
    returns = []
    for i in range(1, len(predictions)):
        if predictions[i] > actual_prices[i-1]: # 'Buy' signal
            daily_return = (actual_prices[i] - actual_prices[i-1]) / actual_prices[i-1]
            returns.append(daily_return)
        else:
            returns.append(0) # 'Hold' cash, no return
            
    total_return = np.sum(returns) * 100
    sharpe_ratio = np.mean(returns) / np.std(returns) * np.sqrt(252) if np.std(returns) != 0 else 0
    
    return {
        "total_return_pct": round(float(total_return), 2),
        "sharpe_ratio": round(float(sharpe_ratio), 2)
    }