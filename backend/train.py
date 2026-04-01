import logging

from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

try:
    from .artifacts import normalize_ticker, save_model_artifacts
    from .market_data import fetch_feature_frame
    from .metrics import calculate_statistical_metrics, calculate_trading_metrics
    from .model import create_lstm_model, inverse_transform_target, prepare_data
    from .settings import settings
except ImportError:
    from artifacts import normalize_ticker, save_model_artifacts
    from market_data import fetch_feature_frame
    from metrics import calculate_statistical_metrics, calculate_trading_metrics
    from model import create_lstm_model, inverse_transform_target, prepare_data
    from settings import settings


logger = logging.getLogger(__name__)


def train_stock_model(ticker_symbol="RELIANCE.NS"):
    ticker = normalize_ticker(ticker_symbol)
    logger.info("Starting training for %s", ticker)

    df_enriched = fetch_feature_frame(ticker, settings.train_period)
    X, y, scaler, feature_columns, target_index = prepare_data(
        df_enriched,
        look_back=settings.look_back_window,
    )

    if len(X) < 10:
        raise ValueError(f"Not enough samples to train a model for {ticker}.")

    split_index = int(len(X) * 0.8)
    split_index = max(1, min(split_index, len(X) - 1))
    X_train, X_test = X[:split_index], X[split_index:]
    y_train, y_test = y[:split_index], y[split_index:]

    model = create_lstm_model((X_train.shape[1], X_train.shape[2]))
    callbacks = [
        EarlyStopping(
            monitor="val_loss",
            patience=settings.early_stopping_patience,
            restore_best_weights=True,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=max(1, settings.early_stopping_patience - 1),
            min_lr=1e-5,
        ),
    ]

    logger.info("Training LSTM for %s", ticker)
    history = model.fit(
        X_train,
        y_train,
        batch_size=settings.training_batch_size,
        epochs=settings.training_epochs,
        validation_data=(X_test, y_test),
        callbacks=callbacks,
        verbose=0,
    )

    predicted_scaled = model.predict(X_test, verbose=0).reshape(-1)
    predicted_prices = inverse_transform_target(
        scaler,
        predicted_scaled,
        feature_columns,
        target_index=target_index,
    )
    actual_prices = inverse_transform_target(
        scaler,
        y_test,
        feature_columns,
        target_index=target_index,
    )

    metrics = {
        **calculate_statistical_metrics(actual_prices, predicted_prices),
        **calculate_trading_metrics(predicted_prices, actual_prices),
        "final_train_loss": round(float(history.history["loss"][-1]), 6),
        "final_val_loss": round(float(history.history["val_loss"][-1]), 6),
        "epochs_ran": len(history.history["loss"]),
    }

    artifact_summary = save_model_artifacts(
        ticker=ticker,
        model=model,
        scaler=scaler,
        feature_columns=feature_columns,
        metrics=metrics,
        look_back_window=settings.look_back_window,
        training_period=settings.train_period,
        row_count=len(df_enriched),
    )
    logger.info("Training complete for %s. Saved model to %s", ticker, artifact_summary["model_path"])
    return {
        "ticker": ticker,
        "model_path": str(artifact_summary["model_path"]),
        "metrics": metrics,
        "trained_at": artifact_summary["metadata"]["trained_at"],
    }

if __name__ == "__main__":
    train_stock_model()
