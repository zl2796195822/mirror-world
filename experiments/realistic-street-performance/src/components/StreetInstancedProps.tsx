import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  treeTrunkMaterial,
  treeFoliageMaterial,
  streetLampPoleMaterial,
  getAcUnitMaterial,
  curbStoneMaterial,
} from '../materials';

// Tree positions along Qinghe Street and park
const treePositions: Array<[number, number, number, number]> = [
  [-75, 0, 48, 1.2],
  [-51, 0, 49, 1.0],
  [-82, 0, 73, 0.9],
  [25, 0, 36, 0.85],
  [84, 0, 38, 1.15],
  [73, 0, -28, 0.95],
  [-73, 0, -30, 1.1],
  [-45, 0, 12, 1.0],
  [-15, 0, 12, 1.05],
  [15, 0, 12, 0.9],
  [48, 0, 12, 1.1],
  [-45, 0, -12, 1.0],
  [-15, 0, -12, 0.95],
  [15, 0, -12, 1.05],
  [48, 0, -12, 1.0],
  [-95, 0, 25, 1.2],
  [95, 0, -15, 1.1],
  [-60, 0, 85, 0.9],
  [-40, 0, 75, 1.0],
  [-25, 0, 65, 1.1],
];

// Street lamps along the main avenue (both sides)
const lampPositions: Array<[number, number, number, number]> = [
  [-80, 0, 10, 0],
  [-40, 0, 10, 0],
  [0, 0, 10, 0],
  [40, 0, 10, 0],
  [80, 0, 10, 0],
  [-80, 0, -10, Math.PI],
  [-40, 0, -10, Math.PI],
  [0, 0, -10, Math.PI],
  [40, 0, -10, Math.PI],
  [80, 0, -10, Math.PI],
];

// AC units mounted on residential facades
const acUnitPositions: Array<[number, number, number]> = [];
for (let floor = 1; floor <= 4; floor++) {
  const y = floor * 3.8 + 1.2;
  for (let x = -70; x <= -40; x += 6) {
    acUnitPositions.push([x, y, -45.8]); // Apartment A facade
  }
  for (let x = -80; x <= -55; x += 7) {
    acUnitPositions.push([x, y, 78.2]);  // Apartment B facade
  }
}

// Bollards along sidewalk curb edge
const bollardPositions: Array<[number, number, number]> = [];
for (let x = -90; x <= 90; x += 10) {
  if (Math.abs(x) > 12) { // keep crosswalk clear
    bollardPositions.push([x, 0.4, 9.2]);
    bollardPositions.push([x, 0.4, -9.2]);
  }
}

