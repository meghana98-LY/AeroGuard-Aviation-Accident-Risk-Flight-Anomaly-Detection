# AeroGuard Architecture

AeroGuard is an AI-assisted aviation anomaly detection and decision-support research prototype. The browser uses React, React Three Fiber, and Drei. It posts validated simulated telemetry to FastAPI; FastAPI owns inference, rule validation, and future persistence to Neon PostgreSQL.

```text
Simulated or historical telemetry -> Pydantic validation -> sequence preprocessing -> LSTM autoencoder scorer -> configurable rule checks -> severity/alert -> PostgreSQL -> React/3D digital twin
```

API startup does not train a model. Training utilities are isolated in `backend/app/ai/training.py`, with chronological flight-level splitting and train-only scaler fitting. The current demonstration engine uses the same response contract and a deterministic rule fallback until a trained artifact is supplied.

The system is not certified, regulator-approved, or suitable as the sole basis for operational decisions.
