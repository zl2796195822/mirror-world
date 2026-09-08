import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { WeatherType, ZoneId } from '../types';
import {
  getAsphaltMaterial,
  getSidewalkMaterial,
  getCafeMaterial,
  getStoreMaterial,
  getOfficeGlassMaterial,
  getResidentialPlasterMaterial,
  getManholeMaterial,
  roadMarkingYellowMaterial,
  roadMarkingWhiteMaterial,
  crosswalkWhiteMaterial,
  curbStoneMaterial,
} from '../materials';

function StreetMarkings() {
  const crosswalks = Array.from({ length: 9 }, (_, index) => index);
  return (
    <group position={[0, 0.02, 0]}>
      {/* East-West Crosswalks */}
      {crosswalks.map((i) => (
        <mesh key={`cw-ew-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-14 + i * 3.5, 0.002, -10]}>
          <planeGeometry args={[1.8, 8]} />
          <primitive object={crosswalkWhiteMaterial} />
        </mesh>
      ))}
      {crosswalks.map((i) => (
        <mesh key={`cw-ew2-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-14 + i * 3.5, 0.002, 10]}>
          <planeGeometry args={[1.8, 8]} />
          <primitive object={crosswalkWhiteMaterial} />
        </mesh>
      ))}

      {/* North-South Crosswalks */}
      {crosswalks.map((i) => (
        <mesh key={`cw-ns-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0.003, -14 + i * 3.5]}>
          <planeGeometry args={[8, 1.8]} />
          <primitive object={crosswalkWhiteMaterial} />
        </mesh>
      ))}
      {crosswalks.map((i) => (
        <mesh key={`cw-ns2-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[10, 0.003, -14 + i * 3.5]}>
          <planeGeometry args={[8, 1.8]} />
          <primitive object={crosswalkWhiteMaterial} />
        </mesh>
      ))}

      {/* Yellow Double Center Lines along X Axis */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -0.15]}>
        <planeGeometry args={[290, 0.2]} />
        <primitive object={roadMarkingYellowMaterial} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.15]}>
        <planeGeometry args={[290, 0.2]} />
        <primitive object={roadMarkingYellowMaterial} />
      </mesh>

      {/* White Lane Divider Lines along X Axis */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 4.5]}>
        <planeGeometry args={[290, 0.15]} />
        <primitive object={roadMarkingWhiteMaterial} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -4.5]}>
        <planeGeometry args={[290, 0.15]} />
        <primitive object={roadMarkingWhiteMaterial} />
      </mesh>

      {/* Yellow Double Center Lines along Z Axis */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.15, 0.004, 0]}>
        <planeGeometry args={[0.2, 290]} />
        <primitive object={roadMarkingYellowMaterial} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.004, 0]}>
        <planeGeometry args={[0.2, 290]} />
        <primitive object={roadMarkingYellowMaterial} />
      </mesh>
    </group>
  );
}

