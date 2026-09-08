import { and, desc, eq, lte } from "drizzle-orm";
import { createDb, simulationCheckpoints, worlds } from "@mirror/db";
import {
  REPLAY_SCHEMA_VERSION,
  replaySummaryHash,
  type ReplayResult,
} from "./world-replay.js";

export type WorldCheckpointDatabase = ReturnType<typeof createDb>["db"];
export type WorldCheckpointRecord = typeof simulationCheckpoints.$inferSelect;

export type WorldCheckpointPersistenceResult =
  | { status: "created"; checkpoint: WorldCheckpointRecord }
  | { status: "duplicate"; checkpoint: WorldCheckpointRecord }
  | {
      status: "conflict";
      checkpoint: WorldCheckpointRecord;
      reasonCode: "CHECKPOINT_CONFLICT";
    };

export class WorldCheckpointStoreError extends Error {
  constructor(
    public readonly code:
      | "WORLD_NOT_FOUND"
      | "CHECKPOINT_INVALID"
      | "CHECKPOINT_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "WorldCheckpointStoreError";
  }
}

function assertReplayResult(worldId: string, replay: ReplayResult): void {
  if (
    replay.state.worldId !== worldId ||
    replay.snapshot.worldId !== worldId ||
    replay.snapshot.schemaVersion !== REPLAY_SCHEMA_VERSION ||
    replay.state.appliedSeq < 0n ||
    replaySummaryHash(replay.state) !== replay.summaryHash
  ) {
    throw new WorldCheckpointStoreError(
      "CHECKPOINT_INVALID",
      "Checkpoint replay state does not match the requested world",
    );
  }
}

export async function persistWorldCheckpoint(
  database: WorldCheckpointDatabase,
  input: {
    worldId: string;
    replay: ReplayResult;
    snapshotUri?: string;
  },
): Promise<WorldCheckpointPersistenceResult> {
  assertReplayResult(input.worldId, input.replay);

  return database.transaction(async (tx) => {
    const [world] = await tx
      .select({ id: worlds.id, worldSeq: worlds.worldSeq })
      .from(worlds)
      .where(eq(worlds.id, input.worldId))
      .for("update");

    if (!world) {
      throw new WorldCheckpointStoreError(
        "WORLD_NOT_FOUND",
        "World was not found",
      );
    }

    if (input.replay.state.appliedSeq > world.worldSeq) {
      throw new WorldCheckpointStoreError(
        "CHECKPOINT_INVALID",
        "Checkpoint sequence is ahead of the current world sequence",
      );
    }

    const [inserted] = await tx
      .insert(simulationCheckpoints)
      .values({
        worldId: input.worldId,
        worldSeq: input.replay.state.appliedSeq,
        schemaVersion: REPLAY_SCHEMA_VERSION,
        snapshot: input.replay.snapshot,
        snapshotUri: input.snapshotUri,
        checksum: input.replay.summaryHash,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      return { status: "created", checkpoint: inserted };
    }

    const [existing] = await tx
      .select()
      .from(simulationCheckpoints)
      .where(
        and(
          eq(simulationCheckpoints.worldId, input.worldId),
          eq(simulationCheckpoints.worldSeq, input.replay.state.appliedSeq),
        ),
      );

    if (!existing) {
      throw new WorldCheckpointStoreError(
        "CHECKPOINT_INVALID",
        "Conflicting checkpoint could not be located",
      );
    }

    if (existing.checksum === input.replay.summaryHash) {
      return { status: "duplicate", checkpoint: existing };
    }

    return {
      status: "conflict",
      checkpoint: existing,
      reasonCode: "CHECKPOINT_CONFLICT",
    };
  });
}

export async function findWorldCheckpoint(
  database: WorldCheckpointDatabase,
  input: { worldId: string; atOrBeforeSeq?: bigint },
): Promise<WorldCheckpointRecord> {
  const conditions = [eq(simulationCheckpoints.worldId, input.worldId)];
  if (input.atOrBeforeSeq !== undefined) {
    conditions.push(lte(simulationCheckpoints.worldSeq, input.atOrBeforeSeq));
  }

  const [checkpoint] = await database
    .select()
    .from(simulationCheckpoints)
    .where(and(...conditions))
    .orderBy(desc(simulationCheckpoints.worldSeq))
    .limit(1);

  if (!checkpoint) {
    throw new WorldCheckpointStoreError(
      "CHECKPOINT_NOT_FOUND",
      "Checkpoint was not found",
    );
  }

  return checkpoint;
}
