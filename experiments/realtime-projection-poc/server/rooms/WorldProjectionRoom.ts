/**
 * World Projection Room (Colyseus Room)
 * 
 * BOUNDARY:
 * Provides the realtime synchronization room for connected clients.
 * Uses @colyseus/schema binary delta compression.
 * Maintains client sessions, handles reconnect, and enforces read-only projection.
 */

import { Room, Client } from '@colyseus/core';
import { WorldStateSchema } from '../schema/WorldState.js';
import { AuthoritativeSimulator } from '../simulator/authoritative-simulator.js';
import { ProjectionAdapter } from '../adapter/projection-adapter.js';
import { ActionRequestStub } from '../simulator/types.js';

export interface RoomInitOptions {
  simulator?: AuthoritativeSimulator;
  reconnectTimeoutSeconds?: number;
}

export class WorldProjectionRoom extends Room<WorldStateSchema> {
  private simulator!: AuthoritativeSimulator;
  private adapter!: ProjectionAdapter;
  private reconnectTimeoutSeconds: number = 5;

  public onCreate(options: RoomInitOptions = {}): void {
    this.autoDispose = false;
    this.setState(new WorldStateSchema());
    this.reconnectTimeoutSeconds = options.reconnectTimeoutSeconds ?? 5;

    // Use provided simulator or create a default 30-entity deterministic simulator
    this.simulator = options.simulator ?? new AuthoritativeSimulator({ entityCount: 30, seed: 42 });
    this.adapter = new ProjectionAdapter(this.simulator, this.state);

    if (!this.simulator.isRunning()) {
      this.simulator.start();
    }

    // Ping / Pong for latency measurement
    this.onMessage('ping', (client, message: { clientTime: number }) => {
      client.send('pong', {
        clientTime: message.clientTime,
        serverTime: Date.now(),
        tick: this.state.tick,
      });
    });

    // Client action request stub (STRICTLY PROHIBITED FROM MUTATING WORLD STATE DIRECTLY)
    this.onMessage('request_action', (client, message: ActionRequestStub) => {
      const result = this.adapter.handleClientActionRequest(client.sessionId, message);
      client.send('action_response', result);
    });

    // Viewport position update (for spatial interest / AOI tracking)
    this.onMessage('viewport', (client, message: { x: number; y: number; radius?: number }) => {
      client.userData = {
        ...(client.userData || {}),
        viewX: message.x,
        viewY: message.y,
        viewRadius: message.radius ?? 40,
      };
    });
  }

  public onJoin(client: Client, _options: Record<string, unknown>): void {
    client.send('welcome', {
      sessionId: client.sessionId,
      tick: this.state.tick,
      totalEntities: this.state.entities.size,
      reconnectTimeoutSeconds: this.reconnectTimeoutSeconds,
    });
  }

  public async onLeave(client: Client, consented: boolean): Promise<void> {
    if (consented) {
      return;
    }

    try {
      // 5-second reconnect allowance window
      await this.allowReconnection(client, this.reconnectTimeoutSeconds);
    } catch {
      // Client did not reconnect in time, room automatically discards session
    }
  }

  public onDispose(): void {
    if (this.adapter) {
      this.adapter.destroy();
    }
  }

  public getAdapter(): ProjectionAdapter {
    return this.adapter;
  }

  public getSimulator(): AuthoritativeSimulator {
    return this.simulator;
  }
}
