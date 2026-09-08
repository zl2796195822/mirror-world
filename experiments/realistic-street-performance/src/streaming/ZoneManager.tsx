import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WeatherType, ZoneId } from '../types';
import { ZoneA, ZoneB, ZoneC } from '../components/BuildingsAndStreet';
import type { EcctrlHandle } from 'ecctrl';

type ZoneManagerProps = {
  weather: WeatherType;
  controller: MutableRefObject<EcctrlHandle | null>;
  onZoneChange: (zones: ZoneId[]) => void;
};

export function ZoneManager({ weather, controller, onZoneChange }: ZoneManagerProps) {
  // Spawn is at (0, 2, 28) in Zone A.
  // Initial state: Only Zone A is loaded!
  const [activeZones, setActiveZones] = useState<ZoneId[]>(['zone-a']);
  const lastPos = useRef(new THREE.Vector3(0, 0, 28));

  useFrame(() => {
    const pos = controller.current?.currPos;
    if (!pos) return;

    // Check distance / z thresholds with hysteresis
    const z = pos.z;
    const x = pos.x;

    let needB = false;
    let needC = false;

    // Approaching North (Zone B): trigger when z < 5
    if (z < 5) needB = true;
    // Approaching South (Zone C): trigger when z > 15 || x < -20
    if (z > 15 || x < -20) needC = true;

    // Zone A is central and stays active while near center
    const newZones: ZoneId[] = ['zone-a'];
    if (needB) newZones.push('zone-b');
    if (needC) newZones.push('zone-c');

    // Only update state if set of active zones changed
    if (
      newZones.length !== activeZones.length ||
      !newZones.every((zid) => activeZones.includes(zid))
    ) {
      setActiveZones(newZones);
      onZoneChange(newZones);
    }
  });

  return (
    <group data-testid="streaming-zones-root">
      {activeZones.includes('zone-a') && <ZoneA weather={weather} />}
      {activeZones.includes('zone-b') && <ZoneB weather={weather} />}
      {activeZones.includes('zone-c') && <ZoneC weather={weather} />}
    </group>
  );
}
