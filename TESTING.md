# Testing

- Frontend: `cd frontend; npm run build`
- Backend syntax: `cd backend; python -m compileall app tests_test_pipeline.py`
- Backend tests: install requirements and run `pytest tests_test_pipeline.py`

The focused tests cover temporal window generation and escalation of an abnormal approach descent. Integration testing should run FastAPI and verify `POST /api/inference` from the frontend origin.
