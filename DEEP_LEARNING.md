# Deep Learning Methodology

## Manual Flight-Risk Assessment

The manual form uses a supervised PyTorch multilayer perceptron (MLP) for flight-level risk ranking. A single flight record is tabular rather than a telemetry sequence, so an MLP is the appropriate starting point; an LSTM is not justified by a single form submission.

Numeric model inputs are aircraft age, engine health, runway length, altitude, airspeed, fuel, duration, visibility, temperature, dew point, humidity, precipitation, wind speed, wind gust, crosswind, and air pressure. Aircraft type and turbulence are one-hot encoded; night flight is binary. Flight number, route, airport, and date are captured for context, but are not classifier inputs.

Train from a curated CSV containing one labeled row per flight and `accident_label` (0 or 1). The script requires a unique `flight_id`, sorts chronologically by `flight_date`, splits 70/15/15 into train/validation/test, and fits normalization statistics on training data only. It saves a TorchScript model and metadata with test ROC-AUC, PR-AUC, precision, recall, F1, and confusion matrix. Risk output is an uncalibrated model index, not an accident probability.

The included runnable demonstration model is trained on 30,000 generated synthetic records (`backend/data/raw/synthetic_demo_flights.csv`, recreated with `python -m training.generate_synthetic_demo`). The generator samples phase-shaped altitude and airspeed profiles and assigns labels from an illustrative heuristic with small random noise. The model's current chronological 70/15/15 holdout results are ROC-AUC 0.980, PR-AUC 0.927, accuracy 0.939, balanced accuracy 0.883, precision 0.867, recall 0.795, F1 0.829, specificity 0.972, false-positive rate 0.028, and false-negative rate 0.205 (validation-selected threshold 0.815). These figures measure recovery of the generated heuristic only. They are not evidence about aviation accident risk and must not be used for operations. The generated CSV is ignored by Git; the generator script, model artifact, and metadata are retained. Replace the demo model with a model trained on valid labeled data before interpreting predictions.

## Telemetry Anomaly Demonstration

The separate live telemetry demo currently uses configurable parameter rules. It does not load or run an LSTM autoencoder; the sequence helper in `backend/app/ai/training.py` is preprocessing groundwork only. Do not present its demo output as a trained deep-learning prediction.
