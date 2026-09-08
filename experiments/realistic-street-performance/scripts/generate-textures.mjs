import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const body = Buffer.concat([t, data]);
    let crc = 0xffffffff;
    for (let i = 0; i < body.length; i++) {
      crc ^= body[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc, 0);
    return Buffer.concat([len, body, c]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const scanlines = [];
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    scanlines.push(Buffer.from([0]));
    scanlines.push(rgbaBuffer.subarray(y * stride, (y + 1) * stride));
  }
  const rawData = Buffer.concat(scanlines);
  const idatData = deflateSync(rawData, { level: 6 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function makeNoise(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const outDir = fileURLToPath(new URL('../public/textures', import.meta.url));

// 1. Asphalt Diffuse (512x512)
{
  const W = 512, H = 512;
  const buf = Buffer.alloc(W * H * 4);
  const rand = makeNoise(42);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const n = (rand() - 0.5) * 28;
      const speck = rand() > 0.94 ? 25 : (rand() < 0.04 ? -20 : 0);
      const base = Math.min(255, Math.max(0, Math.floor(48 + n + speck)));
      buf[idx] = base;
      buf[idx + 1] = Math.floor(base * 0.98);
      buf[idx + 2] = Math.floor(base * 0.95);
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'asphalt_diffuse.png'), createPng(W, H, buf));
}

// 2. Asphalt Normal (512x512)
{
  const W = 512, H = 512;
  const buf = Buffer.alloc(W * H * 4);
  const rand = makeNoise(99);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const nx = Math.floor(128 + (rand() - 0.5) * 22);
      const ny = Math.floor(128 + (rand() - 0.5) * 22);
      buf[idx] = nx;
      buf[idx + 1] = ny;
      buf[idx + 2] = 255;
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'asphalt_normal.png'), createPng(W, H, buf));
}

// 3. Sidewalk Pavers Diffuse & Tactile Paving (512x512)
{
  const W = 512, H = 512;
  const buf = Buffer.alloc(W * H * 4);
  const rand = makeNoise(1337);
  const tileSize = 64;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const isGroove = (x % tileSize < 2) || (y % tileSize < 2);
      const isTactileZone = x >= 320 && x < 448;
      const n = (rand() - 0.5) * 16;
      if (isTactileZone) {
        const barX = (x - 320) % 32;
        const isBar = barX >= 8 && barX < 24;
        const col = isBar ? 210 : 180;
        buf[idx] = Math.min(255, Math.floor(col + n));
        buf[idx + 1] = Math.min(255, Math.floor((col - 30) + n));
        buf[idx + 2] = Math.min(255, Math.floor(40 + n));
      } else if (isGroove) {
        buf[idx] = 110;
        buf[idx + 1] = 110;
        buf[idx + 2] = 106;
      } else {
        const base = Math.min(255, Math.floor(175 + n));
        buf[idx] = base;
        buf[idx + 1] = Math.floor(base * 0.98);
        buf[idx + 2] = Math.floor(base * 0.95);
      }
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'sidewalk_diffuse.png'), createPng(W, H, buf));
}

// 4. Cafe Facade Diffuse (512x512) - Warm wood slats
{
  const W = 512, H = 512;
  const buf = Buffer.alloc(W * H * 4);
  const rand = makeNoise(777);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const slatY = y % 32;
      const isGroove = slatY < 3;
      const woodNoise = (rand() - 0.5) * 20;
      if (isGroove) {
        buf[idx] = 70;
        buf[idx + 1] = 45;
        buf[idx + 2] = 30;
      } else {
        buf[idx] = Math.min(255, Math.max(0, Math.floor(165 + woodNoise)));
        buf[idx + 1] = Math.min(255, Math.max(0, Math.floor(115 + woodNoise * 0.8)));
        buf[idx + 2] = Math.min(255, Math.max(0, Math.floor(75 + woodNoise * 0.6)));
      }
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'facade_coffee_diffuse.png'), createPng(W, H, buf));
}

// 5. Convenience Store Facade Diffuse (512x512)
{
  const W = 512, H = 512;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (y < 120) {
        if (y < 40) {
          buf[idx] = 220; buf[idx + 1] = 60; buf[idx + 2] = 40;
        } else if (y < 80) {
          buf[idx] = 245; buf[idx + 1] = 245; buf[idx + 2] = 240;
        } else {
          buf[idx] = 35; buf[idx + 1] = 145; buf[idx + 2] = 75;
        }
      } else {
        const shelf = Math.floor((y - 120) / 48);
        const inShelfY = (y - 120) % 48;
        if (inShelfY < 6) {
          buf[idx] = 80; buf[idx + 1] = 85; buf[idx + 2] = 90;
        } else {
          const itemCol = (Math.floor(x / 24) + shelf * 7) % 5;
          const colors = [
            [210, 60, 50], [50, 150, 220], [220, 190, 40], [60, 170, 70], [180, 100, 210]
          ];
          const [r, g, b] = colors[itemCol];
          buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b;
        }
      }
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'facade_store_diffuse.png'), createPng(W, H, buf));
}

