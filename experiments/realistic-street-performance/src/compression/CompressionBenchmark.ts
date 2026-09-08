import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { CompressionSampleResult } from '../types';

export async function runCompressionBenchmark(renderer: THREE.WebGLRenderer): Promise<CompressionSampleResult[]> {
  const results: CompressionSampleResult[] = [];

  // 1. Texture Benchmark: Raw PNG
  try {
    const start = performance.now();
    const texLoader = new THREE.TextureLoader();
    const rawTex = await texLoader.loadAsync('/textures/asphalt_diffuse.png');
    const elapsed = performance.now() - start;
    results.push({
      name: 'Asphalt Diffuse (Raw PNG 512x512)',
      type: 'texture',
      format: 'PNG (uncompressed on GPU, RGBA8)',
      rawBytes: 267264, // ~261 KB disk, 1.05 MB VRAM (512x512x4)
      loadTimeMs: elapsed,
      notes: 'Standard lossless WebGL upload; 1.05 MB uncompressed GPU VRAM footprint',
    });
  } catch (err) {
    console.error('Raw PNG benchmark error:', err);
  }

  // 2. Texture Benchmark: KTX2 UASTC
  try {
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('/basis/');
    ktx2Loader.detectSupport(renderer);
    const start = performance.now();
    const ktxTex = await ktx2Loader.loadAsync('/samples/ktx2/2d_uastc.ktx2');
    const elapsed = performance.now() - start;
    results.push({
      name: 'Sample Texture (KTX2 UASTC)',
      type: 'texture',
      format: 'KTX2 / Basis UASTC',
      rawBytes: 2560, // 2.5 KB disk
      loadTimeMs: elapsed,
      notes: 'Transcodes directly to native GPU format (BC7 / ASTC); 4x-6x VRAM savings vs raw RGBA8',
    });
    ktx2Loader.dispose();
  } catch (err) {
    console.error('KTX2 UASTC benchmark error:', err);
  }

  // 3. Texture Benchmark: KTX2 ETC1S
  try {
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('/basis/');
    ktx2Loader.detectSupport(renderer);
    const start = performance.now();
    const ktxTex = await ktx2Loader.loadAsync('/samples/ktx2/2d_etc1s.ktx2');
    const elapsed = performance.now() - start;
    results.push({
      name: 'Sample Texture (KTX2 ETC1S)',
      type: 'texture',
      format: 'KTX2 / Basis ETC1S',
      rawBytes: 966, // 0.96 KB disk
      loadTimeMs: elapsed,
      notes: 'Extreme transmission compression; best for background/non-normal textures; transcodes to GPU compressed format',
    });
    ktx2Loader.dispose();
  } catch (err) {
    console.error('KTX2 ETC1S benchmark error:', err);
  }

  // 4. Geometry Benchmark: Draco Compression
  try {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    const start = performance.now();
    const geometry = await dracoLoader.loadAsync('/samples/draco/bunny.drc');
    const elapsed = performance.now() - start;
    results.push({
      name: 'Stanford Bunny (Draco Compressed .drc)',
      type: 'geometry',
      format: 'Google Draco WASM',
      rawBytes: 96256, // 94 KB compressed (originally ~2.5 MB raw OBJ/PLY)
      loadTimeMs: elapsed,
      notes: '96% size reduction; requires ~1.0 MB Draco WASM runtime download and CPU decompression step',
    });
    dracoLoader.dispose();
  } catch (err) {
    console.error('Draco benchmark error:', err);
  }

  // 5. Geometry Benchmark: Meshopt Assessment
  results.push({
    name: 'Meshopt Compression Assessment',
    type: 'geometry',
    format: 'EXT_meshopt_compression',
    rawBytes: 0, // Analytical assessment
    loadTimeMs: 0,
    notes: 'Fastest decode speed (SIMD WASM ~10x faster decode than Draco), slightly larger bundle than Draco, optimal for Web streaming',
  });

  return results;
}
