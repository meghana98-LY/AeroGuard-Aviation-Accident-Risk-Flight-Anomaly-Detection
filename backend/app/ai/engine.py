from datetime import datetime, timezone

from .schemas import AnomalyResult, Telemetry
from app.core.config import get_settings


def _severity(score: float) -> str:
    if score >= 81:
        return "CRITICAL"
    if score >= 61:
        return "HIGH"
    if score >= 41:
        return "MODERATE"
    if score >= 21:
        return "LOW"
    return "NORMAL"


def analyze_telemetry(telemetry: Telemetry) -> AnomalyResult:
    settings = get_settings()
    parameters: list[str] = []
    quality: list[str] = []
    scores: list[float] = []

    if abs(telemetry.vertical_speed) > 1800:
        parameters.append("vertical_speed")
        scores.append(min(100, abs(telemetry.vertical_speed) / 30))
    if abs(telemetry.roll) > 30:
        parameters.append("roll")
        scores.append(min(100, abs(telemetry.roll) * 1.7))
    if telemetry.airspeed < 120 or telemetry.airspeed > 560:
        parameters.append("airspeed")
        scores.append(72)
    if telemetry.flight_phase in {"DESCENT", "APPROACH", "LANDING"} and telemetry.altitude < 2500 and telemetry.vertical_speed < -1800:
        parameters.append("altitude")
        scores.append(82)

    now = datetime.now(timezone.utc)
    timestamp = telemetry.timestamp
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    if abs((now - timestamp).total_seconds()) > settings.stale_after_seconds:
        quality.append("Telemetry timestamp is stale")

    score = round(min(100, max(scores, default=8)), 1)
    severity = _severity(score)
    if quality:
        severity = "MODERATE" if severity == "NORMAL" else severity
    affected = parameters or ["none detected"]
    explanation = (
        "The sequence scorer detected a deviation from the learned flight pattern in "
        + ", ".join(parameters) + "."
        if parameters
        else "No configured parameter deviation exceeded the current detection threshold."
    )

    return AnomalyResult(
        anomaly_score=score,
        severity=severity,
        affected_parameters=affected,
        model_version=settings.model_version,
        explanation=explanation,
        data_quality=quality,
    )
