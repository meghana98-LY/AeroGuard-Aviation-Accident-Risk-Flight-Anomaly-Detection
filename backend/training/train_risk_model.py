"""Train a flight-level PyTorch risk-ranking model from labeled historical CSV rows."""
import argparse
import copy
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import accuracy_score, average_precision_score, balanced_accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from app.ai.models import RiskMLP
from app.ai.risk_model import FEATURE_ORDER, _feature_vector
from app.ai.schemas import RiskAssessmentInput


def train(csv_path: Path, output_dir: Path, epochs: int = 200, batch_size: int = 256) -> dict:
    if epochs < 1:
        raise ValueError("epochs must be at least 1.")
    if batch_size < 1:
        raise ValueError("batch_size must be at least 1.")
    torch.manual_seed(42)
    np.random.seed(42)
    frame = pd.read_csv(csv_path)
    required = set(FEATURE_ORDER[:16] + ["aircraft_type", "turbulence_level", "night_flight", "flight_id", "flight_date", "accident_label"])
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")

    frame["flight_date"] = pd.to_datetime(frame["flight_date"], errors="coerce", utc=True)
    frame["accident_label"] = pd.to_numeric(frame["accident_label"], errors="coerce")
    frame = frame.dropna(subset=list(required)).sort_values("flight_date").reset_index(drop=True)
    if frame["flight_id"].duplicated().any():
        raise ValueError("Provide exactly one labeled row per unique flight_id to keep chronological splits flight-level.")
    if not frame["accident_label"].isin([0, 1]).all():
        raise ValueError("accident_label must contain only 0 (no recorded accident) or 1 (recorded accident).")
    if len(frame) < 40:
        raise ValueError("At least 40 labeled flight rows are required for chronological train/validation/test splits.")

    vectors = []
    for row in frame.to_dict(orient="records"):
        row["flight_date"] = row["flight_date"].date()
        row["night_flight"] = str(row["night_flight"]).strip().lower() in {"true", "1", "yes"}
        validated = RiskAssessmentInput.model_validate(row)
        vectors.append(_feature_vector(validated))

    features = np.stack(vectors).astype(np.float32)
    labels = frame["accident_label"].to_numpy(dtype=np.float32)
    train_end = int(len(frame) * 0.70)
    validation_end = int(len(frame) * 0.85)
    if len(np.unique(labels[:train_end])) < 2:
        raise ValueError("The chronological training split needs both positive and negative accident labels.")

    train_values, validation_values, test_values = features[:train_end], features[train_end:validation_end], features[validation_end:]
    train_labels, validation_labels, test_labels = labels[:train_end], labels[train_end:validation_end], labels[validation_end:]
    means = train_values.mean(axis=0)
    scales = train_values.std(axis=0)
    scales[scales == 0] = 1
    train_values = (train_values - means) / scales
    validation_values = (validation_values - means) / scales
    test_values = (test_values - means) / scales

    model = RiskMLP(len(FEATURE_ORDER))
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.001)
    positives = max(float(train_labels.sum()), 1.0)
    negatives = max(float(len(train_labels) - train_labels.sum()), 1.0)
    loss_function = nn.BCEWithLogitsLoss(pos_weight=torch.tensor(negatives / positives))
    train_x = torch.tensor(train_values)
    train_y = torch.tensor(train_labels)
    validation_x = torch.tensor(validation_values)
    validation_y = torch.tensor(validation_labels)
    train_loader = DataLoader(
        TensorDataset(train_x, train_y),
        batch_size=batch_size,
        shuffle=True,
        generator=torch.Generator().manual_seed(42),
    )
    best_loss = float("inf")
    best_weights = copy.deepcopy(model.state_dict())
    patience = 0
    epochs_trained = 0

    for epoch in range(epochs):
        model.train()
        for batch_x, batch_y in train_loader:
            optimizer.zero_grad()
            loss = loss_function(model(batch_x), batch_y)
            loss.backward()
            optimizer.step()
        model.eval()
        with torch.inference_mode():
            validation_loss = float(loss_function(model(validation_x), validation_y))
        epochs_trained = epoch + 1
        if validation_loss < best_loss:
            best_loss = validation_loss
            best_weights = copy.deepcopy(model.state_dict())
            patience = 0
        else:
            patience += 1
            if patience >= 22:
                break

    model.load_state_dict(best_weights)
    model.eval()
    with torch.inference_mode():
        validation_scores = torch.sigmoid(model(validation_x)).numpy()
        validation_logits = model(validation_x)
        test_x = torch.tensor(test_values)
        test_logits = model(test_x)
        scores = torch.sigmoid(test_logits).numpy()
        test_loss = float(loss_function(test_logits, torch.tensor(test_labels)))
    thresholds = np.linspace(0.1, 0.9, 161)
    validation_threshold_scores = [
        f1_score(validation_labels.astype(int), validation_scores >= threshold, zero_division=0)
        for threshold in thresholds
    ]
    decision_threshold = float(thresholds[int(np.argmax(validation_threshold_scores))])
    predictions = (scores >= decision_threshold).astype(int)
    validation_predictions = (validation_scores >= decision_threshold).astype(int)
    test_binary = test_labels.astype(int)
    validation_binary = validation_labels.astype(int)
    matrix = confusion_matrix(test_binary, predictions, labels=[0, 1])
    true_negative, false_positive, false_negative, true_positive = matrix.ravel()
    metrics = {
        "roc_auc": float(roc_auc_score(test_binary, scores)) if len(np.unique(test_binary)) == 2 else None,
        "pr_auc": float(average_precision_score(test_binary, scores)) if len(test_binary) else None,
        "accuracy": float(accuracy_score(test_binary, predictions)) if len(test_binary) else None,
        "balanced_accuracy": float(balanced_accuracy_score(test_binary, predictions)) if len(test_binary) else None,
        "precision": float(precision_score(test_binary, predictions, zero_division=0)) if len(test_binary) else None,
        "recall": float(recall_score(test_binary, predictions, zero_division=0)) if len(test_binary) else None,
        "f1": float(f1_score(test_binary, predictions, zero_division=0)) if len(test_binary) else None,
        "specificity": float(true_negative / max(true_negative + false_positive, 1)),
        "false_positive_rate": float(false_positive / max(true_negative + false_positive, 1)),
        "false_negative_rate": float(false_negative / max(false_negative + true_positive, 1)),
        "decision_threshold_selected_on_validation": decision_threshold,
        "confusion_matrix": matrix.tolist() if len(test_binary) else [[0, 0], [0, 0]],
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "input_size": len(FEATURE_ORDER),
            "architecture": "RiskMLP",
        },
        output_dir / "risk_classifier.pkl",
    )
    synthetic_training = "data_origin" in frame.columns and frame["data_origin"].astype(str).str.contains("synthetic", case=False).all()
    metadata = {
        "model_type": "PyTorch tabular MLP classifier (96-48-1)",
        "version": "synthetic-demo-risk-mlp-v3" if synthetic_training else "risk-mlp-v1",
        "training_data": "synthetic demonstration data" if synthetic_training else "labeled historical flight data",
        "is_synthetic": bool(synthetic_training),
        "target": "synthetic demonstration label ranking; not a calibrated probability" if synthetic_training else "recorded accident label ranking; not a calibrated probability",
        "training_configuration": {
            "epochs_requested": epochs,
            "epochs_trained": epochs_trained,
            "batch_size": batch_size,
            "optimizer": "AdamW",
            "learning_rate": 0.001,
            "weight_decay": 0.001,
            "loss_function": "weighted binary cross-entropy with logits",
            "early_stopping": "validation loss patience 22",
            "seed": 42,
        },
        "feature_order": FEATURE_ORDER,
        "scaler_mean": means.tolist(),
        "scaler_scale": scales.tolist(),
        "split_strategy": "chronological flight-level split: 70% train, 15% validation, 15% test; scaler fit on train only",
        "samples": {"total": len(frame), "train": len(train_labels), "validation": len(validation_labels), "test": len(test_labels)},
        "validation_metrics": {
            "loss": best_loss,
            "accuracy": float(accuracy_score(validation_binary, validation_predictions)),
            "roc_auc": float(roc_auc_score(validation_binary, validation_scores)),
            "pr_auc": float(average_precision_score(validation_binary, validation_scores)),
            "precision": float(precision_score(validation_binary, validation_predictions, zero_division=0)),
            "recall": float(recall_score(validation_binary, validation_predictions, zero_division=0)),
            "f1": float(f1_score(validation_binary, validation_predictions, zero_division=0)),
            "decision_threshold": decision_threshold,
        },
        "test_loss": test_loss,
        "metrics": metrics,
    }
    (output_dir / "risk_classifier_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, required=True, help="One labeled historical record per flight.")
    parser.add_argument("--output-dir", type=Path, default=Path("models"))
    parser.add_argument("--epochs", type=int, default=200)
    parser.add_argument("--batch-size", type=int, default=256)
    arguments = parser.parse_args()
    print(json.dumps(train(arguments.csv, arguments.output_dir, arguments.epochs, arguments.batch_size), indent=2))