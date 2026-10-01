import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import RiskAssessment from "./pages/RiskAssessment.jsx";
import "./App.css";

/* =========================================================
   EXTERNAL AIRCRAFT
========================================================= */

function Aircraft({ onCockpitClick }) {
  const aircraftRef = useRef();
  const { scene } = useGLTF("/models/aircraft.glb");

  const modelData = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxDimension = Math.max(size.x, size.y, size.z);

    const targetSize = 5;
    const scale = targetSize / maxDimension;

    return {
      scale,
      center,
    };
  }, [scene]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (!aircraftRef.current) return;

    aircraftRef.current.position.y = Math.sin(t * 0.7) * 0.12;

    aircraftRef.current.rotation.z = Math.sin(t * 0.55) * 0.025;

    aircraftRef.current.rotation.x = Math.sin(t * 0.45) * 0.012;
  });

  /*
   * Clickable cockpit region.
   * The hotspot is invisible and sits around the
   * visible cockpit-window area of the normalized model.
   */
  const cockpitPosition = new THREE.Vector3(1.45, 0.3, 0.58);

  cockpitPosition.sub(modelData.center).multiplyScalar(modelData.scale);

  return (
    <group ref={aircraftRef}>
      <primitive
        object={scene}
        scale={modelData.scale}
        position={[
          -modelData.center.x * modelData.scale,
          -modelData.center.y * modelData.scale,
          -modelData.center.z * modelData.scale,
        ]}
      />

      <mesh
        position={cockpitPosition}
        onClick={(event) => {
          event.stopPropagation();
          onCockpitClick();
        }}
      >
        <sphereGeometry args={[0.38, 24, 24]} />

        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* =========================================================
   CLOUD
========================================================= */

function Cloud({ position, scale = 1, color = "#ffffff" }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>

      <mesh position={[0.8, 0.1, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>

      <mesh position={[-0.7, 0.05, 0]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  );
}

/* =========================================================
   EXTERNAL CAMERA
========================================================= */

function FlightCamera() {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    camera.position.set(5.2, 2.6, 6.4);
    camera.fov = 42;
    camera.zoom = 1;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    const aircraftY = Math.sin(t * 0.7) * 0.12;

    /*
     * Approved external camera position.
     * Direct positioning prevents the camera from
     * travelling through the aircraft.
     */
    state.camera.position.set(5.2, 2.6 + aircraftY, 6.4);

    state.camera.lookAt(0, aircraftY, 0);
  });

  return null;
}

/* =========================================================
   COCKPIT CAMERA
========================================================= */

function CockpitCamera() {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    camera.position.set(0, 2.05, 5.5);
    camera.fov = 42;
    camera.zoom = 1;
    camera.lookAt(0, 2.2, -5);
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((state) => {
    /*
     * Pilot eye position.
     * Looking forward through the windshield.
     */
    state.camera.position.set(0, 2.05, 5.5);

    state.camera.lookAt(0, 2.2, -5);
  });

  return null;
}

/* =========================================================
   COCKPIT MATERIAL
========================================================= */

function CockpitMaterial({ color, roughness = 0.6, metalness = 0 }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
    />
  );
}

/* =========================================================
   COCKPIT WINDSHIELD
========================================================= */

