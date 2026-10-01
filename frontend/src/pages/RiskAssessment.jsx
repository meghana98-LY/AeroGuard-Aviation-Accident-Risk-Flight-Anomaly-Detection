import { useState } from "react";
import "./RiskAssessment.css";

const fieldGroups = [
  {
    title: "Flight Parameters",
    description:
      "Enter the flight, aircraft, and operating conditions for assessment.",
    fields: [
      {
        name: "flight_number",
        label: "Flight Number",
        type: "text",
        placeholder: "e.g. AG042",
        optional: true,
      },
      {
        name: "flight_date",
        label: "Flight Date",
        type: "date",
        optional: true,
      },
      {
        name: "route",
        label: "Route",
        type: "text",
        placeholder: "e.g. KJFK to EGLL",
        optional: true,
      },
      {
        name: "airport",
        label: "Airport",
        type: "text",
        placeholder: "e.g. JFK",
        optional: true,
      },
      {
        name: "aircraft_type",
        label: "Aircraft Type",
        type: "select",
        options: [
          "A220",
          "A320",
          "A330",
          "A350",
          "B737",
          "B747",
          "B777",
          "B787",
          "Other",
        ],
      },
      {
        name: "aircraft_age_years",
        label: "Aircraft Age",
        unit: "years",
        type: "number",
        min: 0,
        max: 80,
        step: 0.1,
        placeholder: "e.g. 12.5",
      },
      {
        name: "engine_health_percent",
        label: "Engine Health",
        unit: "%",
        type: "number",
        min: 0,
        max: 100,
        step: 1,
        placeholder: "e.g. 92",
      },
      {
        name: "runway_length_m",
        label: "Runway Length",
        unit: "m",
        type: "number",
        min: 300,
        max: 7000,
        step: 1,
        placeholder: "e.g. 3050",
      },
      {
        name: "altitude_ft",
        label: "Altitude",
        unit: "ft",
        type: "number",
        min: -1000,
        max: 60000,
        step: 1,
        placeholder: "e.g. 35000",
      },
      {
        name: "airspeed_kt",
        label: "Airspeed",
        unit: "kt",
        type: "number",
        min: 0,
        max: 800,
        step: 1,
        placeholder: "e.g. 250",
      },
      {
        name: "fuel_level_percent",
        label: "Fuel Level",
        unit: "%",
        type: "number",
        min: 0,
        max: 100,
        step: 1,
        placeholder: "e.g. 85",
      },
      {
        name: "flight_duration_hours",
        label: "Flight Duration",
        unit: "hours",
        type: "number",
        min: 0.1,
        max: 30,
        step: 0.1,
        placeholder: "e.g. 8.5",
      },
      {
        name: "turbulence_level",
        label: "Turbulence Level",
        type: "select",
        options: ["NONE", "LIGHT", "MODERATE", "SEVERE"],
      },
    ],
  },
  {
    title: "Weather Parameters",
    description:
      "Use observations for the assessment time and airport; do not treat demo data as live weather.",
    fields: [
      {
        name: "visibility_km",
        label: "Visibility",
        unit: "km",
        type: "number",
        min: 0,
        max: 100,
        step: 0.1,
        placeholder: "e.g. 10",
      },
      {
        name: "temperature_c",
        label: "Temperature",
        unit: "C",
        type: "number",
        min: -100,
        max: 70,
        step: 0.1,
        placeholder: "e.g. 18",
      },
      {
        name: "dew_point_c",
        label: "Dew Point",
        unit: "C",
        type: "number",
        min: -100,
        max: 70,
        step: 0.1,
        placeholder: "e.g. 12",
      },
      {
        name: "humidity_percent",
        label: "Humidity",
        unit: "%",
        type: "number",
        min: 0,
        max: 100,
        step: 1,
        placeholder: "e.g. 68",
      },
      {
        name: "precipitation_mm_hr",
        label: "Precipitation",
        unit: "mm/hr",
        type: "number",
        min: 0,
        max: 1000,
        step: 0.1,
        placeholder: "e.g. 0",
      },
      {
        name: "wind_speed_kt",
        label: "Wind Speed",
        unit: "kt",
        type: "number",
        min: 0,
        max: 300,
        step: 1,
        placeholder: "e.g. 12",
      },
      {
        name: "wind_gust_kt",
        label: "Wind Gust",
        unit: "kt",
        type: "number",
        min: 0,
        max: 350,
        step: 1,
        placeholder: "e.g. 18",
      },
      {
        name: "crosswind_kt",
        label: "Crosswind",
        unit: "kt",
        type: "number",
        min: 0,
        max: 150,
        step: 1,
        placeholder: "e.g. 8",
      },
      {
        name: "air_pressure_hpa",
        label: "Air Pressure",
        unit: "hPa",
        type: "number",
        min: 800,
        max: 1100,
        step: 0.1,
        placeholder: "e.g. 1013.2",
      },
      {
        name: "night_flight",
        label: "Night Flight",
        type: "select",
        options: ["No", "Yes"],
      },
    ],
  },
];

