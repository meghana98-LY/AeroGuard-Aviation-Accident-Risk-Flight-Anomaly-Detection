import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.ai.schemas import RiskAssessmentInput, RiskAssessmentResponse, RiskFactor
from app.core.config import get_settings

NUMERIC_FEATURES = [
    "aircraft_age_years", "engine_health_percent", "runway_length_m", "altitude_ft",
    "airspeed_kt", "fuel_level_percent", "flight_duration_hours", "visibility_km",
    "temperature_c", "dew_point_c", "humidity_percent", "precipitation_mm_hr",
    "wind_speed_kt", "wind_gust_kt", "crosswind_kt", "air_pressure_hpa",
]
AIRCRAFT_TYPES = ["A220", "A320", "A330", "A350", "B737", "B747", "B777", "B787", "Other"]
TURBULENCE_LEVELS = ["NONE", "LIGHT", "MODERATE", "SEVERE"]
FEATURE_ORDER = NUMERIC_FEATURES + [f"aircraft_type_{value}" for value in AIRCRAFT_TYPES] + [
    f"turbulence_{value}" for value in TURBULENCE_LEVELS
] + ["night_flight"]


class RiskModelUnavailable(RuntimeError):
    pass


def _model_paths() -> tuple[Path, Path]:
    settings = get_settings()
    return Path(settings.risk_model_path), Path(settings.risk_model_metadata_path)


def _feature_vector(data: RiskAssessmentInput) -> np.ndarray:
    values = [float(getattr(data, key)) for key in NUMERIC_FEATURES]
    values.extend(float(data.aircraft_type == option) for option in AIRCRAFT_TYPES)
    values.extend(float(data.turbulence_level == option) for option in TURBULENCE_LEVELS)
    values.append(float(data.night_flight))
    return np.asarray(values, dtype=np.float32)


@lru_cache(maxsize=1)
def _load_artifacts():
    model_path, metadata_path = _model_paths()
    if not model_path.is_file() or not metadata_path.is_file():
        raise RiskModelUnavailable(
            "No trained deep-learning risk model is installed. Train one with labeled historical flight data before requesting a risk estimate."
        )

    try:
        import torch

        with metadata_path.open(encoding="utf-8") as metadata_file:
            metadata = json.load(metadata_file)
        if metadata.get("feature_order") != FEATURE_ORDER:
            raise RiskModelUnavailable("The installed risk model feature definition does not match this API version.")
        means = np.asarray(metadata["scaler_mean"], dtype=np.float32)
        scales = np.asarray(metadata["scaler_scale"], dtype=np.float32)
        if len(means) != len(FEATURE_ORDER) or len(scales) != len(FEATURE_ORDER):
            raise RiskModelUnavailable("The installed risk model scaler metadata is invalid.")
        model = torch.jit.load(str(model_path), map_location="cpu")
        model.eval()
        return torch, model, metadata, means, scales
    except RiskModelUnavailable:
        raise
    except Exception as error:
        raise RiskModelUnavailable("The trained risk model could not be loaded.") from error


def model_status() -> dict:
    model_path, metadata_path = _model_paths()
    if not model_path.is_file() or not metadata_path.is_file():
        return {"status": "unavailable", "model": "supervised PyTorch MLP", "version": None}
    try:
        with metadata_path.open(encoding="utf-8") as metadata_file:
            metadata = json.load(metadata_file)
        return {
            "status": "available",
            "model": metadata.get("model_type", "supervised PyTorch MLP"),
            "version": metadata.get("version"),
            "training_data": metadata.get("training_data", "unspecified"),
            "is_synthetic": metadata.get("is_synthetic", False),
        }
    except (OSError, json.JSONDecodeError):
        return {"status": "error", "model": "supervised PyTorch MLP", "version": None}


