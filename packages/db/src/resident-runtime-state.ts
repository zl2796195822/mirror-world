import { and, asc, eq, inArray } from "drizzle-orm";
import { RUNTIME_STATE_POLICY_VERSION } from "@mirror/contracts";
import { residentRuntimeStates, worlds } from "./schema.js";
import { createDb } from "./client.js";
import {
  generateResidentSeed,
  getFirstStreetLocationFixtures,
} from "./resident-seed.js";

export const RUNTIME_STATE_BOOTSTRAP_POLICY_VERSION =
  RUNTIME_STATE_POLICY_VERSION;

export type ResidentRuntimeStateDatabase = ReturnType<typeof createDb>["db"];
export type ResidentRuntimeStateRow = typeof residentRuntimeStates.$inferSelect;

export class ResidentRuntimeStateBootstrapError extends Error {
  constructor(
    public readonly code: "WORLD_NOT_FOUND" | "INVALID_FIXTURE",
    message: string,
  ) {
    super(message);
    this.name = "ResidentRuntimeStateBootstrapError";
  }
}

export async function bootstrapResidentRuntimeStates(
  database: ResidentRuntimeStateDatabase,
  input: Readonly<{ worldId: string }>,
): Promise<readonly ResidentRuntimeStateRow[]> {
  return database.transaction(async (transaction) => {
    const [world] = await transaction
      .select({ id: worlds.id, seed: worlds.seed, worldSeq: worlds.worldSeq })
      .from(worlds)
      .where(eq(worlds.id, input.worldId))
      .for("update");

    if (!world) {
      throw new ResidentRuntimeStateBootstrapError(
        "WORLD_NOT_FOUND",
        `World ${input.worldId} was not found`,
      );
    }

    const fixture = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    });
    const locationIds = new Set(
      getFirstStreetLocationFixtures(world.id)
        .filter(({ kind }) => kind === "HOME")
        .map(({ id }) => id),
    );
    if (
      fixture.residents.some(
        ({ homeLocationId }) => !locationIds.has(homeLocationId),
      )
    ) {
      throw new ResidentRuntimeStateBootstrapError(
        "INVALID_FIXTURE",
        "Resident seed contains a home outside the first-street fixture",
      );
    }

    await transaction
      .insert(residentRuntimeStates)
      .values(
        fixture.residents.map((resident) => ({
          worldId: world.id,
          residentId: resident.residentId,
          currentLocationId: resident.homeLocationId,
          currentActivity: "IDLE",
          stateVersion: 0,
          sourceWorldSeq: world.worldSeq,
          runtimePolicyVersion: RUNTIME_STATE_BOOTSTRAP_POLICY_VERSION,
        })),
      )
      .onConflictDoNothing({
        target: [
          residentRuntimeStates.worldId,
          residentRuntimeStates.residentId,
        ],
      });

    return transaction
      .select()
      .from(residentRuntimeStates)
      .where(eq(residentRuntimeStates.worldId, world.id))
      .orderBy(asc(residentRuntimeStates.residentId));
  });
}

export async function readResidentRuntimeStateRows(
  database: ResidentRuntimeStateDatabase,
  input: Readonly<{ worldId: string; residentIds: readonly string[] }>,
): Promise<readonly ResidentRuntimeStateRow[]> {
  if (input.residentIds.length === 0) return [];
  return database
    .select()
    .from(residentRuntimeStates)
    .where(
      and(
        eq(residentRuntimeStates.worldId, input.worldId),
        inArray(residentRuntimeStates.residentId, input.residentIds),
      ),
    )
    .orderBy(asc(residentRuntimeStates.residentId));
}
