import numpy as np
import pytest
from fastapi import HTTPException

from app.ai.engine import analyze_telemetry
from app.ai.schemas import Telemetry
from app.ai.training import make_sequences
from app.ai.risk_model import FEATURE_ORDER, RiskModelUnavailable, _feature_vector
from app.ai.schemas import RiskAssessmentInput
from app.main import risk_assessment
from app.ai import risk_model


def test_sequence_generation_preserves_temporal_windows():
    values = np.arange(30).reshape(10, 3)
    sequences = make_sequences(values, sequence_length=4)
    assert sequences.shape == (7, 4, 3)
    assert np.array_equal(sequences[0, 0], values[0])
    assert np.array_equal(sequences[-1, -1], values[-1])


def test_rule_validation_escalates_abnormal_descent():
    telemetry = Telemetry(flight_id="F-1", aircraft_id="AC-1", timestamp="2026-09-22T12:00:00Z", altitude=1800, airspeed=240, vertical_speed=-2400, pitch=-5, roll=4, heading=180, latitude=40, longitude=-73, flight_phase="APPROACH")
    result = analyze_telemetry(telemetry)
    assert result.anomaly_score >= 80
    assert result.severity in {"HIGH", "CRITICAL"}
    assert "vertical_speed" in result.affected_parameters


def test_risk_assessment_schema_and_feature_vector():
    assessment = RiskAssessmentInput(
        aircraft_type="A320", aircraft_age_years=12.5, engine_health_percent=92,
        runway_length_m=3050, altitude_ft=35000, airspeed_kt=250,
        fuel_level_percent=85, flight_duration_hours=8.5, turbulence_level="LIGHT",
        visibility_km=10, temperature_c=18, dew_point_c=12, humidity_percent=68,
        precipitation_mm_hr=0, wind_speed_kt=12, wind_gust_kt=18, crosswind_kt=8,
        air_pressure_hpa=1013, night_flight=False,
    )
    vector = _feature_vector(assessment)
    assert vector.shape == (len(FEATURE_ORDER),)
    assert vector.dtype == np.float32


def test_risk_model_fails_closed_when_artifact_is_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(
        risk_model,
        "_model_paths",
        lambda: (tmp_path / "missing.pt", tmp_path / "missing.json"),
    )
    risk_model._load_artifacts.cache_clear()
    try:
        risk_model._load_artifacts()
    except RiskModelUnavailable as error:
        assert "No trained deep-learning risk model" in str(error)
    else:
        raise AssertionError("A risk estimate must not be created without trained model artifacts.")
    finally:
        risk_model._load_artifacts.cache_clear()


def test_risk_assessment_endpoint_returns_503_without_artifacts(tmp_path, monkeypatch):
    monkeypatch.setattr(
        risk_model,
        "_model_paths",
        lambda: (tmp_path / "missing.pt", tmp_path / "missing.json"),
    )
    risk_model._load_artifacts.cache_clear()
    assessment = RiskAssessmentInput(
        aircraft_type="A320", aircraft_age_years=12.5, engine_health_percent=92,
        runway_length_m=3050, altitude_ft=35000, airspeed_kt=250,
        fuel_level_percent=85, flight_duration_hours=8.5, turbulence_level="LIGHT",
        visibility_km=10, temperature_c=18, dew_point_c=12, humidity_percent=68,
        precipitation_mm_hr=0, wind_speed_kt=12, wind_gust_kt=18, crosswind_kt=8,
        air_pressure_hpa=1013, night_flight=False,
    )
    with pytest.raises(HTTPException) as error:
        risk_assessment(assessment)
    assert error.value.status_code == 503
    risk_model._load_artifacts.cache_clear()


def test_trained_demo_model_returns_synthetic_provenance():
    assessment = RiskAssessmentInput(
        aircraft_type="A320", aircraft_age_years=12.5, engine_health_percent=92,
        runway_length_m=3050, altitude_ft=35000, airspeed_kt=250,
        fuel_level_percent=85, flight_duration_hours=8.5, turbulence_level="LIGHT",
        visibility_km=10, temperature_c=18, dew_point_c=12, humidity_percent=68,
        precipitation_mm_hr=0, wind_speed_kt=12, wind_gust_kt=18, crosswind_kt=8,
        air_pressure_hpa=1013, night_flight=False,
    )
    result = risk_model.predict_risk(assessment)
    assert 0 <= result.risk_score <= 100
    assert result.is_synthetic is True
    assert result.training_data == "synthetic demonstration data"
    assert "does not represent actual aviation accident risk" in result.explanation
    assert "not causation" in result.explanation
    assert result.factors

    adverse_assessment = RiskAssessmentInput(**{
        **assessment.model_dump(),
        "aircraft_type": "B747",
        "aircraft_age_years": 35,
        "engine_health_percent": 65,
        "runway_length_m": 1000,
        "altitude_ft": 500,
        "airspeed_kt": 600,
        "fuel_level_percent": 8,
        "flight_duration_hours": 14,
        "turbulence_level": "SEVERE",
        "visibility_km": 0.5,
        "temperature_c": 2,
        "dew_point_c": 1,
        "humidity_percent": 100,
        "precipitation_mm_hr": 20,
        "wind_speed_kt": 80,
        "wind_gust_kt": 120,
        "crosswind_kt": 50,
        "air_pressure_hpa": 980,
        "night_flight": True,
    })
    adverse_result = risk_model.predict_risk(adverse_assessment)
    assert adverse_result.risk_band == "CRITICAL"
    assert adverse_result.factors
    assert any(factor.direction == "elevates" for factor in adverse_result.factors)
