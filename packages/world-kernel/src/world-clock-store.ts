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

export type WorldClockDatabase = ReturnType<typeof createDb>["db"];

export class WorldClockStoreError extends Error {
  constructor(
    public readonly code: "WORLD_NOT_FOUND" | "WORLD_CLOCK_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "WorldClockStoreError";
  }
}

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
    const [persisted] = await tx
      .update(worlds)
      .set({
        status: next.status,
        timeScale: next.timeScale,
        worldTime: next.worldTime,
        clockAnchorAt: next.clockAnchorAt,
        updatedAt: now,
      })
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
