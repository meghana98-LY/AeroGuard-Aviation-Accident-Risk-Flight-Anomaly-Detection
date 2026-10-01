from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class Telemetry(BaseModel):
    flight_id: str = Field(min_length=1, max_length=64)
    aircraft_id: str = Field(min_length=1, max_length=64)
    timestamp: datetime
    altitude: float = Field(ge=-1000, le=60000)
    airspeed: float = Field(ge=0, le=800)
    vertical_speed: float = Field(ge=-10000, le=10000)
    pitch: float = Field(ge=-90, le=90)
    roll: float = Field(ge=-180, le=180)
    heading: float = Field(ge=0, le=360)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    flight_phase: Literal["TAXI", "TAKEOFF", "CLIMB", "CRUISE", "DESCENT", "APPROACH", "LANDING"]


class AnomalyResult(BaseModel):
    anomaly_score: float = Field(ge=0, le=100)
    severity: Literal["NORMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"]
    affected_parameters: list[str]
    model_version: str
    explanation: str
    data_quality: list[str]
    is_simulated: bool = True


class InferenceResponse(BaseModel):
    telemetry: Telemetry
    analysis: AnomalyResult


class RiskAssessmentInput(BaseModel):
    flight_number: str | None = Field(default=None, max_length=32)
    flight_date: date | None = None
    route: str | None = Field(default=None, max_length=100)
    airport: str | None = Field(default=None, max_length=8)
    aircraft_type: Literal["A220", "A320", "A330", "A350", "B737", "B747", "B777", "B787", "Other"]
    aircraft_age_years: float = Field(ge=0, le=80)
    engine_health_percent: float = Field(ge=0, le=100)
    runway_length_m: float = Field(ge=300, le=7000)
    altitude_ft: float = Field(ge=-1000, le=60000)
    airspeed_kt: float = Field(ge=0, le=800)
    fuel_level_percent: float = Field(ge=0, le=100)
    flight_duration_hours: float = Field(gt=0, le=30)
    turbulence_level: Literal["NONE", "LIGHT", "MODERATE", "SEVERE"]
    visibility_km: float = Field(ge=0, le=100)
    temperature_c: float = Field(ge=-100, le=70)
    dew_point_c: float = Field(ge=-100, le=70)
    humidity_percent: float = Field(ge=0, le=100)
    precipitation_mm_hr: float = Field(ge=0, le=1000)
    wind_speed_kt: float = Field(ge=0, le=300)
    wind_gust_kt: float = Field(ge=0, le=350)
    crosswind_kt: float = Field(ge=0, le=150)
    air_pressure_hpa: float = Field(ge=800, le=1100)
    night_flight: bool


class RiskAssessmentResponse(BaseModel):
    risk_score: float = Field(ge=0, le=100)
    risk_band: Literal["NORMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"]
    model_version: str
    training_data: str
    is_synthetic: bool
    factors: list["RiskFactor"]
    explanation: str
    disclaimer: str = "Demonstration output only; not an accident probability or operational safety determination."


class RiskFactor(BaseModel):
    parameter: str
    observed_value: str
    direction: Literal["elevates", "reduces"]
