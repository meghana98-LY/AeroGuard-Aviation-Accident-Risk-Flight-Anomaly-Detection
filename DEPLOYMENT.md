# Deployment

1. Copy `.env.example` to `.env` and set a Neon `DATABASE_URL` with SSL.
2. From `backend/`, create a virtual environment and run `pip install -r requirements.txt`.
3. Apply `schema.sql` to Neon with the provider SQL console or `psql`.
4. Start FastAPI: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
5. From `frontend/`, run `npm install` and `npm run dev`.

## Train the Manual Risk Model

Provide a curated CSV with one row per unique flight. Required columns are `flight_id`, `flight_date`, `accident_label`, and all form model features listed in `DEEP_LEARNING.md`. Use verified historical outcomes; do not create synthetic labels to make the model appear trained.

From `backend/`, run:

```powershell
python -m training.train_risk_model --csv data/raw/labeled_flights.csv --output-dir models
```

The command creates `models/risk_classifier.pt` and `models/risk_classifier_metadata.json`, which are the default API artifact paths. Check `GET /api/model/status` after restarting FastAPI. Without both artifacts, the form intentionally reports that assessment is unavailable.

For a software-only demonstration (not real aviation risk), generate 30,000 phase-shaped synthetic rows and train the included demo classifier:

```powershell
python -m training.generate_synthetic_demo --output data/raw/synthetic_demo_flights.csv
python -m training.train_risk_model --csv data/raw/synthetic_demo_flights.csv --output-dir models
```

The repository includes model artifacts produced this way, and the form identifies their synthetic origin on every result. The reported test metrics measure agreement with the generator's synthetic heuristic only, not real flight outcomes.

Keep `.env` out of source control. Configure CORS to the deployed frontend origin in production.
