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

The manual assessment uses a **supervised feed-forward neural network**, specifically a **multilayer perceptron (MLP)** implemented in PyTorch. Each request contains one tabular flight record, so this model is an MLP—not an LSTM, GRU, or transformer, which would be appropriate for sequence input.

#### Model architecture

| Component | Configuration |
| --- | --- |
| Input | 30 features: 16 numeric values, 9 aircraft-type one-hot values, 4 turbulence one-hot values, and 1 night-flight flag |
| Hidden layer 1 | 96 units, ReLU, followed by dropout (0.08) |
| Hidden layer 2 | 48 units, ReLU |
| Output | 1 logit; sigmoid maps it to the displayed 0–100 risk index |
| Checkpoint | PyTorch state-dict checkpoint at `backend/models/risk_classifier.pkl` |

The 16 numeric features are aircraft age, engine health, runway length, altitude, airspeed, fuel, flight duration, visibility, temperature, dew point, humidity, precipitation, wind speed, wind gust, crosswind, and air pressure. Flight number, date, route, and airport may be captured as context, but are not classifier features. The output index and its NORMAL/LOW/MODERATE/HIGH/CRITICAL band are **not calibrated accident probabilities**.

#### Dataset and labels

The generated demonstration dataset has **30,000 rows**, already more than the 1,000-sample minimum. The CSV is not included in the repository; generate it locally with the command below before retraining. No row duplication or further augmentation was performed. The reproducible generator samples aircraft, weather, turbulence, and night-flight features, and generates phase-shaped altitude and airspeed. Labels (`accident_label`) are assigned from an illustrative weighted heuristic plus random noise. They are synthetic demonstration labels—not verified accident outcomes.

#### Training configuration

| Setting | Value |
| --- | --- |
| Split | Chronological, flight-level 70% / 15% / 15% |
| Samples | 21,000 train / 4,500 validation / 4,500 test |
| Scaling | Standardized numeric feature vector; mean and scale fit on training split only |
| Epochs | 100 requested; early stopping selected the best validation-loss checkpoint after 53 epochs (patience 22) |
| Batch size | 256 |
| Optimizer | AdamW, learning rate 0.001, weight decay 0.001 |
| Loss | Weighted binary cross-entropy with logits |
| Seed | 42 |
| Classification threshold | 0.82, selected on validation F1 |

#### Evaluation

Validation metrics are calculated on the validation split at the selected threshold. Test metrics are calculated on the later chronological test split at that same threshold.

| Metric | Validation | Test |
| --- | ---: | ---: |
| Loss | 0.241 | 0.239 |
| Accuracy | 0.948 | 0.947 |
| ROC-AUC | 0.986 | 0.986 |
| PR-AUC | 0.943 | 0.948 |
| Balanced accuracy | — | 0.913 |
| Precision | 0.842 | 0.861 |
| Recall | 0.872 | 0.858 |
| F1 | 0.857 | 0.859 |
| Specificity | — | 0.968 |
| False-positive rate | — | 0.032 |
| False-negative rate | — | 0.142 |

Test confusion matrix (rows = actual class `[0, 1]`; columns = predicted class `[0, 1]`):

```text
[[3539, 117],
 [ 120, 724]]
```

These metrics measure how well the MLP recovers the generator's synthetic labeling heuristic. They are **not evidence of real accident prediction or aviation safety** and must not be used to make operational decisions.

#### Retrain the demonstration model

From the `backend/` directory with dependencies installed:

```powershell
python -m training.generate_synthetic_demo --output data/raw/synthetic_demo_flights.csv --rows 30000
python -m training.train_risk_model --csv data/raw/synthetic_demo_flights.csv --output-dir models --epochs 100 --batch-size 256
```

The second command saves/updates `models/risk_classifier.pkl` and `models/risk_classifier_metadata.json`. The running risk-assessment API loads that checkpoint; restart the backend after retraining. The CSV is ignored by Git, while the generator, checkpoint, and metadata are retained. For research with meaningful outcomes, replace the demo CSV with appropriately sourced, representative, verified labeled data and independently validate the model. Do not describe synthetic training as validated accident-risk prediction.

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

- `backend/data/raw/` is for source or generated CSV inputs. The synthetic demo CSV can be regenerated with the training command and is ignored by Git; it is not included in the repository.
- `backend/data/processed/` is currently unused by the runnable API.
- `backend/models/` contains the PyTorch checkpoint and metadata used by the assessment endpoint. `backend/models/pretrained/` is not currently used by the assessment endpoint.
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

The trained MLP is used by `POST /api/risk-assessment`. The API status endpoint reports the loaded model version and that its training data is synthetic. If model artifacts are missing or invalid, the risk-assessment endpoint returns HTTP 503 rather than producing an unscored result.

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
│   ├── models/                 # PyTorch checkpoint and metadata
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
