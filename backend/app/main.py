import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.ai.engine import analyze_telemetry
from app.ai.risk_model import RiskModelUnavailable, model_status as risk_model_status, predict_risk
from app.ai.schemas import InferenceResponse, RiskAssessmentInput, RiskAssessmentResponse, Telemetry
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
settings = get_settings()
app = FastAPI(title="AeroGuard API", version="1.0.0", description="Aviation anomaly decision-support research prototype")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "online", "service": "aeroguard-api", "environment": settings.environment}


@app.get("/api/model/status")
def model_status() -> dict:
    return risk_model_status()


@app.post("/api/inference", response_model=InferenceResponse)
def inference(telemetry: Telemetry) -> InferenceResponse:
    result = analyze_telemetry(telemetry)
    logging.info("ANOMALY_ANALYZED flight_id=%s severity=%s score=%s", telemetry.flight_id, result.severity, result.anomaly_score)
    return InferenceResponse(telemetry=telemetry, analysis=result)


@app.post("/api/risk-assessment", response_model=RiskAssessmentResponse)
def risk_assessment(data: RiskAssessmentInput) -> RiskAssessmentResponse:
    try:
        return predict_risk(data)
    except RiskModelUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
