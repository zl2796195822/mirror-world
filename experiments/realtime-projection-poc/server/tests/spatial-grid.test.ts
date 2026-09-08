import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SpatialGrid } from '../aoi/spatial-grid.js';
import { AuthoritativeSimulator } from '../simulator/authoritative-simulator.js';

describe('SpatialGrid & AOI Filtering', () => {
  test('partitions 100 entities into spatial cells', () => {
    const sim = new AuthoritativeSimulator({ entityCount: 100, seed: 42 });
    const entities = sim.getAllEntities();

    const grid = new SpatialGrid({ cellSize: 20 });
    grid.rebuild(entities);

    assert.ok(grid.getCellCount() > 1, 'Entities should be spread across multiple cells');
  });

  test('queryRadius filters entities within circle and excludes distant ones', () => {
    const grid = new SpatialGrid({ cellSize: 10 });
    const entities = [
      { entityId: 'center', x: 0, y: 0, heading: 0, activityState: 'idle' as const, version: 1 },
      { entityId: 'near-10m', x: 7, y: 7, heading: 0, activityState: 'idle' as const, version: 1 }, // dist ~ 9.9m
      { entityId: 'far-25m', x: 25, y: 0, heading: 0, activityState: 'idle' as const, version: 1 }, // dist 25m
      { entityId: 'far-100m', x: 100, y: 100, heading: 0, activityState: 'idle' as const, version: 1 },
    ];

    grid.rebuild(entities);

    const radius15 = grid.queryRadius(0, 0, 15);
    assert.ok(radius15.has('center'));
    assert.ok(radius15.has('near-10m'));
    assert.equal(radius15.has('far-25m'), false);
    assert.equal(radius15.has('far-100m'), false);

    const radius30 = grid.queryRadius(0, 0, 30);
    assert.ok(radius30.has('far-25m'));
    assert.equal(radius30.has('far-100m'), false);
  });
});