// 6. Residential Facade Diffuse (512x512)
{
  const W = 512, H = 512;
  const buf = Buffer.alloc(W * H * 4);
  const rand = makeNoise(2026);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const winX = x % 128;
      const winY = y % 128;
      const isWindow = winX >= 28 && winX < 100 && winY >= 32 && winY < 104;
      const isMullion = isWindow && ((Math.abs(winX - 64) < 3) || (Math.abs(winY - 68) < 3));
      const n = (rand() - 0.5) * 12;
      if (isMullion) {
        buf[idx] = 70; buf[idx + 1] = 72; buf[idx + 2] = 74;
      } else if (isWindow) {
        const warm = (Math.floor(x / 128) + Math.floor(y / 128)) % 2 === 0;
        buf[idx] = warm ? 210 : 85;
        buf[idx + 1] = warm ? 180 : 105;
        buf[idx + 2] = warm ? 130 : 125;
      } else {
        const base = Math.floor(190 + n);
        buf[idx] = base;
        buf[idx + 1] = Math.floor(base * 0.98);
        buf[idx + 2] = Math.floor(base * 0.94);
      }
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'facade_residential_diffuse.png'), createPng(W, H, buf));
}

// 7. Office Glass Facade (512x512)
{
  const W = 512, H = 512;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const isMullion = (x % 64 < 4) || (y % 64 < 4);
      if (isMullion) {
        buf[idx] = 50; buf[idx + 1] = 55; buf[idx + 2] = 60;
      } else {
        buf[idx] = 65; buf[idx + 1] = 95; buf[idx + 2] = 110;
      }
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'facade_office_diffuse.png'), createPng(W, H, buf));
}

// 8. AC Outdoor Unit (256x256)
{
  const W = 256, H = 256;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const cx = 150, cy = 128, r = 70;
      const dist = Math.hypot(x - cx, y - cy);
      const isFanGrill = dist < r && (Math.floor(dist) % 8 < 2 || Math.abs(x - cx) < 2 || Math.abs(y - cy) < 2);
      if (isFanGrill) {
        buf[idx] = 40; buf[idx + 1] = 42; buf[idx + 2] = 45;
      } else if (dist < r) {
        buf[idx] = 75; buf[idx + 1] = 78; buf[idx + 2] = 82;
      } else {
        buf[idx] = 220; buf[idx + 1] = 222; buf[idx + 2] = 220;
      }
      buf[idx + 3] = 255;
    }
  }
  writeFileSync(join(outDir, 'ac_unit_diffuse.png'), createPng(W, H, buf));
}

// 9. Rain Particle Texture (64x64)
{
  const W = 64, H = 64;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const dx = Math.abs(x - 32);
      const alphaX = Math.max(0, 1 - dx / 3);
      const alphaY = 1 - Math.abs(y - 32) / 32;
      const alpha = Math.floor(Math.min(1, alphaX * alphaY) * 220);
      buf[idx] = 210;
      buf[idx + 1] = 225;
      buf[idx + 2] = 240;
      buf[idx + 3] = alpha;
    }
  }
  writeFileSync(join(outDir, 'rain_streak.png'), createPng(W, H, buf));
}

// 10. Manhole Cover (256x256)
{
  const W = 256, H = 256;
  const buf = Buffer.alloc(W * H * 4);
  const cx = 128, cy = 128, R = 118;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const d = Math.hypot(x - cx, y - cy);
      if (d > R) {
        buf[idx] = 48; buf[idx + 1] = 46; buf[idx + 2] = 44; buf[idx + 3] = 0;
      } else {
        const ring = Math.floor(d) % 18 < 3;
        const angle = Math.atan2(y - cy, x - cx);
        const spoke = Math.abs(Math.sin(angle * 8)) < 0.12;
        const val = (ring || spoke) ? 100 : 65;
        buf[idx] = val; buf[idx + 1] = val; buf[idx + 2] = val; buf[idx + 3] = 255;
      }
    }
  }
  writeFileSync(join(outDir, 'manhole_diffuse.png'), createPng(W, H, buf));
}

console.log('All 10 PBR textures generated successfully in', outDir);
