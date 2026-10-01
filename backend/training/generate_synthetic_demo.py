"""Generate explicitly synthetic flights for demonstrating the ML pipeline only."""
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

AIRCRAFT_TYPES = np.array(["A220", "A320", "A330", "A350", "B737", "B747", "B777", "B787", "Other"])
TURBULENCE = np.array(["NONE", "LIGHT", "MODERATE", "SEVERE"])
FLIGHT_PHASES = np.array(["TAXI", "TAKEOFF", "CLIMB", "CRUISE", "DESCENT", "APPROACH"])


def generate(output: Path, rows: int = 30000, seed: int = 20260927) -> Path:
    rng = np.random.default_rng(seed)
    age = rng.uniform(0, 35, rows)
    engine_health = rng.uniform(62, 100, rows)
    runway = rng.uniform(1200, 4200, rows)
    phase = rng.choice(FLIGHT_PHASES, rows, p=[0.08, 0.08, 0.15, 0.42, 0.15, 0.12])
    phase_profiles = {
        "TAXI": (rng.uniform(0, 1000, rows), rng.uniform(0, 35, rows)),
        "TAKEOFF": (rng.uniform(0, 5000, rows), rng.uniform(100, 220, rows)),
        "CLIMB": (rng.uniform(3000, 35000, rows), rng.uniform(180, 380, rows)),
        "CRUISE": (rng.uniform(25000, 41000, rows), rng.uniform(350, 510, rows)),
        "DESCENT": (rng.uniform(3000, 35000, rows), rng.uniform(180, 420, rows)),
        "APPROACH": (rng.uniform(0, 8000, rows), rng.uniform(100, 240, rows)),
    }
    altitude = np.select([phase == value for value in FLIGHT_PHASES], [phase_profiles[value][0] for value in FLIGHT_PHASES])
    airspeed = np.select([phase == value for value in FLIGHT_PHASES], [phase_profiles[value][1] for value in FLIGHT_PHASES])
    fuel = rng.uniform(8, 100, rows)
    duration = rng.uniform(0.5, 15, rows)
    turbulence = rng.choice(TURBULENCE, rows, p=[0.48, 0.34, 0.14, 0.04])
    visibility = np.clip(rng.lognormal(2.0, 0.75, rows), 0.2, 25)
    temperature = rng.uniform(-35, 42, rows)
    dew_point = np.maximum(-80, temperature - rng.uniform(0, 28, rows))
    humidity = rng.uniform(15, 100, rows)
    precipitation = np.clip(rng.exponential(1.1, rows), 0, 25)
    wind = np.clip(rng.gamma(2.1, 8, rows), 0, 90)
    gust = np.clip(wind + rng.gamma(1.8, 5, rows), 0, 120)
    crosswind = np.clip(rng.gamma(1.7, 6, rows), 0, 55)
    pressure = rng.normal(1013, 13, rows).clip(960, 1050)
    night = rng.integers(0, 2, rows)

    turbulence_points = np.select(
        [turbulence == "LIGHT", turbulence == "MODERATE", turbulence == "SEVERE"],
        [0.055, 0.12, 0.20],
        default=0.0,
    )
    synthetic_index = (
        0.025
        + 0.07 * (age / 35)
        + 0.11 * ((100 - engine_health) / 38)
        + 0.10 * np.clip((3200 - runway) / 2000, 0, 1)
        + 0.08 * (1 - fuel / 100)
        + 0.15 * np.clip((10 - visibility) / 10, 0, 1)
        + 0.07 * np.clip(precipitation / 12, 0, 1)
        + 0.08 * np.clip((gust - 15) / 70, 0, 1)
        + 0.09 * np.clip(crosswind / 40, 0, 1)
        + turbulence_points
        + 0.035 * night
        + 0.025 * (duration / 15)
        + rng.normal(0, 0.02, rows)
    )
    labels = (synthetic_index >= 0.43).astype(int)
    start = datetime(2018, 1, 1, tzinfo=timezone.utc)
    dates = [start + timedelta(days=int(day)) for day in rng.integers(0, 3000, rows)]

    frame = pd.DataFrame({
        "flight_id": [f"SYN-{index:06d}" for index in range(rows)],
        "flight_date": dates,
        "flight_phase": phase,
        "accident_label": labels,
        "aircraft_type": rng.choice(AIRCRAFT_TYPES, rows),
        "aircraft_age_years": age,
        "engine_health_percent": engine_health,
        "runway_length_m": runway,
        "altitude_ft": altitude,
        "airspeed_kt": airspeed,
        "fuel_level_percent": fuel,
        "flight_duration_hours": duration,
        "turbulence_level": turbulence,
        "visibility_km": visibility,
        "temperature_c": temperature,
        "dew_point_c": dew_point,
        "humidity_percent": humidity,
        "precipitation_mm_hr": precipitation,
        "wind_speed_kt": wind,
        "wind_gust_kt": gust,
        "crosswind_kt": crosswind,
        "air_pressure_hpa": pressure,
        "night_flight": night.astype(bool),
        "data_origin": "synthetic demonstration only",
    })
    output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(output, index=False)
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("data/raw/synthetic_demo_flights.csv"))
    parser.add_argument("--rows", type=int, default=30000)
    arguments = parser.parse_args()
    path = generate(arguments.output, arguments.rows)
    generated = pd.read_csv(path)
    print(f"Generated {len(generated)} SYNTHETIC rows at {path}")
    print(f"Synthetic labels: {generated['accident_label'].value_counts().sort_index().to_dict()}")