// Zone A: Core Crossroads, Coffee Shop, Convenience Store, Stairs & Ramp
export function ZoneA({ weather }: { weather: WeatherType }) {
  const cafeMat = useMemo(() => getCafeMaterial(weather), [weather]);
  const storeMat = useMemo(() => getStoreMaterial(), []);
  const manholeMat = useMemo(() => getManholeMaterial(weather), [weather]);

  return (
    <group data-testid="zone-a-group">
      {/* Manhole covers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0.025, 4.5]} material={manholeMat}>
        <circleGeometry args={[0.65, 24]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[16, 0.025, -4.5]} material={manholeMat}>
        <circleGeometry args={[0.65, 24]} />
      </mesh>

      {/* Qinghe Coffee Shop (Corner Building) */}
      <group position={[32, 0, 18]}>
        {/* Main Cafe Volume */}
        <mesh castShadow receiveShadow position={[0, 3.2, 0]} material={cafeMat}>
          <boxGeometry args={[24, 6.4, 16]} />
        </mesh>
        {/* Cafe Illuminated Signage */}
        <mesh position={[-6, 4.8, 8.08]}>
          <boxGeometry args={[7, 1.2, 0.15]} />
          <meshStandardMaterial color="#2d2218" roughness={0.5} />
        </mesh>
        <Html position={[-6, 4.8, 8.2]} center distanceFactor={14} className="cafe-sign">
          coffee
        </Html>
        {/* Large Glass Storefront */}
        <mesh position={[-2, 2.2, 8.05]}>
          <boxGeometry args={[14, 3.8, 0.08]} />
          <meshPhysicalMaterial
            color="#ffeacc"
            roughness={0.08}
            transmission={0.88}
            thickness={0.5}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* 3-Step Entrance Staircase for Ecctrl stair climbing test */}
        <group position={[-2, 0, 8.6]}>
          {/* Step 1 */}
          <mesh castShadow receiveShadow position={[0, 0.08, 0.6]} material={curbStoneMaterial}>
            <boxGeometry args={[6, 0.16, 0.6]} />
          </mesh>
          {/* Step 2 */}
          <mesh castShadow receiveShadow position={[0, 0.24, 0.2]} material={curbStoneMaterial}>
            <boxGeometry args={[6, 0.32, 0.6]} />
          </mesh>
          {/* Step 3 (Top landing) */}
          <mesh castShadow receiveShadow position={[0, 0.40, -0.2]} material={curbStoneMaterial}>
            <boxGeometry args={[6, 0.48, 0.6]} />
          </mesh>
        </group>

        {/* Outdoor Deck Seating */}
        <mesh receiveShadow position={[8, 0.1, 10.5]} material={cafeMat}>
          <boxGeometry args={[6, 0.2, 5]} />
        </mesh>
        {/* Cafe Table */}
        <mesh castShadow position={[8, 0.75, 10.5]}>
          <cylinderGeometry args={[0.8, 0.8, 0.08, 16]} />
          <meshStandardMaterial color="#4a362a" roughness={0.7} />
        </mesh>
      </group>

      {/* Shiguang Convenience Store */}
      <group position={[62, 0, 20]}>
        <mesh castShadow receiveShadow position={[0, 3.2, 0]} material={storeMat}>
          <boxGeometry args={[18, 6.4, 14]} />
        </mesh>
        <Html position={[0, 5.2, 7.15]} center distanceFactor={14} className="store-sign">
          拾光便利 · 24H
        </Html>
      </group>

      {/* 15-degree Sidewalk Ramp for Ecctrl slope test */}
      <group position={[-16, 0, 14]}>
        {/* Inclined ramp surface (length 6m, height 0.6m -> ~15% slope) */}
        <mesh
          receiveShadow
          rotation={[0.15, 0, 0]}
          position={[0, 0.25, 0]}
          material={curbStoneMaterial}
        >
          <boxGeometry args={[3.2, 0.2, 5.8]} />
        </mesh>
      </group>

      {/* Narrow Alleyway (1.8m clearance) between Cafe and adjacent structure */}
      <group position={[17, 0, 18]}>
        <mesh castShadow position={[-1.2, 3, 0]}>
          <boxGeometry args={[0.5, 6, 16]} />
          <meshStandardMaterial color="#8a8780" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[1.2, 3, 0]}>
          <boxGeometry args={[0.5, 6, 16]} />
          <meshStandardMaterial color="#8a8780" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// Zone B: North District (Office Tower, Residential Apartments)
export function ZoneB({ weather }: { weather: WeatherType }) {
  const officeMat = useMemo(() => getOfficeGlassMaterial(weather), [weather]);
  const resMat = useMemo(() => getResidentialPlasterMaterial(weather), [weather]);

  return (
    <group data-testid="zone-b-group">
      {/* 6-Story Commercial Glass Curtain Office Building */}
      <group position={[58, 0, -56]}>
        <mesh castShadow receiveShadow position={[0, 16, 0]} material={officeMat}>
          <boxGeometry args={[42, 32, 30]} />
        </mesh>
        <Html position={[0, 32.5, 0]} center distanceFactor={22} className="building-label">
          临江商务中心 · 六层办公楼
        </Html>
      </group>

      {/* 5-Story Residential Building A */}
      <group position={[-56, 0, -58]}>
        <mesh castShadow receiveShadow position={[0, 11, 0]} material={resMat}>
          <boxGeometry args={[44, 22, 26]} />
        </mesh>
        <Html position={[0, 22.5, 0]} center distanceFactor={20} className="building-label">
          青禾公寓 · 1号楼
        </Html>
      </group>

      {/* Residential Building B */}
      <group position={[0, 0, -85]}>
        <mesh castShadow receiveShadow position={[0, 9, 0]} material={resMat}>
          <boxGeometry args={[36, 18, 22]} />
        </mesh>
      </group>
    </group>
  );
}

// Zone C: South District (Pocket Park, Bus Station, South Building)
export function ZoneC({ weather }: { weather: WeatherType }) {
  const resMat = useMemo(() => getResidentialPlasterMaterial(weather), [weather]);

  return (
    <group data-testid="zone-c-group">
      {/* Pocket Park Lawn & Paths */}
      <group position={[-60, 0, 60]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[48, 44]} />
          <meshStandardMaterial color={weather === 'rain' ? '#3d523b' : '#577553'} roughness={0.96} />
        </mesh>
        {/* Park Bench */}
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[3.6, 0.4, 0.8]} />
          <meshStandardMaterial color="#6a4f3b" roughness={0.8} />
        </mesh>
        <Html position={[0, 2.5, 0]} center distanceFactor={18} className="park-label">
          青禾社区小公园
        </Html>
      </group>

      {/* Qinghe Road Bus Station */}
      <group position={[-32, 0, 10.5]}>
        {/* Station Shelter Canopy */}
        <mesh castShadow position={[0, 2.8, 0]}>
          <boxGeometry args={[16, 0.25, 3.8]} />
          <meshStandardMaterial color="#364048" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Station Back Glass Panel */}
        <mesh position={[0, 1.4, -1.8]}>
          <boxGeometry args={[15.6, 2.6, 0.08]} />
          <meshPhysicalMaterial
            color="#d8e8f2"
            roughness={0.1}
            transmission={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
        {/* Waiting Bench */}
        <mesh castShadow position={[0, 0.45, -0.6]}>
          <boxGeometry args={[8, 0.4, 0.7]} />
          <meshStandardMaterial color="#50565b" roughness={0.6} />
        </mesh>
        {/* Transit Arrival LED Display Board */}
        <mesh position={[6, 2.3, 0]}>
          <boxGeometry args={[2.4, 0.7, 0.15]} />
          <meshStandardMaterial color="#1a1c1e" />
        </mesh>
        <Html position={[6, 2.3, 0.12]} center distanceFactor={10} className="bus-arrival-screen">
          101路: 2站 · 304路: 5站
        </Html>
      </group>

      {/* South Residential Building */}
      <group position={[45, 0, 68]}>
        <mesh castShadow receiveShadow position={[0, 10, 0]} material={resMat}>
          <boxGeometry args={[38, 20, 24]} />
        </mesh>
      </group>
    </group>
  );
}

