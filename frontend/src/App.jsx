import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
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

function Cloud({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>

      <mesh position={[0.8, 0.1, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>

      <mesh position={[-0.7, 0.05, 0]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
    </group>
  );
}

/* =========================================================
   EXTERNAL CAMERA
========================================================= */

function FlightCamera() {
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
  useFrame((state) => {
    /*
     * Pilot eye position.
     * Looking forward through the windshield.
     */
    state.camera.position.set(0, 1.75, 3.4);

    state.camera.lookAt(0, 2.25, -5);
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
      {/* Outside sky */}

      <mesh position={[0, 3.0, -5.2]}>
        <planeGeometry args={[7.8, 3.0]} />

        <meshBasicMaterial color="#285873" />
      </mesh>

      {/* Lower horizon */}

      <mesh position={[0, 2.35, -5.15]}>
        <planeGeometry args={[7.8, 0.08]} />

        <meshBasicMaterial color="#8bb9cd" />
      </mesh>

      {/* Left windshield frame */}

      <mesh position={[-3.85, 2.75, -5]}>
        <boxGeometry args={[0.18, 3.6, 0.25]} />

        <CockpitMaterial color="#151c23" roughness={0.45} />
      </mesh>

      {/* Right windshield frame */}

      <mesh position={[3.85, 2.75, -5]}>
        <boxGeometry args={[0.18, 3.6, 0.25]} />

        <CockpitMaterial color="#151c23" roughness={0.45} />
      </mesh>

      {/* Center windshield pillar */}

      <mesh position={[0, 2.75, -5]}>
        <boxGeometry args={[0.14, 3.6, 0.25]} />

        <CockpitMaterial color="#151c23" roughness={0.45} />
      </mesh>

      {/* Top frame */}

      <mesh position={[0, 4.45, -5]}>
        <boxGeometry args={[8, 0.22, 0.25]} />

        <CockpitMaterial color="#111820" roughness={0.45} />
      </mesh>

      {/* Bottom windshield frame */}

      <mesh position={[0, 1.45, -4.9]}>
        <boxGeometry args={[8, 0.18, 0.45]} />

        <CockpitMaterial color="#111820" roughness={0.5} />
      </mesh>

      {/* Clouds outside */}

      <Cloud position={[-2.3, 3.15, -5.0]} scale={0.3} />

      <Cloud position={[2.4, 3.35, -5.0]} scale={0.25} />

      <Cloud position={[0.8, 2.8, -5.0]} scale={0.18} />
    </group>
  );
}

/* =========================================================
   COCKPIT INSTRUMENT PANEL
========================================================= */

function InstrumentScreen({ position, size, label }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[size[0], size[1], 0.1]} />

        <meshBasicMaterial color="#06151d" />
      </mesh>

      <mesh position={[0, size[1] * 0.28, -0.06]}>
        <planeGeometry args={[size[0] * 0.65, 0.035]} />

        <meshBasicMaterial color="#16d6ff" />
      </mesh>

      <mesh position={[0, -size[1] * 0.22, -0.06]}>
        <planeGeometry args={[size[0] * 0.42, 0.025]} />

        <meshBasicMaterial color="#2ee57a" />
      </mesh>

      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[size[0] * 0.18, 0.025]} />

        <meshBasicMaterial color="#d9efff" />
      </mesh>

      <mesh position={[0, -size[1] * 0.4, -0.06]}>
        <planeGeometry args={[size[0] * 0.55, 0.018]} />

        <meshBasicMaterial color="#607887" />
      </mesh>
    </group>
  );
}

function ControlPanel() {
  return (
    <group>
      {/* Main panel */}

      <mesh position={[0, 1.0, 1.65]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[7.8, 1.75, 1.15]} />

        <CockpitMaterial color="#151d24" roughness={0.65} metalness={0.15} />
      </mesh>

      {/* Left PFD */}

      <InstrumentScreen
        position={[-2.25, 1.38, 1.03]}
        size={[1.65, 1.05]}
        label="PFD"
      />

      {/* Center avionics */}

      <InstrumentScreen
        position={[0, 1.43, 0.95]}
        size={[2.15, 1.25]}
        label="NAV"
      />

      {/* Right engine display */}

      <InstrumentScreen
        position={[2.25, 1.38, 1.03]}
        size={[1.65, 1.05]}
        label="ENG"
      />

      {/* Small switches */}

      {[-2.7, -2.25, -1.8, 1.8, 2.25, 2.7].map((x) => (
        <mesh key={x} position={[x, 0.48, 1.45]}>
          <cylinderGeometry args={[0.055, 0.055, 0.15, 12]} />

          <CockpitMaterial color="#4b5964" roughness={0.45} />
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

        <CockpitMaterial color="#242d35" roughness={0.8} />
      </mesh>

      {/* Seat */}

      <mesh position={[0, 0.32, 0.15]}>
        <boxGeometry args={[1.45, 0.65, 1.15]} />

        <CockpitMaterial color="#242d35" roughness={0.8} />
      </mesh>

      {/* Headrest */}

      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[0.95, 0.45, 0.55]} />

        <CockpitMaterial color="#303a43" roughness={0.8} />
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

function CockpitDashboard({ onExit }) {
  return (
    <div className="cockpit-dashboard">
      {/* Top header */}

      <header className="cockpit-header">
        <div>
          <div className="cockpit-title">AEROGUARD</div>

          <div className="cockpit-subtitle">FLIGHT DECK SAFETY MONITOR</div>
        </div>

        <button className="exit-cockpit" onClick={onExit}>
          EXIT COCKPIT
        </button>
      </header>

      {/* Right AI panel */}

      <section className="safety-panel">
        <div className="panel-title">AI FLIGHT SAFETY ANALYSIS</div>

        <div className="safety-row">
          <span>FLIGHT STATUS</span>
          <b className="normal">NORMAL</b>
        </div>

        <div className="safety-row">
          <span>TRAJECTORY</span>
          <b className="normal">STABLE</b>
        </div>

        <div className="safety-row">
          <span>ANOMALY SCORE</span>
          <b>0.08</b>
        </div>

        <div className="safety-row">
          <span>ENGINE STATUS</span>
          <b className="normal">NOMINAL</b>
        </div>
      </section>

      {/* Bottom telemetry */}

      <section className="flight-instruments">
        <div className="instrument-card">
          <span>ALTITUDE</span>
          <strong>35,000</strong>
          <small>FT</small>
        </div>

        <div className="instrument-card">
          <span>AIRSPEED</span>
          <strong>452</strong>
          <small>KT</small>
        </div>

        <div className="instrument-card">
          <span>VERTICAL SPEED</span>
          <strong>+320</strong>
          <small>FT/MIN</small>
        </div>

        <div className="instrument-card">
          <span>HEADING</span>
          <strong>274°</strong>
          <small>MAG</small>
        </div>
      </section>

      {/* AI status */}

      <div className="ai-status">
        <span className="ai-dot"></span>
        AI MONITORING ACTIVE
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APPLICATION
========================================================= */

export default function App() {
  const [cockpitSelected, setCockpitSelected] = useState(false);

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
        <CockpitDashboard onExit={() => setCockpitSelected(false)} />
      )}
    </div>
  );
}

/* =========================================================
   PRELOAD
========================================================= */

useGLTF.preload("/models/aircraft.glb");
