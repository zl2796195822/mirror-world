/**
 * EXP-REALTIME-001: Core Types & Interfaces
 * 
 * IMPORTANT ARCHITECTURAL BOUNDARY:
 * These types represent the Authoritative Simulator fixture and its Projection view.
 * They are NOT formal World Kernel entities (no database bindings, no resident models).
 */

export type ActivityState = 'idle' | 'walking' | 'observing' | 'conversing' | 'resting';

export interface DummyEntity {
  entityId: string;
  x: number;
  y: number;
  heading: number; // in radians [0, 2*PI)
  activityState: ActivityState;
  version: number; // monotonic sequence for projection freshness
  targetX?: number;
  targetY?: number;
}

export type WorldProjectionEventType =
  | 'POSITION_UPDATED'
  | 'ACTIVITY_CHANGED'
  | 'ENTITY_ENTERED'
  | 'ENTITY_LEFT';

export interface WorldProjectionEvent {
  type: WorldProjectionEventType;
  entityId: string;
  payload: {
    x?: number;
    y?: number;
    heading?: number;
    activityState?: ActivityState;
    version: number;
    tick: number;
    timestamp: number;
  };
  isDomainEvent: boolean; // True for lifecycle/activity, False for continuous 20Hz presentation tick
}

export interface WorldSnapshot {
  tick: number;
  worldTime: number; // simulated elapsed ms
  entities: Record<string, DummyEntity>;
  totalEntities: number;
}

export interface ActionRequestStub {
  requestId: string;
  actionType: string;
  actorId: string;
  payload: Record<string, unknown>;
  submittedAt: number;
}

export interface ActionRequestResult {
  accepted: boolean;
  status: 'QUEUED_FOR_KERNEL_VALIDATION' | 'REJECTED';
  message: string;
  echoRequestId: string;
}
