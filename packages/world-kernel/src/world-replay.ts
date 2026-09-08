import { createHash } from "node:crypto";
import {
  WORLD_EVENT_TYPES,
  type WorldEventPayload,
  type WorldEventType,
} from "./world-events-store.js";

export const REPLAY_SCHEMA_VERSION = 1;

export type ReplaySeed = {
  worldId: string;
  seed: string;
  initialWorldTime: Date;
};

export type ReplayEvent = {
  worldId: string;
  seq: bigint;
  type: WorldEventType;
  payload: WorldEventPayload;
  occurredAt: Date;
};

export type ReplayState = {
  worldId: string;
  seed: string;
  worldTime: Date;
  appliedSeq: bigint;
  historyDigest: string;
};

export type ReplaySnapshot = {
  schemaVersion: typeof REPLAY_SCHEMA_VERSION;
  worldId: string;
  seed: string;
  worldTime: string;
  appliedSeq: string;
  historyDigest: string;
};

export type ReplayResult = {
  state: ReplayState;
  snapshot: ReplaySnapshot;
  summaryHash: string;
};

export type ReplayCheckpointInput = {
  worldId: string;
  worldSeq: bigint;
  checksum: string;
  snapshot: unknown;
};

export class WorldReplayError extends Error {
  constructor(
    public readonly code:
      | "REPLAY_INVALID_SEED"
      | "REPLAY_INVALID_EVENT"
      | "REPLAY_EVENT_GAP"
      | "REPLAY_WORLD_MISMATCH"
      | "REPLAY_UNSUPPORTED_EVENT"
      | "REPLAY_CHECKPOINT_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "WorldReplayError";
  }
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function assertValidDate(
  value: Date,
  field: string,
  code: WorldReplayError["code"] = "REPLAY_INVALID_SEED",
): void {
  if (Number.isNaN(value.getTime())) {
    throw new WorldReplayError(code, `${field} must be valid`);
  }
}

function assertSeed(seed: ReplaySeed): void {
  if (!seed.worldId || !seed.seed) {
    throw new WorldReplayError(
      "REPLAY_INVALID_SEED",
      "Replay seed must include worldId and seed",
    );
  }
  assertValidDate(seed.initialWorldTime, "initialWorldTime");
}

function eventDigest(event: ReplayEvent): string {
  return hash({
    occurredAt: event.occurredAt,
    payload: event.payload,
    seq: event.seq,
    type: event.type,
  });
}

function initialHistoryDigest(seed: ReplaySeed): string {
  return hash({
    initialWorldTime: seed.initialWorldTime,
    schemaVersion: REPLAY_SCHEMA_VERSION,
    seed: seed.seed,
    worldId: seed.worldId,
  });
}

function snapshotFromState(state: ReplayState): ReplaySnapshot {
  return {
    schemaVersion: REPLAY_SCHEMA_VERSION,
    worldId: state.worldId,
    seed: state.seed,
    worldTime: state.worldTime.toISOString(),
    appliedSeq: state.appliedSeq.toString(),
    historyDigest: state.historyDigest,
  };
}

function summaryHash(state: ReplayState): string {
  return hash({
    appliedSeq: state.appliedSeq,
    historyDigest: state.historyDigest,
    schemaVersion: REPLAY_SCHEMA_VERSION,
    seed: state.seed,
    worldId: state.worldId,
    worldTime: state.worldTime,
  });
}

function resultFromState(state: ReplayState): ReplayResult {
  return {
    state,
    snapshot: snapshotFromState(state),
    summaryHash: summaryHash(state),
  };
}

function assertEventShape(event: ReplayEvent, worldId: string): void {
  if (event.worldId !== worldId) {
    throw new WorldReplayError(
      "REPLAY_WORLD_MISMATCH",
      "Replay event worldId does not match the replay world",
    );
  }
  if (event.seq < 1n || !WORLD_EVENT_TYPES.includes(event.type)) {
    throw new WorldReplayError(
      "REPLAY_INVALID_EVENT",
      "Replay event has an invalid type or sequence",
    );
  }
  assertValidDate(event.occurredAt, "event.occurredAt", "REPLAY_INVALID_EVENT");
  if (
    !event.payload ||
    typeof event.payload !== "object" ||
    Array.isArray(event.payload) ||
    event.payload.schemaVersion !== 1
  ) {
    throw new WorldReplayError(
      "REPLAY_INVALID_EVENT",
      "Replay event payload schemaVersion is unsupported",
    );
  }
}

function applyEvent(state: ReplayState, event: ReplayEvent): ReplayState {
  switch (event.type) {
    case "WORLD_TIME_ADVANCED": {
      const from = new Date(String(event.payload.from));
      const to = new Date(String(event.payload.to));
      assertValidDate(from, "WORLD_TIME_ADVANCED.from");
      assertValidDate(to, "WORLD_TIME_ADVANCED.to");
      if (
        from.getTime() !== state.worldTime.getTime() ||
        to.getTime() < from.getTime() ||
        event.occurredAt.getTime() !== to.getTime()
      ) {
        throw new WorldReplayError(
          "REPLAY_INVALID_EVENT",
          "WORLD_TIME_ADVANCED does not connect to the replay state",
        );
      }
      return { ...state, worldTime: to };
    }
    case "RESIDENT_MOVED":
    case "NEED_CHANGED":
    case "WORK_SHIFT_COMPLETED":
    case "WAGE_PAID":
    case "RENT_PAID":
    case "PURCHASE_COMPLETED":
    case "CONVERSATION_COMPLETED":
    case "RELATIONSHIP_CHANGED":
    case "MEMORY_CREATED":
    case "GOAL_CHANGED":
    case "EMPLOYMENT_CHANGED":
    case "PROXY_ACTION_DECIDED":
    case "WORLD_DIGEST_CREATED":
      return state;
    default:
      throw new WorldReplayError(
        "REPLAY_UNSUPPORTED_EVENT",
        `Replay handler is not registered for ${event.type}`,
      );
  }
}

function applyEvents(
  initialState: ReplayState,
  events: readonly ReplayEvent[],
): ReplayState {
  return events.reduce((state, event) => {
    assertEventShape(event, state.worldId);
    const expectedSeq = state.appliedSeq + 1n;
    if (event.seq !== expectedSeq) {
      throw new WorldReplayError(
        "REPLAY_EVENT_GAP",
        `Expected event seq ${expectedSeq}, received ${event.seq}`,
      );
    }
    const next = applyEvent(state, event);
    return {
      ...next,
      appliedSeq: event.seq,
      historyDigest: hash({
        event: eventDigest(event),
        previous: state.historyDigest,
      }),
    };
  }, initialState);
}

export function replayWorldEvents(input: {
  seed: ReplaySeed;
  events: readonly ReplayEvent[];
}): ReplayResult {
  assertSeed(input.seed);
  const initialState: ReplayState = {
    worldId: input.seed.worldId,
    seed: input.seed.seed,
    worldTime: new Date(input.seed.initialWorldTime.getTime()),
    appliedSeq: 0n,
    historyDigest: initialHistoryDigest(input.seed),
  };
  return resultFromState(applyEvents(initialState, input.events));
}

function stateFromSnapshot(input: ReplayCheckpointInput): ReplayState {
  if (!input.snapshot || typeof input.snapshot !== "object") {
    throw new WorldReplayError(
      "REPLAY_CHECKPOINT_INVALID",
      "Checkpoint snapshot must be an object",
    );
  }
  const snapshot = input.snapshot as Partial<ReplaySnapshot>;
  if (
    snapshot.schemaVersion !== REPLAY_SCHEMA_VERSION ||
    snapshot.worldId !== input.worldId ||
    typeof snapshot.seed !== "string" ||
    typeof snapshot.worldTime !== "string" ||
    typeof snapshot.appliedSeq !== "string" ||
    typeof snapshot.historyDigest !== "string"
  ) {
    throw new WorldReplayError(
      "REPLAY_CHECKPOINT_INVALID",
      "Checkpoint snapshot schema is unsupported",
    );
  }
  const worldTime = new Date(snapshot.worldTime);
  let appliedSeq: bigint;
  try {
    appliedSeq = BigInt(snapshot.appliedSeq);
  } catch {
    throw new WorldReplayError(
      "REPLAY_CHECKPOINT_INVALID",
      "Checkpoint sequence is invalid",
    );
  }
  if (
    Number.isNaN(worldTime.getTime()) ||
    appliedSeq !== input.worldSeq ||
    appliedSeq < 0n
  ) {
    throw new WorldReplayError(
      "REPLAY_CHECKPOINT_INVALID",
      "Checkpoint position is invalid",
    );
  }
  const state: ReplayState = {
    worldId: input.worldId,
    seed: snapshot.seed,
    worldTime,
    appliedSeq,
    historyDigest: snapshot.historyDigest,
  };
  if (summaryHash(state) !== input.checksum) {
    throw new WorldReplayError(
      "REPLAY_CHECKPOINT_INVALID",
      "Checkpoint checksum does not match its snapshot",
    );
  }
  return state;
}

export function replayFromCheckpoint(input: {
  checkpoint: ReplayCheckpointInput;
  events: readonly ReplayEvent[];
}): ReplayResult {
  const state = stateFromSnapshot(input.checkpoint);
  return resultFromState(applyEvents(state, input.events));
}

export function replaySummaryHash(state: ReplayState): string {
  return summaryHash(state);
}
