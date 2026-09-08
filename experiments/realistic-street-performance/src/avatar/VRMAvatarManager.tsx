import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, type VRMHumanBoneName } from '@pixiv/three-vrm';
import type { LODLevel } from '../types';
import type { EcctrlHandle } from 'ecctrl';

const VRM_URL = '/models/VRM1_Constraint_Twist_Sample.vrm';

// Deterministic waypoint paths for 30 actors
export type ActorState = {
  id: string;
  index: number;
  position: THREE.Vector3;
  heading: number;
  mode: 'walk' | 'idle';
  speed: number;
  pathStartX: number;
  pathEndX: number;
  zLane: number;
  phaseOffset: number;
  currentLOD: LODLevel;
  distanceToPlayer: number;
};

export function createDeterministicActors(count: number): ActorState[] {
  const actors: ActorState[] = [];
  for (let i = 0; i < count; i++) {
    const isIdle = i >= 25; // Last 5 actors idle at cafe / bus stop
    const phaseOffset = (i * 0.53) % (2 * Math.PI);
    let startX: number;
    let endX: number;
    let z: number;
    if (i < 10) {
      z = -12.5; // North sidewalk
      startX = -80 + i * 16;
      endX = 80;
    } else if (i < 20) {
      z = 12.5; // South sidewalk
      startX = 80 - (i - 10) * 16;
      endX = -80;
    } else if (i < 25) {
      // Crossroads patrol
      z = -10 + (i - 20) * 5;
      startX = -15 + (i - 20) * 7;
      endX = 15;
    } else {
      // Idle spots: cafe deck, bus stop, park
      const idleSpots = [
        [34, 18],    // Cafe deck
        [36, 20],    // Cafe outdoor table
        [-32, 10.5], // Bus stop bench
        [-60, 58],   // Park path
        [-58, 62],   // Park lawn
      ];
      const spot = idleSpots[i - 25] || [0, 12];
      startX = spot[0];
      z = spot[1];
      endX = spot[0];
    }

    actors.push({
      id: `VRM_ACTOR_${String(i + 1).padStart(2, '0')}`,
      index: i,
      position: new THREE.Vector3(startX, 0.02, z),
      heading: i < 10 ? Math.PI / 2 : -Math.PI / 2,
      mode: isIdle ? 'idle' : 'walk',
      speed: isIdle ? 0 : 1.4 + (i % 3) * 0.25,
      pathStartX: startX,
      pathEndX: endX,
      zLane: z,
      phaseOffset,
      currentLOD: 'lod0',
      distanceToPlayer: 0,
    });
  }
  return actors;
}

// Low-poly proxy representation for LOD2 (far distance)
function LowPolyActorProxy({ actor }: { actor: ActorState }) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => {
    const palette = ['#b8977e', '#6d8396', '#879e7e', '#9e7e89', '#96916d'];
    return palette[actor.index % palette.length];
  }, [actor.index]);

  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(actor.position);
    group.current.rotation.y = actor.heading;
  });

  return (
    <group ref={group}>
      {/* Body capsule */}
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.26, 0.72, 4, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.48, 0]}>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshBasicMaterial color="#dfcfbe" />
      </mesh>
    </group>
  );
}

