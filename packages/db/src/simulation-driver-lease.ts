import { eq, sql } from "drizzle-orm";
import { createDb } from "./client.js";
import { simulationDriverLeases, worlds } from "./schema.js";

export type SimulationDriverLeaseDatabase = ReturnType<typeof createDb>["db"];
export type SimulationDriverLeaseTransaction = Parameters<
  Parameters<SimulationDriverLeaseDatabase["transaction"]>[0]
>[0];

export type SimulationDriverLease = Readonly<{
  worldId: string;
  ownerId: string;
  fenceToken: bigint;
}>;

export class SimulationDriverLeaseError extends Error {
  constructor(
    public readonly code:
      | "WORLD_NOT_FOUND"
      | "INVALID_OWNER"
      | "STALE_FENCE"
      | "LEASE_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "SimulationDriverLeaseError";
  }
}

function assertOwner(ownerId: string): void {
  if (ownerId.trim().length === 0 || ownerId.length > 255) {
    throw new SimulationDriverLeaseError(
      "INVALID_OWNER",
      "Simulation driver ownerId must be non-empty and at most 255 characters",
    );
  }
}

export async function acquireSimulationDriverLease(
  database: SimulationDriverLeaseDatabase,
  input: Readonly<{ worldId: string; ownerId: string }>,
): Promise<SimulationDriverLease> {
  assertOwner(input.ownerId);
  return database.transaction(async (transaction) => {
    const [world] = await transaction
      .select({ id: worlds.id })
      .from(worlds)
      .where(eq(worlds.id, input.worldId));
    if (!world) {
      throw new SimulationDriverLeaseError(
        "WORLD_NOT_FOUND",
        `World ${input.worldId} was not found`,
      );
    }

    const [lease] = await transaction
      .insert(simulationDriverLeases)
      .values({
        worldId: input.worldId,
        ownerId: input.ownerId,
        fenceToken: 1n,
      })
      .onConflictDoUpdate({
        target: simulationDriverLeases.worldId,
        set: {
          ownerId: input.ownerId,
          fenceToken: sql`${simulationDriverLeases.fenceToken} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!lease) {
      throw new SimulationDriverLeaseError(
        "LEASE_NOT_FOUND",
        "Simulation driver lease could not be acquired",
      );
    }
    return {
      worldId: lease.worldId,
      ownerId: lease.ownerId,
      fenceToken: lease.fenceToken,
    };
  });
}

export async function assertSimulationDriverFenceInTransaction(
  transaction: SimulationDriverLeaseTransaction,
  input: Readonly<{ worldId: string; fenceToken: bigint }>,
): Promise<void> {
  const [lease] = await transaction
    .select()
    .from(simulationDriverLeases)
    .where(eq(simulationDriverLeases.worldId, input.worldId))
    .for("update");
  if (!lease) {
    throw new SimulationDriverLeaseError(
      "LEASE_NOT_FOUND",
      `No simulation driver lease exists for world ${input.worldId}`,
    );
  }
  if (lease.fenceToken !== input.fenceToken) {
    throw new SimulationDriverLeaseError(
      "STALE_FENCE",
      `Stale simulation driver fence for world ${input.worldId}`,
    );
  }
}

export function assertSimulationDriverFence(
  database: SimulationDriverLeaseDatabase,
  input: Readonly<{ worldId: string; fenceToken: bigint }>,
): Promise<void> {
  return database.transaction((transaction) =>
    assertSimulationDriverFenceInTransaction(transaction, input),
  );
}
