import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WeatherType } from '../types';

function RainParticles() {
  const count = 2400;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    // Deterministic distribution over 160m x 160m around center
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 180;
      pos[i * 3 + 1] = rand() * 45;
      pos[i * 3 + 2] = (rand() - 0.5) * 180;
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;
    const speed = 48; // m/s downwards
    const fall = speed * delta;
    for (let i = 0; i < count; i++) {
      let y = array[i * 3 + 1] - fall;
      if (y < 0.1) {
        y = 40 + (y % 40);
      }
      array[i * 3 + 1] = y;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a8c0d6"
        size={0.28}
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}

export function WeatherSystem({ weather }: { weather: WeatherType }) {
  if (weather === 'night') {
    return (
      <>
        <ambientLight intensity={0.45} color="#1b283d" />
        <directionalLight
          castShadow
          position={[-30, 60, -20]}
          intensity={0.6}
          color="#6582a8"
          shadow-mapSize={[1024, 1024]}
        />
        <hemisphereLight intensity={0.3} color="#263a56" groundColor="#0f1620" />
        <fog attach="fog" args={['#0c1420', 45, 190]} />

        {/* Street lamp pools */}
        <pointLight position={[-20, 7.5, 10]} intensity={14} color="#ffdeaa" distance={26} decay={2} />
        <pointLight position={[20, 7.5, 10]} intensity={14} color="#ffdeaa" distance={26} decay={2} />
        <pointLight position={[-20, 7.5, -10]} intensity={14} color="#ffdeaa" distance={26} decay={2} />
        <pointLight position={[20, 7.5, -10]} intensity={14} color="#ffdeaa" distance={26} decay={2} />

        {/* Coffee shop warm exterior spill */}
        <pointLight position={[32, 3.2, 14]} intensity={22} color="#ffaa55" distance={24} decay={2} />
        {/* Convenience store bright spill */}
        <pointLight position={[62, 3.4, 20]} intensity={25} color="#ffffff" distance={24} decay={2} />
      </>
    );
  }

  if (weather === 'rain') {
    return (
      <>
        <ambientLight intensity={1.3} color="#84929e" />
        <directionalLight
          castShadow
          position={[30, 65, 25]}
          intensity={1.8}
          color="#bcc8d4"
          shadow-mapSize={[1024, 1024]}
        />
        <hemisphereLight intensity={0.6} color="#9aa7b2" groundColor="#4a5258" />
        <fog attach="fog" args={['#7e8b96', 50, 210]} />
        <RainParticles />
      </>
    );
  }

  // Default: Day (overcast southern city)
  return (
    <>
      <ambientLight intensity={1.75} color="#dbe2e6" />
      <directionalLight
        castShadow
        position={[38, 72, 28]}
        intensity={2.7}
        color="#fff4df"
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight intensity={0.7} color="#cdd9e0" groundColor="#69655f" />
      <fog attach="fog" args={['#cfd8df', 85, 260]} />
    </>
  );
}
