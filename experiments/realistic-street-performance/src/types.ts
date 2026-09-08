export type WeatherType = 'day' | 'night' | 'rain';

export type LODLevel = 'lod0' | 'lod1' | 'lod2';

export type ZoneId = 'zone-a' | 'zone-b' | 'zone-c';

export type RuntimeMetrics = {
  fps: number;
  frameTimeMs: number;
  p95FrameTimeMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  memoryMb: number | null;
  loadTimeMs: number | null;
  firstSceneMs: number | null;
  activeZones: ZoneId[];
  vrmCount: number;
  lodCounts: { lod0: number; lod1: number; lod2: number };
  weather: WeatherType;
  instancingEnabled: boolean;
  lodEnabled: boolean;
};

export type CompressionSampleResult = {
  name: string;
  type: 'texture' | 'geometry';
  format: string;
  rawBytes: number;
  loadTimeMs: number;
  notes: string;
};
