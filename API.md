# API

Run from `backend/` with `uvicorn app.main:app --reload`.

- `GET /api/health` reports API process health.
- `GET /api/model/status` reports whether risk model artifacts are present.
- `POST /api/inference` validates one telemetry sample and returns telemetry plus anomaly score, severity, affected parameters, quality notices, explanation, and model version.
- `POST /api/risk-assessment` accepts the manual flight and weather form and returns a model risk index only when a trained PyTorch model is installed. It returns HTTP 503 when the artifact is missing or cannot be loaded; it does not fall back to fabricated risk values.

Train artifacts from labeled, one-row-per-flight data as documented in `DEEP_LEARNING.md`. The output index is not a calibrated accident probability.

The browser never receives database credentials. Configure `DATABASE_URL` for Neon PostgreSQL in the backend environment.
