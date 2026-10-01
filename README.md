# AeroGuard

**AeroGuard is an AI-assisted aviation anomaly and risk-assessment research prototype.** It combines a React/Three.js aircraft and cockpit experience, a manual flight-and-weather assessment form, and a FastAPI backend with a PyTorch demonstration classifier.

> **Safety notice:** The currently installed risk model was trained on synthetic data and predicts patterns from an illustrative generated rule. Its scores and metrics are for software demonstration only. They do not estimate real accident probability and must not be used for flight, maintenance, dispatch, air-traffic-control, or emergency decisions. AeroGuard is not certified or approved for aviation operations.

## Project Status

| Area                    | Current implementation                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Aircraft visualization  | React Three Fiber scene with the GLB aircraft asset and a cockpit view                    |
| Cockpit                 | Procedural 3D cockpit, windshield, overhead panel, seats, and flight monitor              |
| Manual assessment       | Responsive form for flight, airframe, flight, and weather inputs                          |
| Manual assessment model | Supervised PyTorch tabular MLP, currently trained on generated synthetic labels           |
| Telemetry endpoint      | Pydantic validation and parameter-rule anomaly demo; not a trained sequence model         |
| Persistence             | PostgreSQL schema is provided, but the API does not currently persist requests or results |
| Authentication          | Not implemented; do not expose this development API publicly                              |

## Features

- Interactive exterior aircraft; click the cockpit area to enter the flight deck.
- Cockpit-style instrument display with live demo telemetry, weather, flight context, model status, and anomaly information.
- Manual assessment form for flight number/date, route, airport, aircraft type/age, engine-health entry, runway length, altitude, airspeed, fuel, duration, turbulence, weather, and night-flight status.
- API-side input validation and a synthetic-model assessment response with risk band, score index, version, provenance, and input-sensitivity factors.
- Factor explanations indicate whether the model output rises or falls when a feature is compared with its training-set baseline. They are model sensitivities, not causal explanations.
- Generated, reproducible demo dataset and offline training script.

## Architecture

```text
React + Vite
  ├── Three.js / React Three Fiber aircraft and cockpit
  └── Manual flight-risk form
          │ HTTP JSON
          ▼
FastAPI
  ├── POST /api/risk-assessment → PyTorch tabular MLP artifact
  └── POST /api/inference       → validated telemetry + parameter rules
          │
          └── Optional PostgreSQL schema is supplied, but runtime persistence is not connected
```

## Deep-Learning Model

The manual assessment uses a **supervised feed-forward multilayer perceptron (MLP)**. It is tabular, one-flight-at-a-time input, so this implementation does not use an LSTM, GRU, or transformer.

The model input contains 16 numeric fields, one-hot encoded aircraft type and turbulence category, and a binary night-flight field. Flight number, flight date, route, and airport are accepted for context but are not classifier inputs. The output is transformed to a 0–100 index and assigned a descriptive band. It is not a calibrated probability.

The included demo training data has **30,000 generated records**. Its labels come from an illustrative heuristic with random noise; therefore its metrics only measure how well the MLP recovers that generated heuristic. Current chronological held-out synthetic metrics are:

| Metric              | Value |
| ------------------- | ----: |
| ROC-AUC             | 0.980 |
| PR-AUC              | 0.927 |
| Accuracy            | 0.939 |
| Balanced accuracy   | 0.883 |
| Precision           | 0.867 |
| Recall              | 0.795 |
| F1                  | 0.829 |
| Specificity         | 0.972 |
| False-positive rate | 0.028 |
| False-negative rate | 0.205 |

The classification threshold shown in model metadata was selected on the validation split; test metrics were calculated on the later chronological test split. These numbers are **not measures of aviation safety or real accident prediction**. See [DEEP_LEARNING.md](DEEP_LEARNING.md) for feature, split, and interpretation details.

### Regenerate and train the demonstration model

Run from `backend/` with the backend environment installed:

```powershell
python -m training.generate_synthetic_demo --output data/raw/synthetic_demo_flights.csv --rows 30000
python -m training.train_risk_model --csv data/raw/synthetic_demo_flights.csv --output-dir models --epochs 200
```

The generator is seeded by default, so the CSV can be recreated. The CSV is ignored by Git; the generator script and model files are retained. Training saves:

- `backend/models/risk_classifier.pt`
- `backend/models/risk_classifier_metadata.json`

For a real research model, replace the demo CSV with properly sourced, labeled, representative flight data. Do not train synthetic labels and then describe the result as validated accident risk.

## Manual Assessment Inputs

The required model inputs are:

- Aircraft: type, age, entered engine health, runway length.
- Flight: altitude, airspeed, fuel level, duration, turbulence level, night-flight flag.
- Weather: visibility, temperature, dew point, humidity, precipitation, wind speed, wind gust, crosswind, and air pressure.

Flight number, date, route, and airport are optional context fields. The current classifier does not use those fields. The assessment endpoint validates allowed categories and numerical ranges; see the Pydantic schema in `backend/app/ai/schemas.py`.

## API