const initialValues = Object.fromEntries(
  fieldGroups.flatMap((group) => group.fields.map((field) => [field.name, ""])),
);

function FormField({ field, value, onChange }) {
  const id = `risk-${field.name}`;
  return (
    <label className="risk-field" htmlFor={id}>
      <span className="risk-field-label">
        {field.label}
        {field.unit ? ` (${field.unit})` : ""}
        {!field.optional && <b aria-label="required"> *</b>}
      </span>
      {field.type === "select" ? (
        <select
          id={id}
          name={field.name}
          value={value}
          onChange={onChange}
          required
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={field.name}
          type={field.type}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          required={!field.optional}
        />
      )}
    </label>
  );
}

export default function RiskAssessment({ onBack }) {
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState(null);
  const [requestState, setRequestState] = useState("idle");
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    setValues((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setResult(null);
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setRequestState("loading");
    setResult(null);
    setMessage("");

    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === ""
          ? null
          : [
                "flight_number",
                "flight_date",
                "route",
                "airport",
                "aircraft_type",
                "turbulence_level",
                "night_flight",
              ].includes(key)
            ? value
            : Number(value),
      ]),
    );
    payload.night_flight = payload.night_flight === "Yes";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/risk-assessment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.detail || "Risk assessment could not be completed.",
        );
      setResult(data);
      setRequestState("success");
    } catch (error) {
      setRequestState("error");
      setMessage(error.message || "Could not connect to the AeroGuard API.");
    }
  };

  const resetForm = () => {
    setValues(initialValues);
    setResult(null);
    setRequestState("idle");
    setMessage("");
  };

  return (
    <main className="risk-assessment">
      <header className="risk-nav">
        <div className="risk-brand">
          <span className="risk-brand-icon">AG</span>
          <strong>
            AeroGuard <b>Risk Assessment</b>
          </strong>
        </div>
        <button className="risk-back" type="button" onClick={onBack}>
          Return to cockpit
        </button>
      </header>

      <div className="risk-page-content">
        <div className="risk-page-heading">
          <span className="risk-eyebrow">FLIGHT SAFETY / MANUAL ENTRY</span>
          <h1>Flight risk assessment</h1>
          <p>
            Enter the flight and weather observations to request a model
            assessment.
          </p>
          <p className="risk-demo-notice">
            DEMONSTRATION MODE: the currently installed model was trained on
            generated synthetic data. Its score is not a real-world aviation
            risk estimate.
          </p>
        </div>

        <form className="risk-form" onSubmit={handleSubmit}>
          {fieldGroups.map((group) => (
            <section className="risk-form-section" key={group.title}>
              <header>
                <span className="risk-section-mark">
                  {String(fieldGroups.indexOf(group) + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
              </header>
              <div className="risk-fields-grid">
                {group.fields.map((field) => (
                  <FormField
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    onChange={handleChange}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="risk-form-actions">
            <button className="risk-reset" type="button" onClick={resetForm}>
              Clear form
            </button>
            <button
              className="risk-submit"
              type="submit"
              disabled={requestState === "loading"}
            >
              {requestState === "loading"
                ? "Checking model..."
                : "Assess flight risk"}
            </button>
          </div>
        </form>

        {requestState === "error" && (
          <section className="risk-result risk-result-error" role="alert">
            <h2>Assessment unavailable</h2>
            <p>{message}</p>
            <p>
              No risk score was generated. This system will not substitute a
              rule-based guess for a trained model.
            </p>
          </section>
        )}

        {result && (
          <section className="risk-result" aria-live="polite">
            <span className="risk-eyebrow">
              {result.is_synthetic
                ? "SYNTHETIC DEMONSTRATION MODEL / NOT REAL-WORLD RISK"
                : "MODEL OUTPUT / NOT AN ACCIDENT PROBABILITY"}
            </span>
            <h2>{result.risk_band} risk index</h2>
            <div className="risk-score-line">
              <strong>{Number(result.risk_score).toFixed(1)}</strong>
              <span>/ 100</span>
            </div>
            <p>{result.explanation}</p>
            <div className="risk-factors">
              <h3>Inputs influencing this score</h3>
              {result.factors.length ? (
                <ul>
                  {result.factors.map((factor, index) => (
                    <li key={`${factor.parameter}-${index}`}>
                      <span>
                        <strong>{factor.parameter}</strong>
                        <small>{factor.observed_value}</small>
                      </span>
                      <b className={factor.direction}>
                        {factor.direction === "elevates"
                          ? "Raises model score"
                          : "Lowers model score"}
                      </b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No individual input shifted the model score substantially from
                  its training baseline.
                </p>
              )}
            </div>
            <small>
              Model {result.model_version}; trained on {result.training_data}.{" "}
              {result.disclaimer}
            </small>
          </section>
        )}

        <p className="risk-disclaimer">
          Research and decision-support prototype only. Not a certified aviation
          safety system; never use as the sole basis for operational decisions.
        </p>
      </div>
    </main>
  );
}
