import { eq } from "drizzle-orm";
import { createDb, worldEvents, worlds } from "@mirror/db";

export const WORLD_EVENT_TYPES = [
  "WORLD_TIME_ADVANCED",
  "RESIDENT_MOVED",
  "NEED_CHANGED",
  "WORK_SHIFT_COMPLETED",
  "WAGE_PAID",
  "RENT_PAID",
  "PURCHASE_COMPLETED",
  "CONVERSATION_COMPLETED",
  "RELATIONSHIP_CHANGED",
  "MEMORY_CREATED",
  "GOAL_CHANGED",
  "EMPLOYMENT_CHANGED",
  "PROXY_ACTION_DECIDED",
  "WORLD_DIGEST_CREATED",
] as const;

export type WorldEventType = (typeof WORLD_EVENT_TYPES)[number];

export type WorldEventPayload = {
  schemaVersion: number;
  [key: string]: unknown;
};

export type WorldEventInput = {
  id: string;
  worldId: string;
  type: WorldEventType;
  actorId?: string;
  targetId?: string;
  payload: WorldEventPayload;
  occurredAt: Date;
  correlationId: string;
};

export type WorldStatePatch = {
  status?: string;
  timeScale?: number;
  worldTime?: Date;
  clockAnchorAt?: Date;
  updatedAt?: Date;
};

export type WorldEventsDatabase = ReturnType<typeof createDb>["db"];
export type WorldKernelTransaction = Parameters<
  Parameters<WorldEventsDatabase["transaction"]>[0]
>[0];

export type WorldEventCommitResult = {
  event: typeof worldEvents.$inferSelect;
  events: Array<typeof worldEvents.$inferSelect>;
  world: typeof worlds.$inferSelect;
};

export class WorldEventStoreError extends Error {
  constructor(
    public readonly code: "WORLD_NOT_FOUND" | "WORLD_EVENT_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "WorldEventStoreError";
  }
}

function assertPayload(payload: WorldEventPayload): void {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !Number.isInteger(payload.schemaVersion) ||
    payload.schemaVersion < 1
  ) {
    throw new WorldEventStoreError(
      "WORLD_EVENT_INVALID",
      "World event payload must include a positive schemaVersion",
    );
  }
}

function assertOccurredAt(occurredAt: Date): void {
  if (Number.isNaN(occurredAt.getTime())) {
    throw new WorldEventStoreError(
      "WORLD_EVENT_INVALID",
      "World event occurredAt must be a valid date",
    );
  }
}

export async function commitWorldStateWithEventsInTransaction(
  transaction: WorldKernelTransaction,
  input: {
    worldId: string;
    state: WorldStatePatch;
    events: readonly WorldEventInput[];
  },
): Promise<WorldEventCommitResult> {
  if (input.events.length === 0) {
    throw new WorldEventStoreError(
      "WORLD_EVENT_INVALID",
      "At least one world event is required for a committed world state",
    );
  }

  for (const event of input.events) {
    if (event.worldId !== input.worldId) {
      throw new WorldEventStoreError(
        "WORLD_EVENT_INVALID",
        "World event worldId must match the committed world",
      );
    }
    assertPayload(event.payload);
    assertOccurredAt(event.occurredAt);
  }

  const [world] = await transaction
    .select()
    .from(worlds)
    .where(eq(worlds.id, input.worldId))
    .for("update");

  if (!world) {
    throw new WorldEventStoreError("WORLD_NOT_FOUND", "World was not found");
  }

  let nextSeq = world.worldSeq;
  const events: Array<typeof worldEvents.$inferSelect> = [];
  let persistedWorld = world;

  for (const eventInput of input.events) {
    nextSeq += 1n;
    const [event] = await transaction
      .insert(worldEvents)
      .values({
        id: eventInput.id,
        worldId: eventInput.worldId,
        seq: nextSeq,
        type: eventInput.type,
        actorId: eventInput.actorId,
        targetId: eventInput.targetId,
        payload: eventInput.payload,
        occurredAt: eventInput.occurredAt,
        correlationId: eventInput.correlationId,
      })
      .returning();

    [persistedWorld] = await transaction
      .update(worlds)
      .set({ ...input.state, worldSeq: nextSeq })
      .where(eq(worlds.id, input.worldId))
      .returning();

    if (!event || !persistedWorld) {
      throw new WorldEventStoreError(
        "WORLD_EVENT_INVALID",
        "World event transaction could not be persisted",
      );
    }
    events.push(event);
  }

  return { event: events[0], events, world: persistedWorld };
}

export function commitWorldStateWithEventInTransaction(
  transaction: WorldKernelTransaction,
  input: {
    worldId: string;
    state: WorldStatePatch;
    event: WorldEventInput;
  },
): Promise<WorldEventCommitResult> {
  return commitWorldStateWithEventsInTransaction(transaction, {
    worldId: input.worldId,
    state: input.state,
    events: [input.event],
  });
}

export function commitWorldStateWithEvent(
  database: WorldEventsDatabase,
  input: {
    worldId: string;
    state: WorldStatePatch;
    event: WorldEventInput;
  },
): Promise<WorldEventCommitResult> {
  return database.transaction((transaction) =>
    commitWorldStateWithEventInTransaction(transaction, input),
  );
}

export function appendWorldEvent(
  database: WorldEventsDatabase,
  event: WorldEventInput,
): Promise<WorldEventCommitResult> {
  return commitWorldStateWithEvent(database, {
    worldId: event.worldId,
    state: {},
    event,
  });
}
