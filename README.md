# ✈️ AeroGuard — Aviation Accident Risk & Flight Anomaly Detection

AeroGuard is a Deep Learning-based aviation safety monitoring and visualization system designed to analyze flight behavior, detect abnormal flight patterns, estimate aviation safety risk, and present the results through an interactive 3D aircraft digital twin.

The system combines **Deep Learning, flight trajectory analysis, anomaly detection, real-time simulation, and 3D visualization** into a single interactive platform.

---

## 🚀 Project Overview

Traditional aviation safety analysis mainly relies on historical accident and incident records. AeroGuard extends this approach by combining AI-based flight analysis with an interactive 3D representation of an aircraft.

The application presents a complete aircraft flying through a 3D sky environment. Users can interact with the aircraft and click the **pilot/cockpit window** to transition from the external aircraft view into an interactive cockpit dashboard.

The cockpit dashboard displays live flight parameters, AI-generated anomaly information, and safety indicators.

> **Important:** AeroGuard is a research and prototype system for aviation safety analysis. It does not replace certified aviation systems or predict actual accidents with certainty.

---

## 🎯 Objectives

- Analyze aviation flight and safety data using Deep Learning.
- Detect abnormal flight and trajectory patterns.
- Estimate an AI-based flight risk/anomaly score.
- Visualize aircraft movement in a 3D environment.
- Simulate real-time flight telemetry.
- Connect AI predictions with aircraft behavior.
- Provide an interactive cockpit dashboard.
- Evaluate the performance of the implemented AI model.
- Provide historical aviation safety analysis using accident/incident data.

---

## 🧠 System Concept

```text
                    AVIATION DATA
                         │
                         ▼
                Data Preprocessing
                         │
                         ▼
                 Deep Learning Model
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       Risk Analysis          Anomaly Detection
             │                       │
             └───────────┬───────────┘
                         ▼
                   Risk Engine
                         │
                         ▼
                    FastAPI
                         │
                    WebSocket
                         │
                         ▼
              React + Three.js
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       3D Aircraft World        Cockpit View
             │                       │
             │                 Safety Dashboard
             │                       │
             └───────────┬───────────┘
                         ▼
                 Real-Time Alerts
