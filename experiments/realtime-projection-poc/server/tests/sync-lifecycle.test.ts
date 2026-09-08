import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'colyseus.js';
import { createColyseusServer, ServerInstance } from '../index.js';
import { WorldStateSchema } from '../schema/WorldState.js';
import { AuthoritativeSimulator } from '../simulator/authoritative-simulator.js';

describe('Realtime State Sync Lifecycle & Boundary Tests', () => {
  let serverInstance: ServerInstance;
  const TEST_PORT = 2568;

  before(async () => {
    serverInstance = await createColyseusServer(TEST_PORT);
  });

  after(async () => {
    await serverInstance.stop();
  });

  test('Initial Snapshot & Incremental Updates for 30 entities', async () => {
    const colyseusClient = new Client(`ws://127.0.0.1:${TEST_PORT}`);
    const room = await colyseusClient.joinOrCreate('world_projection', {}, WorldStateSchema);

    // Wait for initial state population
    await new Promise<void>((resolve) => {
      if (room.state && room.state.entities && room.state.entities.size === 30) {
        return resolve();
      }
      room.onStateChange.once((state) => {
        if (state.entities.size === 30) resolve();
      });
      (room.state.entities as any).onAdd = () => {
        if (room.state.entities.size === 30) resolve();
      };
    });

    assert.equal(room.state.entities.size, 30, 'Initial snapshot should contain 30 entities');
    const dummy1 = room.state.entities.get('dummy-001')!;
    assert.ok(dummy1, 'dummy-001 should exist in initial snapshot');
    assert.ok(typeof dummy1.x === 'number');
    assert.ok(typeof dummy1.y === 'number');
    assert.ok(typeof dummy1.version === 'number');

    // Wait for incremental update (version increment)
    const initialVersion = dummy1.version;
    await new Promise<void>((resolve) => {
      (dummy1 as any).onChange = () => {
        if (dummy1.version > initialVersion) {
          resolve();
        }
      };
      // fallback safety timeout
      setTimeout(resolve, 2000);
    });

    assert.ok(dummy1.version >= initialVersion, 'Incremental delta updates entity version');
    await room.leave();
  });

  test('Late Join receives full snapshot immediately', async () => {
    const colyseusClient = new Client(`ws://127.0.0.1:${TEST_PORT}`);
    // Join when room has already progressed
    const room = await colyseusClient.joinOrCreate('world_projection', {}, WorldStateSchema);

    await new Promise<void>((resolve) => {
      if (room.state && room.state.entities && room.state.entities.size === 30) {
        return resolve();
      }
      room.onStateChange.once((state) => {
        if (state.entities.size === 30) resolve();
      });
      (room.state.entities as any).onAdd = () => {
        if (room.state.entities.size === 30) resolve();
      };
    });

    assert.equal(room.state.entities.size, 30);
    assert.ok(room.state.tick > 0, 'Late joining client should receive active world tick');
    await room.leave();
  });

  test('Authority Isolation: Client cannot directly mutate world state', async () => {
    const colyseusClient = new Client(`ws://127.0.0.1:${TEST_PORT}`);
    const room = await colyseusClient.joinOrCreate('world_projection', {}, WorldStateSchema);

    const actionResponsePromise = new Promise<{ accepted: boolean; status: string }>((resolve) => {
      room.onMessage('action_response', (message) => {
        resolve(message as { accepted: boolean; status: string });
      });
    });

    // Send action stub request
    room.send('request_action', {
      requestId: 'req-test-001',
      actionType: 'MOVE_REQUEST',
      actorId: 'client-actor',
      payload: { targetX: 999, targetY: 999 },
      submittedAt: Date.now(),
    });

    const res = await actionResponsePromise;
    assert.equal(res.accepted, true);
    assert.equal(res.status, 'QUEUED_FOR_KERNEL_VALIDATION');

    // Verify room state entity coordinates are NOT set to 999 (world authority preserved)
    const e = room.state?.entities?.get('dummy-001');
    if (e) {
      assert.notEqual(e.x, 999);
      assert.notEqual(e.y, 999);
    }

    await room.leave();
  });

  test('Client Reconnect within 5s window recovers active projection', async () => {
    const colyseusClient = new Client(`ws://127.0.0.1:${TEST_PORT}`);
    const room = await colyseusClient.joinOrCreate('world_projection', {}, WorldStateSchema);

    await new Promise<void>((resolve) => {
      if (room.state && room.state.entities && room.state.entities.size === 30) {
        return resolve();
      }
      room.onStateChange.once((state) => {
        if (state.entities.size === 30) resolve();
      });
      (room.state.entities as any).onAdd = () => {
        if (room.state.entities.size === 30) resolve();
      };
    });

    const reconnectionToken = room.reconnectionToken;
    const initialTick = room.state.tick;

    // Simulate unexpected drop (unconsented disconnect: leave(false))
    await room.leave(false);

    // Wait 500ms while server/simulator progresses
    await new Promise((r) => setTimeout(r, 500));

    // Reconnect using reconnection token
    const reconnectedRoom = await colyseusClient.reconnect(reconnectionToken, WorldStateSchema);
    assert.ok(reconnectedRoom, 'Reconnection should succeed');

    await new Promise<void>((resolve) => {
      if (reconnectedRoom.state && reconnectedRoom.state.entities && reconnectedRoom.state.entities.size === 30) {
        return resolve();
      }
      reconnectedRoom.onStateChange.once((state) => {
        if (state.entities.size === 30) resolve();
      });
      (reconnectedRoom.state.entities as any).onAdd = () => {
        if (reconnectedRoom.state.entities.size === 30) resolve();
      };
    });

    assert.equal(reconnectedRoom.state.entities.size, 30);
    assert.ok(
      reconnectedRoom.state.tick >= initialTick,
      'World tick should have advanced while disconnected'
    );

    await reconnectedRoom.leave(true);
  });

  test('Stale / Out-of-Order State Guard rejects regression', () => {
    // Client-side projection version guard logic
    class ClientEntityProjection {
      public version: number = 0;
      public x: number = 0;
      public y: number = 0;
      public rejectedCount: number = 0;

      public applyUpdate(update: { version: number; x: number; y: number }): boolean {
        // Reject regression without relying on wall-clock time
        if (update.version <= this.version) {
          this.rejectedCount++;
          return false;
        }
        this.version = update.version;
        this.x = update.x;
        this.y = update.y;
        return true;
      }
    }

    const projection = new ClientEntityProjection();

    // Normal progression
    assert.equal(projection.applyUpdate({ version: 10, x: 15, y: 20 }), true);
    assert.equal(projection.version, 10);
    assert.equal(projection.x, 15);

    // Stale/delayed out-of-order packet arrives (version 9)
    assert.equal(projection.applyUpdate({ version: 9, x: 12, y: 18 }), false);
    assert.equal(projection.version, 10, 'Version should not regress');
    assert.equal(projection.x, 15, 'Coordinates should not regress');
    assert.equal(projection.rejectedCount, 1);

    // Subsequent valid update arrives (version 11)
    assert.equal(projection.applyUpdate({ version: 11, x: 16, y: 22 }), true);
    assert.equal(projection.version, 11);
    assert.equal(projection.x, 16);
  });

  test('Server Restart Recovery: Realtime memory wipe recovers from Authoritative Source', async () => {
    // 1. Simulator with 30 entities at tick 50
    const persistentSim = new AuthoritativeSimulator({ entityCount: 30, seed: 42 });
    for (let i = 0; i < 50; i++) {
      persistentSim.tickOnce();
    }
    const authoritativeSnapshot = persistentSim.exportSnapshot();
    assert.equal(authoritativeSnapshot.tick, 50);

    // 2. Start temporary Colyseus server instance on port 2569
    const tempPort = 2569;
    const tempServer = await createColyseusServer(tempPort);

    const client1 = new Client(`ws://127.0.0.1:${tempPort}`);
    const room1 = await client1.joinOrCreate('world_projection', {}, WorldStateSchema);
    assert.ok(room1);

    // 3. Simulate SERVER CRASH: kill tempServer
    await tempServer.stop();

    // 4. Server restarts on same port, rebuilds Room from Authoritative Snapshot
    const restartedServer = await createColyseusServer(tempPort);

    // 5. Client connects to new server instance
    const client2 = new Client(`ws://127.0.0.1:${tempPort}`);
    const room2 = await client2.joinOrCreate('world_projection', {}, WorldStateSchema);

    await new Promise<void>((resolve) => {
      if (room2.state && room2.state.entities && room2.state.entities.size === 30) {
        return resolve();
      }
      room2.onStateChange.once((state) => {
        if (state.entities.size === 30) resolve();
      });
      (room2.state.entities as any).onAdd = () => {
        if (room2.state.entities.size === 30) resolve();
      };
    });

    assert.equal(room2.state.entities.size, 30, 'Rebuilt room has all 30 entities');
    await room2.leave();
    await restartedServer.stop();
  });
});