function Windshield() {
  return (
    <group>
      <mesh position={[0, 3.1, -5.7]}>
        <planeGeometry args={[15, 7]} />
        <shaderMaterial
          side={THREE.DoubleSide}
          vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
          fragmentShader={`varying vec2 vUv; void main() { float y = vUv.y; vec3 upper = mix(vec3(0.13, 0.19, 0.32), vec3(0.48, 0.30, 0.43), smoothstep(0.62, 0.98, y)); vec3 lower = mix(vec3(0.24, 0.28, 0.40), vec3(0.98, 0.49, 0.31), smoothstep(0.12, 0.54, y)); float horizon = exp(-pow((y - 0.40) * 8.0, 2.0)); vec3 sky = mix(lower, upper, smoothstep(0.38, 0.70, y)); sky = mix(sky, vec3(1.0, 0.70, 0.42), horizon * 0.8); gl_FragColor = vec4(sky, 1.0); }`}
        />
      </mesh>

      <mesh position={[0, 2.55, -5.25]}>
        <circleGeometry args={[0.28, 32]} />
        <meshBasicMaterial color="#fff0ba" />
      </mesh>
      <mesh position={[0, 2.55, -5.3]}>
        <circleGeometry args={[0.62, 32]} />
        <meshBasicMaterial color="#ffb668" transparent opacity={0.18} />
      </mesh>

      <Cloud position={[-5.0, 2.48, -5.05]} scale={0.55} color="#b96e69" />
      <Cloud position={[-3.5, 2.62, -5.0]} scale={0.42} color="#e38b70" />
      <Cloud position={[-1.9, 2.43, -5.0]} scale={0.48} color="#ad6872" />
      <Cloud position={[1.8, 2.5, -5.0]} scale={0.48} color="#d77b68" />
      <Cloud position={[3.6, 2.6, -5.0]} scale={0.43} color="#ed9a72" />
      <Cloud position={[5.2, 2.45, -5.0]} scale={0.58} color="#a85e69" />

      {[-6.8, 0, 6.8].map((x, index) => (
        <mesh key={`windshield-post-${index}`} position={[x, 2.85, -4.98]}>
          <boxGeometry args={[x === 0 ? 0.2 : 0.34, 3.45, 0.38]} />
          <CockpitMaterial color="#101820" roughness={0.4} />
        </mesh>
      ))}

      <mesh position={[0, 4.52, -4.98]}>
        <boxGeometry args={[14.1, 0.28, 0.42]} />
        <CockpitMaterial color="#0d141b" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.38, -4.85]}>
        <boxGeometry args={[14.1, 0.28, 0.55]} />
        <CockpitMaterial color="#0d141b" roughness={0.45} />
      </mesh>
    </group>
  );
}

