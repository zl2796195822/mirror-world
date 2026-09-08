import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Ecctrl, type EcctrlHandle } from 'ecctrl';
import * as THREE from 'three';

import type { WeatherType, ZoneId, RuntimeMetrics, CompressionSampleResult } from './types';
import { WeatherSystem } from './weather/WeatherSystem';
import { StreetGround, StaticWorldColliders } from './components/BuildingsAndStreet';
import { StreetInstancedProps } from './components/StreetInstancedProps';
import { ZoneManager } from './streaming/ZoneManager';
import { VRMAvatarManager } from './avatar/VRMAvatarManager';
import { DebugUI } from './components/DebugUI';
import { runCompressionBenchmark } from './compression/CompressionBenchmark';

function parseUrlParams(): {
  weather: WeatherType;
  actors: number;
  lod: boolean;
  instancing: boolean;
} {
  const params = new URLSearchParams(window.location.search);
  const rawWeather = params.get('weather');
  const weather: WeatherType =
    rawWeather === 'night' || rawWeather === 'rain' ? rawWeather : 'day';

  const rawActors = Number(params.get('actors') ?? 5);
  const actors = [0, 5, 15, 30].includes(rawActors) ? rawActors : 5;

  const lod = params.get('lod') !== 'false';
  const instancing = params.get('instancing') !== 'false';

  return { weather, actors, lod, instancing };
}

function MetricsCollector({
  metricsRef,
  onFirstScene,
}: {
  metricsRef: MutableRefObject<RuntimeMetrics>;
  onFirstScene: (ms: number) => void;
}) {
  const { gl } = useThree();
  const frameTimes = useRef<number[]>([]);
  const elapsed = useRef(0);
  const hasReportedFirstScene = useRef(false);

  useFrame((_, delta) => {
    if (!hasReportedFirstScene.current) {
      hasReportedFirstScene.current = true;
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const t = performance.now() - (nav?.startTime ?? 0);
      onFirstScene(t);
    }

    const frameMs = delta * 1000;
    frameTimes.current.push(frameMs);
    if (frameTimes.current.length > 90) frameTimes.current.shift();

    elapsed.current += delta;
    if (elapsed.current < 0.2) return; // refresh every 200ms
    elapsed.current = 0;

    // Calculate average and P95
    const sorted = [...frameTimes.current].sort((a, b) => a - b);
    const avg = sorted.reduce((sum, v) => sum + v, 0) / (sorted.length || 1);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Idx] ?? avg;

    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;

    metricsRef.current = {
      ...metricsRef.current,
      fps: 1 / Math.max(delta, 0.0001),
      frameTimeMs: avg,
      p95FrameTimeMs: p95,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      textures: gl.info.memory.textures,
      geometries: gl.info.memory.geometries,
      memoryMb: memory ? memory.usedJSHeapSize / (1024 * 1024) : null,
    };
  });

  return null;
}

function CameraFollow({ controller }: { controller: MutableRefObject<EcctrlHandle | null> }) {
  const { camera, gl } = useThree();
  const yaw = useRef(-0.75);
  const pitch = useRef(0.28);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointer.current || pointer.current.id !== e.pointerId) return;
      yaw.current -= (e.clientX - pointer.current.x) * 0.007;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - (e.clientY - pointer.current.y) * 0.005,
        0.12,
        0.85
      );
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
    };
    const onPointerUp = () => {
      pointer.current = null;
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const rawPos = controller.current?.currPos ?? new THREE.Vector3(0, 1.5, 28);
    const pos = { x: rawPos.x, y: Math.max(rawPos.y, 1.2), z: rawPos.z };
    target.set(
      pos.x - Math.sin(yaw.current) * 3.5,
      pos.y + 1.4,
      pos.z - Math.cos(yaw.current) * 3.5
    );
    const radius = 13.5;
    desired.set(
      target.x + Math.sin(yaw.current) * Math.cos(pitch.current) * radius,
      target.y + Math.sin(pitch.current) * radius,
      target.z + Math.cos(yaw.current) * Math.cos(pitch.current) * radius
    );
    camera.position.lerp(desired, 1 - Math.exp(-9 * delta));
    camera.lookAt(target.x, target.y, target.z);
  });

  return null;
}

function Player({ controller }: { controller: MutableRefObject<EcctrlHandle | null> }) {
  return (
    <Ecctrl
      ref={controller}
      position={[0, 2, 28]}
      capsuleHalfHeight={0.45}
      capsuleRadius={0.38}
      floatHeight={0.06}
      maxWalkVel={4.2}
      maxRunVel={7.5}
      groundDetection="shapeCast"
      slopeMaxAngle={Math.PI / 4}
      autoBalance={false}
      applyCounterMoveImp={false}
      applyCounterMass={false}
    >
      <group>
        <mesh castShadow position={[0, 1.1, 0]}>
          <capsuleGeometry args={[0.38, 1.25, 8, 16]} />
          <meshStandardMaterial color="#c2c7cb" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 2.05, 0]}>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color="#d4c2b0" roughness={0.85} />
        </mesh>
      </group>
    </Ecctrl>
  );
}

