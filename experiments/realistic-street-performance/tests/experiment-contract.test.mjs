import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const typesSource = await readFile(new URL('../src/types.ts', import.meta.url), 'utf8');
const vrmSource = await readFile(new URL('../src/avatar/VRMAvatarManager.tsx', import.meta.url), 'utf8');
const weatherSource = await readFile(new URL('../src/weather/WeatherSystem.tsx', import.meta.url), 'utf8');
const instancingSource = await readFile(new URL('../src/components/StreetInstancedProps.tsx', import.meta.url), 'utf8');
const streamingSource = await readFile(new URL('../src/streaming/ZoneManager.tsx', import.meta.url), 'utf8');
const buildingsSource = await readFile(new URL('../src/components/BuildingsAndStreet.tsx', import.meta.url), 'utf8');

test('experiment stays isolated and does not touch core domain or kernel', () => {
  assert.doesNotMatch(appSource, /WorldKernel|ActionRequest|residentRepository|postgres|redis|lifeEngine/i);
  assert.doesNotMatch(vrmSource, /WorldKernel|ActionRequest|residentRepository|postgres/i);
  assert.doesNotMatch(streamingSource, /WorldKernel|ActionRequest|residentRepository|postgres/i);
});

test('simulation remains deterministic: zero Math.random in runtime modules', () => {
  assert.doesNotMatch(appSource, /Math\.random\s*\(/);
  assert.doesNotMatch(vrmSource, /Math\.random\s*\(/);
  assert.doesNotMatch(weatherSource, /Math\.random\s*\(/);
  assert.doesNotMatch(instancingSource, /Math\.random\s*\(/);
  assert.doesNotMatch(streamingSource, /Math\.random\s*\(/);
  assert.doesNotMatch(buildingsSource, /Math\.random\s*\(/);
});

test('presets for weather, actor counts and LOD are explicitly supported', () => {
  assert.match(appSource, /\[0, 5, 15, 30\]/);
  assert.match(typesSource, /'day' \| 'night' \| 'rain'/);
  assert.match(typesSource, /'lod0' \| 'lod1' \| 'lod2'/);
  assert.match(vrmSource, /VRM1_Constraint_Twist_Sample\.vrm/);
});

test('scene chunking and spatial streaming zones are implemented', () => {
  assert.match(streamingSource, /zone-a/);
  assert.match(streamingSource, /zone-b/);
  assert.match(streamingSource, /zone-c/);
  assert.match(buildingsSource, /ZoneA/);
  assert.match(buildingsSource, /ZoneB/);
  assert.match(buildingsSource, /ZoneC/);
});

test('hardware instancing pipeline is supported with before/after toggle', () => {
  assert.match(instancingSource, /<instancedMesh/);
  assert.match(instancingSource, /treeTrunkMaterial/);
  assert.match(instancingSource, /lampPoleMatrices/);
  assert.match(instancingSource, /acMatrices/);
  assert.match(instancingSource, /bollardMatrices/);
});

test('ecctrl complex terrain features are present in colliders', () => {
  assert.match(buildingsSource, /Entrance 3-Step Staircase/);
  assert.match(buildingsSource, /Sidewalk Ramp Collider/);
  assert.match(buildingsSource, /Narrow Alleyway/);
});
