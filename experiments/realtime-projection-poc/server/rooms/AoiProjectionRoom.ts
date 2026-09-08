/**
 * AOI Projection Room
 * 
 * Supports two broadcast modes for comparative benchmarking:
 * 1. Global Broadcast: sends all entity updates to all clients (O(N * M)).
 * 2. AOI Broadcast: filters updates by client spatial interest set via SpatialGrid.
 */

import { Room, Client } from '@colyseus/core';
import { Schema, type } from '@colyseus/schema';
import { AuthoritativeSimulator } from '../simulator/authoritative-simulator.js';
import { SpatialGrid } from '../aoi/spatial-grid.js';
import { DummyEntity } from '../simulator/types.js';

export class MinimalAoiStateSchema extends Schema {
  @type('number') tick: number = 0;
  @type('number') totalEntities: number = 100;
}

export interface ClientInterest {
  viewX: number;
  viewY: number;
  viewRadius: number;
  visibleEntities: Set<string>;
}

export class AoiProjectionRoom extends Room<MinimalAoiStateSchema> {
  private simulator!: AuthoritativeSimulator;
  private spatialGrid: SpatialGrid = new SpatialGrid({ cellSize: 20 });
  private clientInterests: Map<string, ClientInterest> = new Map();
  private broadcastMode: 'global' | 'aoi' = 'aoi';

  // Benchmark Metrics
  public stats = {
    globalMode: {
      messagesSent: 0,
      bytesEstimated: 0,
      tickCount: 0,
      totalTickTimeMs: 0,
    },
    aoiMode: {
      messagesSent: 0,
      bytesEstimated: 0,
      tickCount: 0,
      totalTickTimeMs: 0,
    },
  };

  public onCreate(options: { mode?: 'global' | 'aoi'; entityCount?: number }): void {
    this.setState(new MinimalAoiStateSchema());
    this.broadcastMode = options.mode ?? 'aoi';
    const entityCount = options.entityCount ?? 100;

    this.simulator = new AuthoritativeSimulator({
      entityCount,
      tickRateHz: 20,
      worldBounds: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
    });
    this.simulator.start();

    // Listen to client viewport messages
    this.onMessage('viewport', (client, message: { x: number; y: number; radius: number }) => {
      const interest = this.clientInterests.get(client.sessionId);
      if (interest) {
        interest.viewX = message.x;
        interest.viewY = message.y;
        interest.viewRadius = message.radius;
      }
    });

    this.onMessage('set_mode', (client, message: { mode: 'global' | 'aoi' }) => {
      this.broadcastMode = message.mode;
      client.send('mode_changed', { mode: this.broadcastMode });
    });

    // Run tick broadcast loop at 20Hz (50ms)
    this.setSimulationInterval((_deltaTime) => {
      this.handleTick();
    }, 50);
  }

  public onJoin(client: Client, options: { viewX?: number; viewY?: number; radius?: number }): void {
    this.clientInterests.set(client.sessionId, {
      viewX: options.viewX ?? 0,
      viewY: options.viewY ?? 0,
      viewRadius: options.radius ?? 35,
      visibleEntities: new Set(),
    });
  }

  public onLeave(client: Client): void {
    this.clientInterests.delete(client.sessionId);
  }

  private handleTick(): void {
    const startTime = performance.now();
    this.state.tick = this.simulator.getTick();
    const allEntities = this.simulator.getAllEntities();

    // Rebuild spatial grid
    this.spatialGrid.rebuild(allEntities);

    if (this.broadcastMode === 'global') {
      // Global broadcast: serialize all 100 entities to every client
      const payload = {
        tick: this.state.tick,
        entities: allEntities.map((e) => ({
          id: e.entityId,
          x: e.x,
          y: e.y,
          h: e.heading,
          act: e.activityState,
          v: e.version,
        })),
      };
      const jsonStr = JSON.stringify(payload);
      const byteSize = Buffer.byteLength(jsonStr, 'utf8');

      for (const client of this.clients) {
        client.send('entities_update', payload);
        this.stats.globalMode.messagesSent++;
        this.stats.globalMode.bytesEstimated += byteSize;
      }

      const elapsed = performance.now() - startTime;
      this.stats.globalMode.tickCount++;
      this.stats.globalMode.totalTickTimeMs += elapsed;
    } else {
      // AOI broadcast: query visible entities for each client
      const entityMap = new Map<string, DummyEntity>(allEntities.map((e) => [e.entityId, e]));

      for (const client of this.clients) {
        const interest = this.clientInterests.get(client.sessionId);
        if (!interest) continue;

        const visibleIds = this.spatialGrid.queryRadius(
          interest.viewX,
          interest.viewY,
          interest.viewRadius
        );

        const visibleEntities: DummyEntity[] = [];
        for (const id of visibleIds) {
          const e = entityMap.get(id);
          if (e) visibleEntities.push(e);
        }

        const payload = {
          tick: this.state.tick,
          entities: visibleEntities.map((e) => ({
            id: e.entityId,
            x: e.x,
            y: e.y,
            h: e.heading,
            act: e.activityState,
            v: e.version,
          })),
        };

        const jsonStr = JSON.stringify(payload);
        const byteSize = Buffer.byteLength(jsonStr, 'utf8');

        client.send('entities_update', payload);
        this.stats.aoiMode.messagesSent++;
        this.stats.aoiMode.bytesEstimated += byteSize;
      }

      const elapsed = performance.now() - startTime;
      this.stats.aoiMode.tickCount++;
      this.stats.aoiMode.totalTickTimeMs += elapsed;
    }
  }

  public setMode(mode: 'global' | 'aoi'): void {
    this.broadcastMode = mode;
  }

  public onDispose(): void {
    if (this.simulator) {
      this.simulator.stop();
    }
  }
}