function KeyboardControls({ controller }: { controller: MutableRefObject<EcctrlHandle | null> }) {
  useEffect(() => {
    const keys = new Set<string>();
    const update = () => {
      controller.current?.setMovement({
        forward: keys.has('KeyW') || keys.has('ArrowUp'),
        backward: keys.has('KeyS') || keys.has('ArrowDown'),
        leftward: keys.has('KeyA') || keys.has('ArrowLeft'),
        rightward: keys.has('KeyD') || keys.has('ArrowRight'),
        run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        jump: keys.has('Space'),
      });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'].includes(
          e.code
        )
      ) {
        e.preventDefault();
        keys.add(e.code);
        update();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
      update();
    };
    const onBlur = () => {
      keys.clear();
      update();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [controller]);

  return null;
}

function BenchmarkBridge({
  triggerRef,
  onResults,
}: {
  triggerRef: MutableRefObject<(() => void) | null>;
  onResults: (r: CompressionSampleResult[]) => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    triggerRef.current = async () => {
      const res = await runCompressionBenchmark(gl);
      onResults(res);
    };
  }, [gl, onResults, triggerRef]);
  return null;
}

export default function App() {
  const initialParams = useMemo(parseUrlParams, []);
  const [weather, setWeather] = useState<WeatherType>(initialParams.weather);
  const [actorCount, setActorCount] = useState<number>(initialParams.actors);
  const [lodEnabled, setLodEnabled] = useState<boolean>(initialParams.lod);
  const [instancingEnabled, setInstancingEnabled] = useState<boolean>(initialParams.instancing);
  const [compressionResults, setCompressionResults] = useState<CompressionSampleResult[] | null>(null);

  const controller = useRef<EcctrlHandle | null>(null);
  const benchTriggerRef = useRef<(() => void) | null>(null);

  const metricsRef = useRef<RuntimeMetrics>({
    fps: 0,
    frameTimeMs: 0,
    p95FrameTimeMs: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    memoryMb: null,
    loadTimeMs: null,
    firstSceneMs: null,
    activeZones: ['zone-a'],
    vrmCount: actorCount,
    lodCounts: { lod0: 0, lod1: 0, lod2: 0 },
    weather: initialParams.weather,
    instancingEnabled: initialParams.instancing,
    lodEnabled: initialParams.lod,
  });

  const [metricsSnapshot, setMetricsSnapshot] = useState<RuntimeMetrics>(metricsRef.current);

  // Measure initial page load time
  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const id = requestAnimationFrame(() => {
      const load = performance.now() - (nav?.startTime ?? 0);
      metricsRef.current.loadTimeMs = load;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Poll metrics for UI
  useEffect(() => {
    const id = setInterval(() => {
      setMetricsSnapshot({
        ...metricsRef.current,
        weather,
        vrmCount: actorCount,
        lodEnabled,
        instancingEnabled,
      });
    }, 400);
    return () => clearInterval(id);
  }, [weather, actorCount, lodEnabled, instancingEnabled]);

  const handleZoneChange = (zones: ZoneId[]) => {
    metricsRef.current.activeZones = zones;
  };

  const handleLODReport = (counts: { lod0: number; lod1: number; lod2: number }) => {
    metricsRef.current.lodCounts = counts;
  };

  const handleFirstScene = (ms: number) => {
    metricsRef.current.firstSceneMs = ms;
  };

  return (
    <main className="experiment-shell">
      <Canvas
        shadows="basic"
        dpr={[1, 1.5]}
        camera={{ position: [14, 8, 22], fov: 46, near: 0.1, far: 380 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        data-testid="world-canvas"
      >
        <Physics gravity={[0, -9.81, 0]} timeStep="vary">
          <WeatherSystem weather={weather} />
          <StreetGround weather={weather} />
          <StreetInstancedProps instancingEnabled={instancingEnabled} />
          <ZoneManager
            weather={weather}
            controller={controller}
            onZoneChange={handleZoneChange}
          />
          <StaticWorldColliders />
          <Player controller={controller} />
          <VRMAvatarManager
            count={actorCount}
            lodEnabled={lodEnabled}
            controller={controller}
            onLODReport={handleLODReport}
          />
          <CameraFollow controller={controller} />
          <MetricsCollector metricsRef={metricsRef} onFirstScene={handleFirstScene} />
          <BenchmarkBridge triggerRef={benchTriggerRef} onResults={setCompressionResults} />
        </Physics>
      </Canvas>

      <KeyboardControls controller={controller} />

      <DebugUI
        metrics={metricsSnapshot}
        onWeatherChange={setWeather}
        onActorCountChange={setActorCount}
        onToggleInstancing={() => setInstancingEnabled((v) => !v)}
        onToggleLOD={() => setLodEnabled((v) => !v)}
        onRunCompression={() => benchTriggerRef.current?.()}
        compressionResults={compressionResults}
        controller={controller}
      />
    </main>
  );
}
