/**
 * Spatial Grid & AOI (Area of Interest)
 * 
 * Based on architectural insights from RES-M2-OSS-001 (OpenClaw World spatial-index.ts):
 * 1. Cell-based hash map partition of 2D space.
 * 2. Rebuilds index in O(N) per tick for dynamic entities.
 * 3. queryRadius() finds entities in interest set for a client's viewport.
 * 4. Filters broadcasts so clients only receive entities in their field of view.
 */

import { DummyEntity } from '../simulator/types.js';

export interface SpatialGridOptions {
  cellSize?: number; // default 20m
}

export class SpatialGrid {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();
  private entityLookup: Map<string, DummyEntity> = new Map();

  constructor(options: SpatialGridOptions = {}) {
    this.cellSize = options.cellSize ?? 20;
  }

  private cellKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  public rebuild(entities: DummyEntity[]): void {
    this.cells.clear();
    this.entityLookup.clear();

    for (const entity of entities) {
      this.entityLookup.set(entity.entityId, entity);
      const cx = Math.floor(entity.x / this.cellSize);
      const cy = Math.floor(entity.y / this.cellSize);
      const key = this.cellKey(cx, cy);

      let set = this.cells.get(key);
      if (!set) {
        set = new Set();
        this.cells.set(key, set);
      }
      set.add(entity.entityId);
    }
  }

  public queryRadius(x: number, y: number, radius: number): Set<string> {
    const result = new Set<string>();
    const radiusSq = radius * radius;

    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const set = this.cells.get(this.cellKey(cx, cy));
        if (set) {
          for (const entityId of set) {
            const entity = this.entityLookup.get(entityId);
            if (entity) {
              const dx = entity.x - x;
              const dy = entity.y - y;
              if (dx * dx + dy * dy <= radiusSq) {
                result.add(entityId);
              }
            }
          }
        }
      }
    }

    return result;
  }

  public getCellCount(): number {
    return this.cells.size;
  }
}