Start FastAPI from `backend/`. Interactive OpenAPI documentation is at `http://localhost:8000/docs`.

| Method | Endpoint               | Purpose                                                                              |
| ------ | ---------------------- | ------------------------------------------------------------------------------------ |
| `GET`  | `/api/health`          | API process health                                                                   |
| `GET`  | `/api/model/status`    | Risk-model artifact status, version, and training-data provenance                    |
| `POST` | `/api/risk-assessment` | Validate manual flight/weather inputs and return model index and sensitivity factors |
| `POST` | `/api/inference`       | Validate a telemetry sample and apply demo parameter rules                           |

`/api/risk-assessment` returns HTTP 503 if model artifacts are missing or invalid. The frontend uses `VITE_API_BASE_URL` when set; otherwise it calls `http://localhost:8000`.

`/api/inference` accepts `flight_id`, `aircraft_id`, timestamp, altitude, airspeed, vertical speed, pitch, roll, heading, latitude, longitude, and flight phase. The current anomaly engine applies configured parameter checks (for example, high roll, speed, or vertical speed) and stale-timestamp checks. It is not deep-learning inference and does not generate causal diagnoses.

## Data and Storage

- `backend/data/raw/` is for source or generated CSV inputs. The synthetic demo CSV is reproducible and ignored by Git.
- `backend/data/processed/` is currently unused by the runnable API.
- `backend/models/` contains the TorchScript risk model and metadata. `backend/models/pretrained/` is not currently used by the assessment endpoint.
- `backend/schema.sql` defines PostgreSQL tables and indexes for aircraft, flights, telemetry, anomalies, alerts, and model versions. Apply it to a database only when needed, but note that runtime CRUD and database connection management are not yet implemented.
- Database credentials belong in `backend/.env`, never in the frontend. `.env.example` is a template, not a working credential file.

## Setup: Windows PowerShell

Prerequisites: Python 3.11/3.12 and Node.js 20 or later.

### 1. Start the backend

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks virtual-environment activation, run `Set-ExecutionPolicy -Scope Process Bypass` in that terminal, then activate again. Keep the backend terminal open.

### 2. Start the frontend

In a second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. If that port is occupied, Vite selects another; local development CORS accepts localhost and 127.0.0.1 ports.

### 3. Check the services

- Frontend: the Vite URL printed by `npm run dev`.
- API health: `http://localhost:8000/api/health`.
- Model status: `http://localhost:8000/api/model/status`.
- API docs: `http://localhost:8000/docs`.

## Testing and Build

From the project root:

```powershell
cd backend
python -m pytest tests_test_pipeline.py -q
python -m compileall -q app training tests_test_pipeline.py
cd ..\frontend
npm run build
```

The frontend build may print a Vite warning that the Three.js bundle exceeds 500 kB. It is a bundle-size warning, not a build failure.

## Repository Layout

```text
.
├── backend/
│   ├── app/
│   │   ├── ai/                 # Pydantic schemas, demo rules, risk-model loader, preprocessing
│   │   ├── core/               # Environment settings
│   │   └── main.py             # FastAPI routes
│   ├── data/raw/               # Generated or user-supplied CSV inputs
│   ├── models/                 # TorchScript model and metadata
│   ├── training/               # Synthetic generator and offline trainer
│   ├── schema.sql              # PostgreSQL schema; not wired to runtime persistence
│   ├── requirements.txt
│   └── tests_test_pipeline.py
├── frontend/
│   ├── public/models/aircraft.glb
│   └── src/
│       ├── pages/RiskAssessment.jsx
│       ├── App.jsx              # Exterior aircraft, cockpit, telemetry loop
│       └── App.css
├── .env.example
├── API.md
├── DEEP_LEARNING.md
├── DEPLOYMENT.md
└── SAFETY_LIMITATIONS.md
```

## Limitations and Safety

- The installed MLP is trained on generated synthetic data, not historical real-flight outcomes. Its score cannot be interpreted as actual accident likelihood.
- The synthetic test metrics only measure recovery of a synthetic labeling heuristic.
- Input sensitivity factors are model comparisons against training averages, not causal explanations.
- The cockpit simulator uses sample telemetry and weather values; it is not connected to an aircraft, ADS-B feed, or live weather service.
- Telemetry anomaly detection currently uses parameter rules; no trained sequence anomaly model is installed.
- The PostgreSQL schema is provided, but the API does not currently persist telemetry, risk assessments, alerts, or audit events.
- Authentication, authorization, production rate limiting, and operational security controls are not implemented.

AeroGuard is a research and demonstration prototype, not a certified aviation safety system. It must not be used as the sole basis for operational, maintenance, air-traffic-control, or emergency decisions. Any real-world use would require appropriate data, independent validation, calibration, redundancy, human oversight, certification, and regulatory approval.

## Further Documentation

- [Architecture](ARCHITECTURE.md)
- [API details](API.md)
- [Deep-learning methodology and evaluation](DEEP_LEARNING.md)
- [Deployment and training](DEPLOYMENT.md)
- [Safety limitations](SAFETY_LIMITATIONS.md)
- [Testing](TESTING.md)