function OverheadPanel() {
  const switches = Array.from({ length: 24 }, (_, index) => index);
  return (
    <group>
      <mesh position={[0, 4.02, 1.25]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[7.2, 0.22, 1.65]} />
        <CockpitMaterial color="#10151a" roughness={0.42} metalness={0.2} />
      </mesh>
      {switches.map((index) => {
        const column = index % 12;
        const row = Math.floor(index / 12);
        return (
          <group
            key={index}
            position={[
              -3.05 + column * 0.555,
              4.16 + row * 0.02,
              1.28 + (row - 0.5) * 0.58,
            ]}
          >
            <mesh>
              <boxGeometry args={[0.32, 0.035, 0.24]} />
              <meshBasicMaterial
                color={index % 4 === 0 ? "#d99535" : "#252d32"}
              />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshBasicMaterial
                color={index % 5 === 0 ? "#ffb541" : "#69502b"}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* =========================================================
   COCKPIT INSTRUMENT PANEL
========================================================= */

function CockpitMonitor({ telemetry, analysis, apiStatus }) {
  const [displayZoom, setDisplayZoom] = useState(1);
  const flight = simulatedFlightContext;
  const sections = [
    {
      title: "FLIGHT / AIRFRAME",
      items: [
        ["FLIGHT NO.", flight.flightNumber],
        ["FLIGHT DATE", flight.flightDate],
        ["ROUTE", flight.route],
        ["AIRPORTS", flight.airports],
        ["AIRCRAFT TYPE", flight.aircraftType],
        ["AIRCRAFT AGE", flight.aircraftAge],
        ["ENGINE HEALTH", flight.engineHealth],
        ["RUNWAY LENGTH", flight.runwayLength],
      ],
    },
    {
      title: "FLIGHT DATA",
      items: [
        ["ALTITUDE", `${Math.round(telemetry.altitude).toLocaleString()} FT`],
        ["AIRSPEED", `${Math.round(telemetry.airspeed)} KT`],
        [
          "VERTICAL SPEED",
          `${telemetry.vertical_speed > 0 ? "+" : ""}${Math.round(telemetry.vertical_speed)} FT/MIN`,
        ],
        ["HEADING", `${Math.round(telemetry.heading)} DEG MAG`],
        ["PITCH", `${telemetry.pitch.toFixed(1)} DEG`],
        ["ROLL", `${telemetry.roll.toFixed(1)} DEG`],
        ["FUEL LEVEL", flight.fuelLevel],
        ["FLIGHT DURATION", flight.flightDuration],
        ["TURBULENCE", flight.turbulence],
      ],
    },
    {
      title: "WEATHER",
      items: [
        ["VISIBILITY", flight.visibility],
        ["TEMPERATURE", flight.temperature],
        ["DEW POINT", flight.dewPoint],
        ["HUMIDITY", flight.humidity],
        ["PRECIPITATION", flight.precipitation],
        ["WIND SPEED", flight.windSpeed],
        ["WIND GUST", flight.windGust],
        ["CROSSWIND", flight.crosswind],
        ["AIR PRESSURE", flight.pressure],
        ["NIGHT FLIGHT", flight.nightFlight],
      ],
    },
    {
      title: "SAFETY MONITOR",
      items: [
        ["FLIGHT STATUS", analysis.severity],
        ["ANOMALY SCORE", `${analysis.anomaly_score.toFixed(1)} / 100`],
        ["AFFECTED", analysis.affected_parameters.join(", ") || "NONE"],
        ["MODEL VERSION", analysis.model_version],
        ["API STATUS", apiStatus ? "CONNECTED" : "LOCAL SCORER"],
        ["DATA MODE", "SIMULATED"],
      ],
    },
  ];
  const changeZoom = (amount) => {
    setDisplayZoom((current) =>
      Math.min(1.35, Math.max(0.8, Number((current + amount).toFixed(2)))),
    );
  };

  return (
    <div
      className="cockpit-monitor"
      onWheel={(event) => changeZoom(event.deltaY < 0 ? 0.05 : -0.05)}
    >
      <header className="monitor-console-label">
        <div className="monitor-brand">
          <span className="monitor-brand-mark">AG</span>
          <div>
            <strong>AEROGUARD</strong>
            <small>FLIGHT MONITORING</small>
          </div>
        </div>
        <div className="monitor-top-status">
          <span className="monitor-live">
            <i /> DISPLAY ACTIVE
          </span>
          <span className="demo-warning">SIMULATED DATA</span>
        </div>
        <div className="monitor-zoom" aria-label="Display zoom controls">
          <button
            type="button"
            onClick={() => changeZoom(-0.1)}
            aria-label="Zoom out"
          >
            -
          </button>
          <output>{Math.round(displayZoom * 100)}%</output>
          <button
            type="button"
            onClick={() => changeZoom(0.1)}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setDisplayZoom(1)}
            aria-label="Reset zoom"
          >
            1:1
          </button>
        </div>
      </header>
      <div className="monitor-overview">
        <span>
          FLIGHT <b>{flight.flightNumber}</b>
        </span>
        <span>
          ROUTE <b>{flight.route}</b>
        </span>
        <span>
          PHASE <b>{telemetry.flight_phase}</b>
        </span>
        <span>
          RISK{" "}
          <b
            className={
              analysis.severity === "NORMAL" ? "monitor-ok" : "monitor-alert"
            }
          >
            {analysis.severity} / {analysis.anomaly_score.toFixed(1)}
          </b>
        </span>
      </div>
      <div className="monitor-display-scroll">
        <div
          className="monitor-display-content"
          style={{ "--display-zoom": displayZoom }}
        >
          <div className="monitor-sections">
            {sections.map((section) => (
              <MonitorSection
                key={section.title}
                title={section.title}
                items={section.items}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlPanel() {
  return (
    <group>
      <mesh position={[0, 1.35, 1.65]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[8.4, 1.55, 1.15]} />
        <CockpitMaterial color="#10151b" roughness={0.5} metalness={0.2} />
      </mesh>

      <mesh position={[0, 1.88, 2.05]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[4.2, 0.8]} />
        <meshBasicMaterial color="#06151d" />
      </mesh>

      {[-3.45, 3.45].map((x) => (
        <mesh key={x} position={[x, 1.38, 2.02]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.52, 0.74, 0.13]} />
          <CockpitMaterial color="#0b1117" roughness={0.5} metalness={0.18} />
        </mesh>
      ))}

      {Array.from({ length: 16 }, (_, index) => (
        <mesh key={index} position={[-3.4 + index * 0.45, 1.08, 1.97]}>
          <cylinderGeometry args={[0.045, 0.055, 0.12, 10]} />
          <CockpitMaterial
            color={index % 4 === 0 ? "#b67b36" : "#34383a"}
            roughness={0.45}
          />
        </mesh>
      ))}
    </group>
  );
}

/* =========================================================
   CONTROL YOKE
========================================================= */

function Yoke({ position }) {
  return (
    <group position={position}>
      {/* Column */}

      <mesh>
        <cylinderGeometry args={[0.075, 0.075, 0.9, 16]} />

        <CockpitMaterial color="#11151a" />
      </mesh>

      {/* Yoke ring */}

      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.36, 0.075, 12, 24, Math.PI]} />

        <CockpitMaterial color="#222c34" roughness={0.5} />
      </mesh>

      {/* Center grip */}

      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[0.55, 0.12, 0.12]} />

        <CockpitMaterial color="#303a43" roughness={0.45} />
      </mesh>
    </group>
  );
}

/* =========================================================
   PILOT SEAT
========================================================= */

function PilotSeat({ position }) {
  return (
    <group position={position}>
      {/* Backrest */}

      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[1.45, 2.25, 0.62]} />

        <CockpitMaterial color="#443027" roughness={0.88} />
      </mesh>

      {/* Seat */}

      <mesh position={[0, 0.32, 0.15]}>
        <boxGeometry args={[1.45, 0.65, 1.15]} />

        <CockpitMaterial color="#694a35" roughness={0.86} />
      </mesh>

      {/* Headrest */}

      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[0.95, 0.45, 0.55]} />

        <CockpitMaterial color="#583b2b" roughness={0.86} />
      </mesh>

      <mesh position={[-0.78, 0.82, 0.15]}>
        <boxGeometry args={[0.18, 0.18, 0.85]} />
        <CockpitMaterial color="#17191b" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0.78, 0.82, 0.15]}>
        <boxGeometry args={[0.18, 0.18, 0.85]} />
        <CockpitMaterial color="#17191b" roughness={0.55} metalness={0.2} />
      </mesh>
    </group>
  );
}

/* =========================================================
   COCKPIT FLOOR
========================================================= */

function CockpitFloor() {
  return (
    <mesh position={[0, -0.15, 0]}>
      <boxGeometry args={[9, 0.25, 10]} />

      <CockpitMaterial color="#0d141a" roughness={0.85} />
    </mesh>
  );
}

/* =========================================================
   COCKPIT SIDE STRUCTURE
========================================================= */

function CockpitStructure() {
  return (
    <group>
      {/* Left side wall */}

      <mesh position={[-4.2, 2, 0]}>
        <boxGeometry args={[0.25, 4.5, 10]} />

        <CockpitMaterial color="#141b22" roughness={0.75} />
      </mesh>

      {/* Right side wall */}

      <mesh position={[4.2, 2, 0]}>
        <boxGeometry args={[0.25, 4.5, 10]} />

        <CockpitMaterial color="#141b22" roughness={0.75} />
      </mesh>

      {/* Ceiling */}

      <mesh position={[0, 4.55, 0]}>
        <boxGeometry args={[8.5, 0.25, 10]} />

        <CockpitMaterial color="#0c1218" roughness={0.8} />
      </mesh>

      {/* Left side console */}

      <mesh position={[-3.2, 0.75, 1.2]}>
        <boxGeometry args={[1.0, 1.25, 2.0]} />

        <CockpitMaterial color="#182128" roughness={0.7} />
      </mesh>

      {/* Right side console */}

      <mesh position={[3.2, 0.75, 1.2]}>
        <boxGeometry args={[1.0, 1.25, 2.0]} />

        <CockpitMaterial color="#182128" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* =========================================================
   COCKPIT SCENE
========================================================= */

function CockpitScene() {
  return (
    <>
      <color attach="background" args={["#0b151d"]} />

      <ambientLight intensity={2.5} />

      <directionalLight position={[0, 6, 2]} intensity={4} />

      <pointLight position={[0, 3, 2]} intensity={3} distance={15} />

      <pointLight position={[0, 3, -3]} intensity={2} distance={12} />

      <CockpitFloor />

      <CockpitStructure />

      <Windshield />

      <ControlPanel />

      <Yoke position={[-1.75, 1.05, 1.75]} />

      <Yoke position={[1.75, 1.05, 1.75]} />

      <PilotSeat position={[-1.75, 0, 2.7]} />

      <PilotSeat position={[1.75, 0, 2.7]} />

      <CockpitCamera />
    </>
  );
}

/* =========================================================
   COCKPIT SAFETY DASHBOARD
========================================================= */

const simulatedFlightContext = {
  flightNumber: "AG 042",
  flightDate: "26 SEP 2026",
  route: "KJFK  >  EGLL",
  airports: "JFK / LHR",
  aircraftType: "A320-200",
  aircraftAge: "8.4 YR",
  engineHealth: "SIM 96%",
  runwayLength: "12,079 FT",
  fuelLevel: "68%",
  flightDuration: "05:42",
  turbulence: "LIGHT",
  visibility: "10 KM",
  temperature: "+18 C",
  dewPoint: "+12 C",
  humidity: "68%",
  precipitation: "NONE",
  windSpeed: "12 KT",
  windGust: "18 KT",
  crosswind: "8 KT",
  pressure: "1013 HPA",
  nightFlight: "NO",
};

function MonitorSection({ title, items }) {
  return (
    <section className="monitor-section">
      <h2>{title}</h2>
      <dl className="monitor-grid">
        {items.map(([label, value]) => (
          <div className="monitor-reading" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CockpitDashboard({
  onExit,
  onRiskAssessment,
  telemetry,
  analysis,
  apiStatus,
}) {
  return (
    <div className="cockpit-dashboard">
      {/* Top header */}

      <header className="cockpit-header">
        <div>
          <div className="cockpit-title">AEROGUARD</div>

          <div className="cockpit-subtitle">
            FLIGHT DECK MONITORING / SYNTHETIC DEMO
          </div>
        </div>

        <div className="cockpit-actions">
          <button className="assessment-launch" onClick={onRiskAssessment}>
            RISK ASSESSMENT
          </button>
          <button className="exit-cockpit" onClick={onExit}>
            EXIT COCKPIT
          </button>
        </div>
      </header>
      <CockpitMonitor
        telemetry={telemetry}
        analysis={analysis}
        apiStatus={apiStatus}
      />
    </div>
  );
}

/* =========================================================
   MAIN APPLICATION
========================================================= */

export default function App() {
  const [cockpitSelected, setCockpitSelected] = useState(false);
  const [activeView, setActiveView] = useState("flight");
  const [telemetry, setTelemetry] = useState({
    altitude: 35000,
    airspeed: 452,
    vertical_speed: 320,
    pitch: 1.2,
    roll: 2.1,
    heading: 274,
    flight_phase: "CRUISE",
  });
  const [analysis, setAnalysis] = useState({
    anomaly_score: 8,
    severity: "NORMAL",
    affected_parameters: [],
    explanation: "Waiting for telemetry.",
    model_version: "local-simulation",
    data_quality: [],
  });
  const [apiStatus, setApiStatus] = useState(false);

  useEffect(() => {
    let tick = 0;
    const updateTelemetry = async () => {
      tick += 1;
      const wave = Math.sin(tick / 8);
      const sample = {
        flight_id: "SIM-FLT-042",
        aircraft_id: "SIM-AERO-01",
        timestamp: new Date().toISOString(),
        altitude: 35000 + wave * 120,
        airspeed: 452 + Math.sin(tick / 5) * 8,
        vertical_speed: 320 + Math.sin(tick / 7) * 80,
        pitch: 1.2 + wave * 0.4,
        roll: 2.1 + Math.sin(tick / 9) * 2,
        heading: (274 + tick * 0.15) % 360,
        latitude: 40.6413,
        longitude: -73.7781,
        flight_phase: "CRUISE",
      };
      setTelemetry(sample);
      try {
        const response = await fetch("http://localhost:8000/api/inference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sample),
        });
        if (!response.ok) throw new Error("Inference request failed");
        const payload = await response.json();
        setAnalysis(payload.analysis);
        setApiStatus(true);
      } catch {
        setApiStatus(false);
        setAnalysis({
          anomaly_score: 8,
          severity: "NORMAL",
          affected_parameters: [],
          explanation:
            "FastAPI is unavailable; simulated telemetry is shown with local baseline scoring.",
          model_version: "local-simulation",
          data_quality: [],
        });
      }
    };
    updateTelemetry();
    const timer = window.setInterval(updateTelemetry, 3000);
    return () => window.clearInterval(timer);
  }, []);

  if (activeView === "assessment") {
    return <RiskAssessment onBack={() => setActiveView("flight")} />;
  }

  return (
    <div className="aeroguard-app">
      {/* =================================================
          3D SCENE
      ================================================= */}

      <Canvas
        camera={{
          position: [5.2, 2.6, 6.4],
          fov: 42,
          near: 0.1,
          far: 200,
        }}
        dpr={[1, 2]}
      >
        {!cockpitSelected ? (
          <>
            {/* External sky */}

            <color attach="background" args={["#172b3d"]} />

            {/* External lighting */}

            <ambientLight intensity={2} />

            <directionalLight position={[5, 10, 5]} intensity={4} />

            {/* Aircraft */}

            <Aircraft onCockpitClick={() => setCockpitSelected(true)} />

            {/* Clouds */}

            <Cloud position={[-5, 2.5, -6]} scale={0.65} />

            <Cloud position={[6, 1.5, -9]} scale={0.8} />

            <Cloud position={[-5, -1, -12]} scale={0.5} />

            <Cloud position={[7, 3.5, -15]} scale={0.7} />

            {/* External camera */}

            <FlightCamera />
          </>
        ) : (
          /* 3D cockpit */

          <CockpitScene />
        )}
      </Canvas>

      {/* =================================================
          EXTERNAL HUD
      ================================================= */}

      {!cockpitSelected && (
        <>
          <div className="flight-hud">
            <div className="hud-title">AEROGUARD</div>

            <div className="hud-subtitle">AVIATION SAFETY DIGITAL TWIN</div>

            <div className="flight-status">
              <span className="status-dot"></span>
              FLIGHT SIMULATION ACTIVE
            </div>
            <button
              className="assessment-launch"
              onClick={() => setActiveView("assessment")}
            >
              OPEN RISK ASSESSMENT
            </button>
          </div>

          <div className="interaction-hint">
            Click the cockpit window to enter flight deck
          </div>
        </>
      )}

      {/* =================================================
          COCKPIT HUD
      ================================================= */}

      {cockpitSelected && (
        <CockpitDashboard
          onExit={() => setCockpitSelected(false)}
          onRiskAssessment={() => setActiveView("assessment")}
          telemetry={telemetry}
          analysis={analysis}
          apiStatus={apiStatus}
        />
      )}
    </div>
  );
}

/* =========================================================
   PRELOAD
========================================================= */

useGLTF.preload("/models/aircraft.glb");
