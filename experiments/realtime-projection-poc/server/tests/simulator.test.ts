import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AuthoritativeSimulator } from '../simulator/authoritative-simulator.js';

describe('AuthoritativeSimulator (30 & 100 Dummy Entities)', () => {
  test('initializes 30 deterministic entities with fixed seed', () => {
    const sim1 = new AuthoritativeSimulator({ seed: 42, entityCount: 30 });
    const sim2 = new AuthoritativeSimulator({ seed: 42, entityCount: 30 });

    const entities1 = sim1.getAllEntities();
    const entities2 = sim2.getAllEntities();

    assert.equal(entities1.length, 30);
    assert.equal(entities2.length, 30);

    for (let i = 0; i < 30; i++) {
      assert.equal(entities1[i].entityId, entities2[i].entityId);
      assert.equal(entities1[i].x, entities2[i].x);
      assert.equal(entities1[i].y, entities2[i].y);
      assert.equal(entities1[i].heading, entities2[i].heading);
      assert.equal(entities1[i].activityState, entities2[i].activityState);
      assert.equal(entities1[i].version, 1);
    }
  });

  test('ticks advance coordinates and monotonic version', () => {
    const sim = new AuthoritativeSimulator({ seed: 42, entityCount: 30 });
    const e1Initial = sim.getEntity('dummy-001')!;

    const events = sim.tickOnce();
    assert.ok(events.length > 0);
    assert.equal(sim.getTick(), 1);

    const e1After = sim.getEntity('dummy-001')!;
    assert.ok(e1After.version >= e1Initial.version);
  });

  test('exports and imports snapshot accurately', () => {
    const sim = new AuthoritativeSimulator({ seed: 42, entityCount: 30 });
    for (let i = 0; i < 10; i++) {
      sim.tickOnce();
    }

    const snapshot = sim.exportSnapshot();
    assert.equal(snapshot.tick, 10);
    assert.equal(snapshot.totalEntities, 30);

    const restoredSim = new AuthoritativeSimulator({ seed: 999, entityCount: 30 });
    restoredSim.importSnapshot(snapshot);

    assert.equal(restoredSim.getTick(), 10);
    assert.deepEqual(restoredSim.getAllEntities(), sim.getAllEntities());
  });

  test('scales to 100 entities for AOI/stress testing', () => {
    const sim = new AuthoritativeSimulator({ seed: 42, entityCount: 100 });
    const entities = sim.getAllEntities();
    assert.equal(entities.length, 100);
    assert.equal(entities[99].entityId, 'dummy-100');
  });
});
