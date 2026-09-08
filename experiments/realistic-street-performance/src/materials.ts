import * as THREE from 'three';
import type { WeatherType } from './types';

const loader = new THREE.TextureLoader();

function loadRepeatTexture(url: string, repeatX = 1, repeatY = 1): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const asphaltDiffuse = loadRepeatTexture('/textures/asphalt_diffuse.png', 12, 12);
const asphaltNormal = loadRepeatTexture('/textures/asphalt_normal.png', 12, 12);
const sidewalkDiffuse = loadRepeatTexture('/textures/sidewalk_diffuse.png', 8, 8);
const cafeDiffuse = loadRepeatTexture('/textures/facade_coffee_diffuse.png', 2, 2);
const storeDiffuse = loadRepeatTexture('/textures/facade_store_diffuse.png', 1, 1);
const resDiffuse = loadRepeatTexture('/textures/facade_residential_diffuse.png', 2, 4);
const officeDiffuse = loadRepeatTexture('/textures/facade_office_diffuse.png', 3, 6);
const acDiffuse = loadRepeatTexture('/textures/ac_unit_diffuse.png', 1, 1);
const manholeDiffuse = loadRepeatTexture('/textures/manhole_diffuse.png', 1, 1);

export function getAsphaltMaterial(weather: WeatherType) {
  const isRain = weather === 'rain';
  return new THREE.MeshStandardMaterial({
    map: asphaltDiffuse,
    normalMap: asphaltNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: isRain ? 0.08 : 0.84,
    metalness: isRain ? 0.25 : 0.05,
    color: isRain ? '#26292b' : '#3d4245',
  });
}

export function getSidewalkMaterial(weather: WeatherType) {
  const isRain = weather === 'rain';
  return new THREE.MeshStandardMaterial({
    map: sidewalkDiffuse,
    roughness: isRain ? 0.18 : 0.76,
    metalness: isRain ? 0.15 : 0.02,
    color: isRain ? '#9e9c94' : '#c2bfb4',
  });
}

export function getCafeMaterial(weather: WeatherType) {
  return new THREE.MeshStandardMaterial({
    map: cafeDiffuse,
    roughness: weather === 'rain' ? 0.25 : 0.65,
    color: '#d4a373',
  });
}

export function getStoreMaterial() {
  return new THREE.MeshStandardMaterial({
    map: storeDiffuse,
    roughness: 0.4,
    color: '#ffffff',
  });
}

export function getOfficeGlassMaterial(weather: WeatherType) {
  return new THREE.MeshStandardMaterial({
    map: officeDiffuse,
    roughness: weather === 'rain' ? 0.04 : 0.12,
    metalness: 0.85,
    color: '#70909c',
  });
}

export function getResidentialPlasterMaterial(weather: WeatherType) {
  return new THREE.MeshStandardMaterial({
    map: resDiffuse,
    roughness: weather === 'rain' ? 0.35 : 0.85,
    color: '#dddad2',
  });
}

export function getAcUnitMaterial() {
  return new THREE.MeshStandardMaterial({
    map: acDiffuse,
    roughness: 0.5,
    metalness: 0.3,
  });
}

export function getManholeMaterial(weather: WeatherType) {
  return new THREE.MeshStandardMaterial({
    map: manholeDiffuse,
    roughness: weather === 'rain' ? 0.15 : 0.7,
    metalness: 0.65,
  });
}

export const roadMarkingYellowMaterial = new THREE.MeshBasicMaterial({ color: '#f3ca3e' });
export const roadMarkingWhiteMaterial = new THREE.MeshBasicMaterial({ color: '#e8e8df' });
export const crosswalkWhiteMaterial = new THREE.MeshStandardMaterial({ color: '#efeee6', roughness: 0.7 });
export const curbStoneMaterial = new THREE.MeshStandardMaterial({ color: '#88847d', roughness: 0.9 });
export const treeFoliageMaterial = new THREE.MeshStandardMaterial({ color: '#3d6346', roughness: 0.95 });
export const treeTrunkMaterial = new THREE.MeshStandardMaterial({ color: '#544338', roughness: 0.98 });
export const streetLampPoleMaterial = new THREE.MeshStandardMaterial({ color: '#323a40', roughness: 0.35, metalness: 0.7 });
