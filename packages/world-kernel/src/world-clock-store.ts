import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createDb, worlds } from "@mirror/db";
import {
  advanceWorldClock,
  applyWorldClockControl,
  type WorldClockEnvironment,
  type WorldClockInput,
  type WorldClockScale,
  type WorldClockStatus,
} from "./world-clock.js";
import { commitWorldStateWithEventInTransaction } from "./world-events-store.js";

export type WorldClockDatabase = ReturnType<typeof createDb>["db"];

export class WorldClockStoreError extends Error {
  constructor(
    public readonly code:
      | "WORLD_NOT_FOUND"
      | "WORLD_CLOCK_INVALID"
      | "WORLD_TIME_REWIND",
    message: string,
  ) {
    super(message);
    this.name = "WorldClockStoreError";
  }
}

export type WorldTimeAdvanceResult = {
  disposition: "ADVANCED" | "NO_OP" | "BLOCKED";
  world: typeof worlds.$inferSelect;
};

type WorldClockControl = {
  status?: WorldClockStatus;
  timeScale?: WorldClockScale;
};

function toClockInput(world: typeof worlds.$inferSelect): WorldClockInput {
  return {
    worldTime: world.worldTime,
    clockAnchorAt: world.clockAnchorAt,
    status: world.status as WorldClockStatus,
    timeScale: world.timeScale as WorldClockScale,
  };
}

async function updateLockedWorld(
  database: WorldClockDatabase,
  worldId: string,
  now: Date,
  update: (world: typeof worlds.$inferSelect) => WorldClockInput,
) {
  return database.transaction(async (tx) => {
    const [world] = await tx
      .select()
      .from(worlds)
      .where(eq(worlds.id, worldId))
      .for("update");

    if (!world) {
      throw new WorldClockStoreError("WORLD_NOT_FOUND", "World was not found");
    }

    const next = update(world);
    const state = {
      status: next.status,
      timeScale: next.timeScale,
      worldTime: next.worldTime,
      clockAnchorAt: next.clockAnchorAt,
      updatedAt: now,
    };

    if (next.worldTime.getTime() > world.worldTime.getTime()) {
      const committed = await commitWorldStateWithEventInTransaction(tx, {
        worldId,
        state,
        event: {
          id: randomUUID(),
          worldId,
          type: "WORLD_TIME_ADVANCED",
          payload: {
            schemaVersion: 1,
            worldId,
            from: world.worldTime.toISOString(),
            to: next.worldTime.toISOString(),
          },
          occurredAt: next.worldTime,
          correlationId: randomUUID(),
        },
      });
      return committed.world;
    }

    const [persisted] = await tx
      .update(worlds)
      .set(state)
      .where(eq(worlds.id, worldId))
      .returning();

    if (!persisted) {
      throw new WorldClockStoreError(
        "WORLD_CLOCK_INVALID",
        "World clock could not be persisted",
      );
    }

    return persisted;
  });
}

export function syncWorldClock(
  database: WorldClockDatabase,
  worldId: string,
  now: Date,
  environment: WorldClockEnvironment,
) {
  return updateLockedWorld(database, worldId, now, (world) =>
    advanceWorldClock(toClockInput(world), now, environment),
  );
}

export function updateWorldClockControl(
  database: WorldClockDatabase,
  worldId: string,
  control: WorldClockControl,
  now: Date,
  environment: WorldClockEnvironment,
) {
  return updateLockedWorld(database, worldId, now, (world) =>
    applyWorldClockControl(toClockInput(world), control, now, environment),
  );
}

export async function advanceWorldTimeTo(
  database: WorldClockDatabase,
  worldId: string,
  targetWorldTime: Date,
): Promise<WorldTimeAdvanceResult> {
  if (Number.isNaN(targetWorldTime.getTime())) {
    throw new WorldClockStoreError(
      "WORLD_CLOCK_INVALID",
      "Target world time must be a valid date",
    );
  }

  return database.transaction(async (transaction) => {
    const [world] = await transaction
      .select()
      .from(worlds)
      .where(eq(worlds.id, worldId))
      .for("update");
    if (!world) {
      throw new WorldClockStoreError("WORLD_NOT_FOUND", "World was not found");
    }

    const targetMilliseconds = targetWorldTime.getTime();
    if (targetMilliseconds < world.worldTime.getTime()) {
      throw new WorldClockStoreError(
        "WORLD_TIME_REWIND",
        "World time cannot move backward",
      );
    }
    if (targetMilliseconds === world.worldTime.getTime()) {
      return { disposition: "NO_OP", world };
    }
    if (world.status !== "RUNNING") {
      return { disposition: "BLOCKED", world };
    }

    const committed = await commitWorldStateWithEventInTransaction(
      transaction,
      {
        worldId,
        state: {
          worldTime: new Date(targetMilliseconds),
          updatedAt: targetWorldTime,
        },
        event: {
          id: randomUUID(),
          worldId,
          type: "WORLD_TIME_ADVANCED",
          payload: {
            schemaVersion: 1,
            worldId,
            from: world.worldTime.toISOString(),
            to: targetWorldTime.toISOString(),
          },
          occurredAt: targetWorldTime,
          correlationId: randomUUID(),
        },
      },
    );
    return { disposition: "ADVANCED", world: committed.world };
  });
}
