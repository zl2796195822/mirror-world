/**
 * Projection Adapter
 * 
 * BOUNDARY & AUTHORITY:
 * 1. Consumes events from AuthoritativeSimulator (simulating World Kernel / Event Ledger).
 * 2. Translates events into ephemeral Colyseus Room State mutations.
 * 3. Categorizes events into Authoritative Domain Events vs Ephemeral Presentation Ticks.
 * 4. Provides a Fake Action Gateway Stub to demonstrate that client actions CANNOT
 *    directly mutate world state through Colyseus.
 */

import { AuthoritativeSimulator } from '../simulator/authoritative-simulator.js';
import { WorldProjectionEvent, ActionRequestStub, ActionRequestResult } from '../simulator/types.js';
import { WorldStateSchema, ProjectionEntitySchema } from '../schema/WorldState.js';

export class ProjectionAdapter {
  private simulator: AuthoritativeSimulator;
  private state: WorldStateSchema;
  private unsubscribe: (() => void) | null = null;

  // Telemetry & Metrics
  public metrics = {
    domainEventsCount: 0,
    presentationEventsCount: 0,
    totalEventsProcessed: 0,
    stubActionsReceived: 0,
    lastProcessedTick: 0,
  };

  public stubAuditLog: {
    timestamp: number;
    clientId: string;
    actionType: string;
    status: string;
  }[] = [];

  constructor(simulator: AuthoritativeSimulator, state: WorldStateSchema) {
    this.simulator = simulator;
    this.state = state;
    this.initFromSnapshot();
    this.bindSimulatorEvents();
  }

  /**
   * Initializes the Projection State from the simulator's authoritative snapshot.
   */
  public initFromSnapshot(): void {
    const snapshot = this.simulator.exportSnapshot();
    this.state.tick = snapshot.tick;
    this.state.worldTime = snapshot.worldTime;

    // Synchronize entity map
    this.state.entities.clear();
    for (const [id, entity] of Object.entries(snapshot.entities)) {
      const entitySchema = new ProjectionEntitySchema();
      entitySchema.entityId = entity.entityId;
      entitySchema.x = entity.x;
      entitySchema.y = entity.y;
      entitySchema.heading = entity.heading;
      entitySchema.activityState = entity.activityState;
      entitySchema.version = entity.version;
      this.state.entities.set(id, entitySchema);
    }
  }

  private bindSimulatorEvents(): void {
    this.unsubscribe = this.simulator.addEventListener((event: WorldProjectionEvent) => {
      this.applyProjectionEvent(event);
    });
  }

  /**
   * Translates incoming authoritative/presentation event into room state mutation.
   */
  public applyProjectionEvent(event: WorldProjectionEvent): void {
    this.metrics.totalEventsProcessed++;
    if (event.isDomainEvent) {
      this.metrics.domainEventsCount++;
    } else {
      this.metrics.presentationEventsCount++;
    }

    this.state.tick = event.payload.tick;
    this.state.worldTime = event.payload.timestamp;
    this.metrics.lastProcessedTick = event.payload.tick;

    let entitySchema = this.state.entities.get(event.entityId);

    switch (event.type) {
      case 'POSITION_UPDATED': {
        if (!entitySchema) {
          entitySchema = new ProjectionEntitySchema();
          entitySchema.entityId = event.entityId;
          this.state.entities.set(event.entityId, entitySchema);
        }
        if (event.payload.x !== undefined) entitySchema.x = event.payload.x;
        if (event.payload.y !== undefined) entitySchema.y = event.payload.y;
        if (event.payload.heading !== undefined) entitySchema.heading = event.payload.heading;
        entitySchema.version = event.payload.version;
        break;
      }
      case 'ACTIVITY_CHANGED': {
        if (!entitySchema) {
          entitySchema = new ProjectionEntitySchema();
          entitySchema.entityId = event.entityId;
          this.state.entities.set(event.entityId, entitySchema);
        }
        if (event.payload.activityState !== undefined) {
          entitySchema.activityState = event.payload.activityState;
        }
        entitySchema.version = event.payload.version;
        break;
      }
      case 'ENTITY_ENTERED': {
        if (!entitySchema) {
          entitySchema = new ProjectionEntitySchema();
          this.state.entities.set(event.entityId, entitySchema);
        }
        entitySchema.entityId = event.entityId;
        if (event.payload.x !== undefined) entitySchema.x = event.payload.x;
        if (event.payload.y !== undefined) entitySchema.y = event.payload.y;
        if (event.payload.heading !== undefined) entitySchema.heading = event.payload.heading;
        if (event.payload.activityState) entitySchema.activityState = event.payload.activityState;
        entitySchema.version = event.payload.version;
        break;
      }
      case 'ENTITY_LEFT': {
        this.state.entities.delete(event.entityId);
        break;
      }
    }
  }

  /**
   * FAKE ACTION GATEWAY / COMMAND STUB
   * 
   * Strict architectural rule:
   * Clients CANNOT mutate world facts directly through Colyseus room.
   * Actions must be submitted to the Kernel Gateway.
   * Here we log and return 'QUEUED_FOR_KERNEL_VALIDATION', leaving state unmodified.
   */
  public handleClientActionRequest(
    clientId: string,
    action: ActionRequestStub
  ): ActionRequestResult {
    this.metrics.stubActionsReceived++;

    this.stubAuditLog.push({
      timestamp: Date.now(),
      clientId,
      actionType: action.actionType,
      status: 'QUEUED_FOR_KERNEL_VALIDATION',
    });

    return {
      accepted: true,
      status: 'QUEUED_FOR_KERNEL_VALIDATION',
      message:
        'ActionRequest received by stub gateway. Forwarded to Kernel validation queue; Colyseus Realtime Room strictly denies direct state mutation.',
      echoRequestId: action.requestId,
    };
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
