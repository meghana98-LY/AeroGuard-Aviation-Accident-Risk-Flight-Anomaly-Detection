"""Reproducible sequence preparation for the LSTM autoencoder.

The trainer is intentionally separate from API startup. Fit scalers on the
chronologically-earlier training flights only, then save model metadata.
"""
from pathlib import Path
import json

import numpy as np
from sklearn.preprocessing import StandardScaler

FEATURES = ["altitude", "airspeed", "vertical_speed", "pitch", "roll", "heading"]


def make_sequences(values: np.ndarray, sequence_length: int = 24) -> np.ndarray:
    if len(values) < sequence_length:
        return np.empty((0, sequence_length, values.shape[1]))
    return np.stack([values[index:index + sequence_length] for index in range(len(values) - sequence_length + 1)])


def fit_preprocessor(training_rows: np.ndarray, output_dir: str = "models/pretrained") -> dict:
    scaler = StandardScaler().fit(training_rows)
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    metadata = {"model_type": "LSTM autoencoder", "sequence_length": 24, "features": FEATURES, "split": "flight-level chronological"}
    (destination / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    np.save(destination / "scaler_mean.npy", scaler.mean_)
    np.save(destination / "scaler_scale.npy", scaler.scale_)
    return metadata
