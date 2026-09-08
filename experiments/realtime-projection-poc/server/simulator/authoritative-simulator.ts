/**
 * Authoritative Source Simulator
 * 
 * BOUNDARY:
 * This simulator is an EXPERIMENTAL FIXTURE.
 * It simulates the authoritative stream of world state and events from World Kernel.
 * It is deterministic, uses seeded PRNG, and supports snapshot export/import.
 */

import { DummyEntity, ActivityState, WorldProjectionEvent, WorldSnapshot } from './types.js';

// Mulberry32 deterministic PRNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimulatorOptions {
  seed?: number;
  entityCount?: number;
  tickRateHz?: number; // default 20Hz
  worldBounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

export class AuthoritativeSimulator {
  private seed: number;
  private prng: () => number;
  private entityCount: number;
  private tickRateHz: number;
  private intervalMs: number;
  private worldBounds: { minX: number; maxX: number; minY: number; maxY: number };

  private entities: Map<string, DummyEntity> = new Map();
  private tickCount: number = 0;
  private running: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private listeners: ((event: WorldProjectionEvent) => void)[] = [];

  constructor(options: SimulatorOptions = {}) {
    this.seed = options.seed ?? 42;
    this.prng = mulberry32(this.seed);
    this.entityCount = options.entityCount ?? 30;
    this.tickRateHz = options.tickRateHz ?? 20;
    this.intervalMs = Math.round(1000 / this.tickRateHz);
    this.worldBounds = options.worldBounds ?? { minX: -100, maxX: 100, minY: -100, maxY: 100 };

    this.initializeEntities();
  }

  private initializeEntities(): void {
    this.entities.clear();
    const activities: ActivityState[] = ['idle', 'walking', 'observing', 'conversing', 'resting'];

    for (let i = 1; i <= this.entityCount; i++) {
      const id = `dummy-${String(i).padStart(3, '0')}`;
      const x = (this.prng() * (this.worldBounds.maxX - this.worldBounds.minX)) + this.worldBounds.minX;
      const y = (this.prng() * (this.worldBounds.maxY - this.worldBounds.minY)) + this.worldBounds.minY;
      const heading = this.prng() * Math.PI * 2;
      const activityState = activities[Math.floor(this.prng() * activities.length)];

      const entity: DummyEntity = {
        entityId: id,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        heading: Number(heading.toFixed(2)),
        activityState,
        version: 1,
        targetX: Number(((this.prng() * (this.worldBounds.maxX - this.worldBounds.minX)) + this.worldBounds.minX).toFixed(2)),
        targetY: Number(((this.prng() * (this.worldBounds.maxY - this.worldBounds.minY)) + this.worldBounds.minY).toFixed(2)),
      };
      this.entities.set(id, entity);
    }
  }

  public addEventListener(fn: (event: WorldProjectionEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(event: WorldProjectionEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public tickOnce(): WorldProjectionEvent[] {
    this.tickCount++;
    const events: WorldProjectionEvent[] = [];
    const timestamp = Date.now();
    const speed = 0.5; // units per tick (~10 units/sec at 20Hz)

    for (const entity of this.entities.values()) {
      if (entity.activityState === 'walking') {
        if (entity.targetX === undefined || entity.targetY === undefined) {
          entity.targetX = (this.prng() * (this.worldBounds.maxX - this.worldBounds.minX)) + this.worldBounds.minX;
          entity.targetY = (this.prng() * (this.worldBounds.maxY - this.worldBounds.minY)) + this.worldBounds.minY;
        }

        const dx = entity.targetX - entity.x;
        const dy = entity.targetY - entity.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 1.0) {
          // Reached target -> pick new target or switch activity
          entity.targetX = (this.prng() * (this.worldBounds.maxX - this.worldBounds.minX)) + this.worldBounds.minX;
          entity.targetY = (this.prng() * (this.worldBounds.maxY - this.worldBounds.minY)) + this.worldBounds.minY;
          if (this.prng() < 0.2) {
            entity.activityState = 'observing';
            entity.version++;
            const evt: WorldProjectionEvent = {
              type: 'ACTIVITY_CHANGED',
              entityId: entity.entityId,
              payload: {
                activityState: entity.activityState,
                version: entity.version,
                tick: this.tickCount,
                timestamp,
              },
              isDomainEvent: true,
            };
            events.push(evt);
            this.emit(evt);
          }
        } else {
          // Move towards target
          const angle = Math.atan2(dy, dx);
          entity.heading = Number(angle.toFixed(2));
          entity.x = Number((entity.x + Math.cos(angle) * speed).toFixed(2));
          entity.y = Number((entity.y + Math.sin(angle) * speed).toFixed(2));
          entity.version++;

          const evt: WorldProjectionEvent = {
            type: 'POSITION_UPDATED',
            entityId: entity.entityId,
            payload: {
              x: entity.x,
              y: entity.y,
              heading: entity.heading,
              version: entity.version,
              tick: this.tickCount,
              timestamp,
            },
            isDomainEvent: false, // Presentation coordinate tick
          };
          events.push(evt);
          this.emit(evt);
        }
      } else {
        // Idle/observing/resting: small chance to resume walking
        if (this.prng() < 0.05) {
          entity.activityState = 'walking';
          entity.version++;
          const evt: WorldProjectionEvent = {
            type: 'ACTIVITY_CHANGED',
            entityId: entity.entityId,
            payload: {
              activityState: entity.activityState,
              version: entity.version,
              tick: this.tickCount,
              timestamp,
            },
            isDomainEvent: true,
          };
          events.push(evt);
          this.emit(evt);
        }
      }
    }

    return events;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.tickOnce();
    }, this.intervalMs);
  }

  public stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getTick(): number {
    return this.tickCount;
  }

  public getEntity(entityId: string): DummyEntity | undefined {
    const e = this.entities.get(entityId);
    return e ? { ...e } : undefined;
  }

  public getAllEntities(): DummyEntity[] {
    return Array.from(this.entities.values()).map((e) => ({ ...e }));
  }

  public exportSnapshot(): WorldSnapshot {
    const entitiesObj: Record<string, DummyEntity> = {};
    for (const [id, entity] of this.entities.entries()) {
      entitiesObj[id] = { ...entity };
    }
    return {
      tick: this.tickCount,
      worldTime: this.tickCount * this.intervalMs,
      entities: entitiesObj,
      totalEntities: this.entities.size,
    };
  }

  public importSnapshot(snapshot: WorldSnapshot): void {
    this.tickCount = snapshot.tick;
    this.entities.clear();
    for (const [id, entity] of Object.entries(snapshot.entities)) {
      this.entities.set(id, { ...entity });
    }
  }

  public setEntityCount(count: number): void {
    this.entityCount = count;
    this.initializeEntities();
  }
}