// Ground & Road Base (Shared 300m x 300m foundation)
export function StreetGround({ weather }: { weather: WeatherType }) {
  const asphaltMat = useMemo(() => getAsphaltMaterial(weather), [weather]);
  const sidewalkMat = useMemo(() => getSidewalkMaterial(weather), [weather]);

  return (
    <group position={[0, 0, 0]}>
      {/* 300m x 300m Base Terrain */}
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[300, 1, 300]} />
        <meshStandardMaterial color="#82857f" roughness={0.95} />
      </mesh>

      {/* East-West Asphalt Main Avenue (18m wide x 300m long) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={asphaltMat}>
        <planeGeometry args={[300, 18]} />
      </mesh>

      {/* North-South Asphalt Cross Avenue (18m wide x 300m long) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={asphaltMat}>
        <planeGeometry args={[18, 300]} />
      </mesh>

      {/* North Sidewalk Pavers (7m wide) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, -13.5]} material={sidewalkMat}>
        <planeGeometry args={[300, 9]} />
      </mesh>

      {/* South Sidewalk Pavers (7m wide) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 13.5]} material={sidewalkMat}>
        <planeGeometry args={[300, 9]} />
      </mesh>

      {/* West Sidewalk Pavers (7m wide) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-13.5, 0.018, 0]} material={sidewalkMat}>
        <planeGeometry args={[9, 300]} />
      </mesh>

      {/* East Sidewalk Pavers (7m wide) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[13.5, 0.018, 0]} material={sidewalkMat}>
        <planeGeometry args={[9, 300]} />
      </mesh>

      {/* Road Markings */}
      <StreetMarkings />
    </group>
  );
}

// Static Rapier Colliders for physical player interaction
export function StaticWorldColliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Ground plane collider */}
      <CuboidCollider args={[200, 10, 200]} position={[0, -10, 0]} />

      {/* Curbs along North & South sidewalks (0.15m high) */}
      <CuboidCollider args={[150, 0.1, 0.2]} position={[0, 0.1, 9.1]} />
      <CuboidCollider args={[150, 0.1, 0.2]} position={[0, 0.1, -9.1]} />
      <CuboidCollider args={[0.2, 0.1, 150]} position={[9.1, 0.1, 0]} />
      <CuboidCollider args={[0.2, 0.1, 150]} position={[-9.1, 0.1, 0]} />

      {/* Cafe building collider */}
      <CuboidCollider args={[12, 3.2, 8]} position={[32, 3.2, 18]} />

      {/* Cafe Entrance 3-Step Staircase Colliders */}
      <CuboidCollider args={[3, 0.08, 0.3]} position={[30, 0.08, 27.2]} />
      <CuboidCollider args={[3, 0.16, 0.3]} position={[30, 0.24, 26.8]} />
      <CuboidCollider args={[3, 0.24, 0.3]} position={[30, 0.40, 26.4]} />

      {/* Sidewalk Ramp Collider (15 degree slope approximation) */}
      <CuboidCollider args={[1.6, 0.15, 2.8]} position={[-16, 0.25, 14]} rotation={[0.15, 0, 0]} />

      {/* Narrow Alleyway Colliders (1.8m clearance) */}
      <CuboidCollider args={[0.25, 3, 8]} position={[15.8, 3, 18]} />
      <CuboidCollider args={[0.25, 3, 8]} position={[18.2, 3, 18]} />

      {/* Convenience store collider */}
      <CuboidCollider args={[9, 3.2, 7]} position={[62, 3.2, 20]} />

      {/* Office building collider */}
      <CuboidCollider args={[21, 16, 15]} position={[58, 16, -56]} />

      {/* Apartment A collider */}
      <CuboidCollider args={[22, 11, 13]} position={[-56, 11, -58]} />

      {/* Apartment B collider */}
      <CuboidCollider args={[18, 9, 11]} position={[0, 9, -85]} />

      {/* South Building collider */}
      <CuboidCollider args={[19, 10, 12]} position={[45, 10, 68]} />
    </RigidBody>
  );
}