def predict_risk(data: RiskAssessmentInput) -> RiskAssessmentResponse:
    torch, model, metadata, means, scales = _load_artifacts()
    vector = _feature_vector(data)
    normalized = (vector - means) / np.where(scales == 0, 1, scales)

    def model_output(values: np.ndarray) -> float:
        with torch.inference_mode():
            logit = model(torch.from_numpy(values.reshape(1, -1))).reshape(-1)[0]
            return float(logit.item())

    output = model_output(normalized)
    with torch.inference_mode():
        score = float(torch.sigmoid(torch.tensor(output)).item() * 100)
    feature_labels = {
        "aircraft_age_years": ("Aircraft age", f"{data.aircraft_age_years:g} years"),
        "engine_health_percent": ("Engine health", f"{data.engine_health_percent:g}%"),
        "runway_length_m": ("Runway length", f"{data.runway_length_m:g} m"),
        "altitude_ft": ("Altitude", f"{data.altitude_ft:g} ft"),
        "airspeed_kt": ("Airspeed", f"{data.airspeed_kt:g} kt"),
        "fuel_level_percent": ("Fuel level", f"{data.fuel_level_percent:g}%"),
        "flight_duration_hours": ("Flight duration", f"{data.flight_duration_hours:g} hours"),
        "visibility_km": ("Visibility", f"{data.visibility_km:g} km"),
        "temperature_c": ("Temperature", f"{data.temperature_c:g} C"),
        "dew_point_c": ("Dew point", f"{data.dew_point_c:g} C"),
        "humidity_percent": ("Humidity", f"{data.humidity_percent:g}%"),
        "precipitation_mm_hr": ("Precipitation", f"{data.precipitation_mm_hr:g} mm/hr"),
        "wind_speed_kt": ("Wind speed", f"{data.wind_speed_kt:g} kt"),
        "wind_gust_kt": ("Wind gust", f"{data.wind_gust_kt:g} kt"),
        "crosswind_kt": ("Crosswind", f"{data.crosswind_kt:g} kt"),
        "air_pressure_hpa": ("Air pressure", f"{data.air_pressure_hpa:g} hPa"),
        "night_flight": ("Night flight", "Yes" if data.night_flight else "No"),
    }
    for aircraft_type in AIRCRAFT_TYPES:
        feature_labels[f"aircraft_type_{aircraft_type}"] = ("Aircraft type", data.aircraft_type)
    for turbulence in TURBULENCE_LEVELS:
        feature_labels[f"turbulence_{turbulence}"] = ("Turbulence", data.turbulence_level)

    effects = []
    for index, feature_name in enumerate(FEATURE_ORDER):
        if feature_name.startswith("aircraft_type_") and feature_name != f"aircraft_type_{data.aircraft_type}":
            continue
        if feature_name.startswith("turbulence_") and feature_name != f"turbulence_{data.turbulence_level}":
            continue
        baseline = normalized.copy()
        baseline[index] = 0
        effect = output - model_output(baseline)
        if abs(effect) >= 0.02 and feature_name in feature_labels:
            label, observed = feature_labels[feature_name]
            effects.append((abs(effect), RiskFactor(
                parameter=label,
                observed_value=observed,
                direction="elevates" if effect > 0 else "reduces",
            )))
    factors = [factor for _, factor in sorted(effects, key=lambda item: item[0], reverse=True)[:6]]

    if score >= 81:
        band = "CRITICAL"
    elif score >= 61:
        band = "HIGH"
    elif score >= 41:
        band = "MODERATE"
    elif score >= 21:
        band = "LOW"
    else:
        band = "NORMAL"

    return RiskAssessmentResponse(
        risk_score=round(score, 1),
        risk_band=band,
        model_version=metadata["version"],
        training_data=metadata.get("training_data", "unspecified training data"),
        is_synthetic=bool(metadata.get("is_synthetic", False)),
        factors=factors,
        explanation=(
            "Potential contributing inputs are ranked by how the model score changes when each input is reset to its training-set average. This is model sensitivity, not causation. The classifier was trained on generated synthetic patterns and does not represent actual aviation accident risk."
            if metadata.get("is_synthetic", False)
            else "The trained classifier ranked this input pattern against labeled historical training examples. This score is not a calibrated accident probability."
        ),
        disclaimer=(
            "Synthetic demonstration only. It is not evidence-based, not calibrated, and must not be used for flight operations."
            if metadata.get("is_synthetic", False)
            else "Research decision-support index; not a calibrated accident probability or operational safety determination."
        ),
    )