export function StreetInstancedProps({ instancingEnabled }: { instancingEnabled: boolean }) {
  const acMaterial = useMemo(() => getAcUnitMaterial(), []);

  // Pre-compute transform matrices for instanced meshes
  const treeTrunkMatrices = useMemo(() => {
    return treePositions.map(([x, y, z, s]) => {
      const mat = new THREE.Matrix4();
      mat.compose(
        new THREE.Vector3(x, y + 1.4 * s, z),
        new THREE.Quaternion(),
        new THREE.Vector3(s, s, s)
      );
      return mat;
    });
  }, []);

  const treeFoliageMatrices = useMemo(() => {
    return treePositions.map(([x, y, z, s]) => {
      const mat = new THREE.Matrix4();
      mat.compose(
        new THREE.Vector3(x, y + 3.4 * s, z),
        new THREE.Quaternion(),
        new THREE.Vector3(s, s, s)
      );
      return mat;
    });
  }, []);

  const lampPoleMatrices = useMemo(() => {
    return lampPositions.map(([x, y, z, rotY]) => {
      const mat = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      mat.compose(new THREE.Vector3(x, y + 3.5, z), q, new THREE.Vector3(1, 1, 1));
      return mat;
    });
  }, []);

  const acMatrices = useMemo(() => {
    return acUnitPositions.map(([x, y, z]) => {
      const mat = new THREE.Matrix4();
      mat.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      return mat;
    });
  }, []);

  const bollardMatrices = useMemo(() => {
    return bollardPositions.map(([x, y, z]) => {
      const mat = new THREE.Matrix4();
      mat.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      return mat;
    });
  }, []);

  // Refs for InstancedMesh to set matrices
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const lampRef = useRef<THREE.InstancedMesh>(null);
  const acRef = useRef<THREE.InstancedMesh>(null);
  const bollardRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!instancingEnabled) return;
    if (trunkRef.current) {
      treeTrunkMatrices.forEach((mat, i) => trunkRef.current!.setMatrixAt(i, mat));
      trunkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (foliageRef.current) {
      treeFoliageMatrices.forEach((mat, i) => foliageRef.current!.setMatrixAt(i, mat));
      foliageRef.current.instanceMatrix.needsUpdate = true;
    }
    if (lampRef.current) {
      lampPoleMatrices.forEach((mat, i) => lampRef.current!.setMatrixAt(i, mat));
      lampRef.current.instanceMatrix.needsUpdate = true;
    }
    if (acRef.current) {
      acMatrices.forEach((mat, i) => acRef.current!.setMatrixAt(i, mat));
      acRef.current.instanceMatrix.needsUpdate = true;
    }
    if (bollardRef.current) {
      bollardMatrices.forEach((mat, i) => bollardRef.current!.setMatrixAt(i, mat));
      bollardRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [instancingEnabled, treeTrunkMatrices, treeFoliageMatrices, lampPoleMatrices, acMatrices, bollardMatrices]);

  if (instancingEnabled) {
    return (
      <group data-testid="instanced-props-group">
        {/* Tree Trunks */}
        <instancedMesh
          ref={trunkRef}
          args={[undefined, undefined, treePositions.length]}
          castShadow
          material={treeTrunkMaterial}
        >
          <cylinderGeometry args={[0.2, 0.28, 2.8, 8]} />
        </instancedMesh>

        {/* Tree Foliage */}
        <instancedMesh
          ref={foliageRef}
          args={[undefined, undefined, treePositions.length]}
          castShadow
          material={treeFoliageMaterial}
        >
          <sphereGeometry args={[1.5, 10, 8]} />
        </instancedMesh>

        {/* Street Lamps */}
        <instancedMesh
          ref={lampRef}
          args={[undefined, undefined, lampPositions.length]}
          castShadow
          material={streetLampPoleMaterial}
        >
          <cylinderGeometry args={[0.12, 0.16, 7.0, 8]} />
        </instancedMesh>

        {/* AC Units */}
        <instancedMesh
          ref={acRef}
          args={[undefined, undefined, acUnitPositions.length]}
          castShadow
          material={acMaterial}
        >
          <boxGeometry args={[0.85, 0.58, 0.4]} />
        </instancedMesh>

        {/* Bollards */}
        <instancedMesh
          ref={bollardRef}
          args={[undefined, undefined, bollardPositions.length]}
          castShadow
          material={curbStoneMaterial}
        >
          <cylinderGeometry args={[0.12, 0.14, 0.8, 8]} />
        </instancedMesh>
      </group>
    );
  }

  // Non-instanced fallback (each object is its own separate mesh & draw call)
  return (
    <group data-testid="individual-props-group">
      {treePositions.map(([x, y, z, s], i) => (
        <group key={`tree-${i}`} position={[x, y, z]} scale={s}>
          <mesh castShadow position={[0, 1.4, 0]} material={treeTrunkMaterial}>
            <cylinderGeometry args={[0.2, 0.28, 2.8, 8]} />
          </mesh>
          <mesh castShadow position={[0, 3.4, 0]} material={treeFoliageMaterial}>
            <sphereGeometry args={[1.5, 10, 8]} />
          </mesh>
        </group>
      ))}

      {lampPositions.map(([x, y, z, rotY], i) => (
        <group key={`lamp-${i}`} position={[x, y, z]} rotation={[0, rotY, 0]}>
          <mesh castShadow position={[0, 3.5, 0]} material={streetLampPoleMaterial}>
            <cylinderGeometry args={[0.12, 0.16, 7.0, 8]} />
          </mesh>
          <mesh position={[0.8, 6.8, 0]} material={streetLampPoleMaterial}>
            <boxGeometry args={[1.6, 0.18, 0.35]} />
          </mesh>
        </group>
      ))}

      {acUnitPositions.map(([x, y, z], i) => (
        <mesh key={`ac-${i}`} position={[x, y, z]} castShadow material={acMaterial}>
          <boxGeometry args={[0.85, 0.58, 0.4]} />
        </mesh>
      ))}

      {bollardPositions.map(([x, y, z], i) => (
        <mesh key={`bollard-${i}`} position={[x, y, z]} castShadow material={curbStoneMaterial}>
          <cylinderGeometry args={[0.12, 0.14, 0.8, 8]} />
        </mesh>
      ))}
    </group>
  );
}