// Full VRM Avatar instance (for LOD0 and LOD1)
function VRMAvatarInstance({
  actor,
  vrmAsset,
  lod,
}: {
  actor: ActorState;
  vrmAsset: VRM;
  lod: LODLevel;
}) {
  const rootRef = useRef<THREE.Group>(null);
  // Clone VRM scene hierarchy for this actor instance
  const clonedScene = useMemo(() => {
    const clone = vrmAsset.scene.clone(true);
    // Scale appropriately (VRM sample height ~1.5m)
    clone.scale.setScalar(1.0);
    return clone;
  }, [vrmAsset]);

  const frameCounter = useRef(0);

  // Bone rotation animation
  useFrame((state, delta) => {
    if (!rootRef.current) return;
    rootRef.current.position.copy(actor.position);
    rootRef.current.rotation.y = actor.heading;

    // LOD1 Optimization: Throttle skeletal updates to save CPU!
    frameCounter.current += 1;
    if (lod === 'lod1' && frameCounter.current % 3 !== 0) {
      return; // skip 2 out of 3 frames
    }

    const t = state.clock.getElapsedTime();
    const walking = actor.mode === 'walk';
    const phase = walking ? t * 7.5 + actor.phaseOffset : t * 1.8 + actor.phaseOffset;

    // Direct humanoid bone animation
    const getBone = (name: VRMHumanBoneName) => vrmAsset.humanoid?.getNormalizedBoneNode(name);

    if (walking) {
      const stride = Math.sin(phase);
      const opposite = Math.sin(phase + Math.PI);
      const leftLeg = getBone('leftUpperLeg');
      const rightLeg = getBone('rightUpperLeg');
      const leftLower = getBone('leftLowerLeg');
      const rightLower = getBone('rightLowerLeg');
      const leftArm = getBone('leftUpperArm');
      const rightArm = getBone('rightUpperArm');

      if (leftLeg) leftLeg.rotation.x = opposite * 0.45;
      if (rightLeg) rightLeg.rotation.x = stride * 0.45;
      if (leftLower) leftLower.rotation.x = Math.max(0, stride) * 0.55;
      if (rightLower) rightLower.rotation.x = Math.max(0, opposite) * 0.55;
      if (leftArm) leftArm.rotation.x = -stride * 0.35;
      if (rightArm) rightArm.rotation.x = -opposite * 0.35;
    } else {
      // Idle breathing
      const breath = Math.sin(phase) * 0.04;
      const spine = getBone('spine');
      if (spine) spine.rotation.x = breath;
    }

    vrmAsset.update(delta);
  });

  return (
    <group ref={rootRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

export function VRMAvatarManager({
  count,
  lodEnabled,
  controller,
  onLODReport,
}: {
  count: number;
  lodEnabled: boolean;
  controller: MutableRefObject<EcctrlHandle | null>;
  onLODReport: (counts: { lod0: number; lod1: number; lod2: number }) => void;
}) {
  const [baseVrm, setBaseVrm] = useState<VRM | null>(null);
  const actors = useMemo(() => createDeterministicActors(count), [count]);
  const [actorLODs, setActorLODs] = useState<Record<string, LODLevel>>({});

  // Load shared VRM asset
  useEffect(() => {
    let active = true;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      VRM_URL,
      (gltf) => {
        if (!active) return;
        const vrm = gltf.userData.vrm as VRM;
        setBaseVrm(vrm);
      },
      undefined,
      (err) => console.error('Failed to load test VRM sample:', err)
    );
    return () => {
      active = false;
    };
  }, []);

  // Update actor positions along deterministic paths
  useFrame((_, delta) => {
    for (const actor of actors) {
      if (actor.mode === 'walk') {
        const dir = Math.sign(actor.pathEndX - actor.pathStartX);
        actor.position.x += dir * actor.speed * delta;
        actor.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;

        // Turn around at endpoints
        if (dir > 0 && actor.position.x >= actor.pathEndX) {
          actor.pathStartX = actor.pathEndX;
          actor.pathEndX = -actor.pathEndX;
        } else if (dir < 0 && actor.position.x <= actor.pathEndX) {
          actor.pathStartX = actor.pathEndX;
          actor.pathEndX = -actor.pathEndX;
        }
      }
    }
  });

  // Calculate distances and assign Visual LODs
  useFrame((state) => {
    const playerPos = controller.current?.currPos ?? state.camera.position;
    let lod0Count = 0;
    let lod1Count = 0;
    let lod2Count = 0;

    const newLODMap: Record<string, LODLevel> = {};

    if (!lodEnabled) {
      // Force All Full VRM stress mode (no LOD)
      for (const actor of actors) {
        newLODMap[actor.id] = 'lod0';
        lod0Count++;
      }
    } else {
      // Dynamic Visual LOD:
      // Compute distance to each actor
      for (const actor of actors) {
        actor.distanceToPlayer = actor.position.distanceTo(playerPos);
      }
      // Sort actors by distance
      const sorted = [...actors].sort((a, b) => a.distanceToPlayer - b.distanceToPlayer);

      // Closest 5 actors get LOD0 (Full VRM) if within 25m
      // Next actors up to 40m get LOD1 (Throttled VRM)
      // All actors further than 40m get LOD2 (Low-poly proxy)
      sorted.forEach((actor, rank) => {
        let assigned: LODLevel;
        if (rank < 5 && actor.distanceToPlayer < 25) {
          assigned = 'lod0';
          lod0Count++;
        } else if (actor.distanceToPlayer < 45) {
          assigned = 'lod1';
          lod1Count++;
        } else {
          assigned = 'lod2';
          lod2Count++;
        }
        newLODMap[actor.id] = assigned;
      });
    }

    onLODReport({ lod0: lod0Count, lod1: lod1Count, lod2: lod2Count });
  });

  if (!baseVrm) return null;

  return (
    <group data-testid="vrm-avatars-root">
      {actors.map((actor) => {
        const lod = actorLODs[actor.id] ?? 'lod0';
        if (lod === 'lod2') {
          return <LowPolyActorProxy key={actor.id} actor={actor} />;
        }
        return (
          <VRMAvatarInstance
            key={actor.id}
            actor={actor}
            vrmAsset={baseVrm}
            lod={lod}
          />
        );
      })}
    </group>
  );
}
