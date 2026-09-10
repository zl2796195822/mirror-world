import { createHash } from "node:crypto";
import { and, asc, eq, lte } from "drizzle-orm";
import {
  parseScheduledWakeRegistration,
  type ScheduledWakeReadInput,
  type ScheduledWakeRegistration,
} from "@mirror/contracts";
import { createDb } from "./client.js";
import {
  residentRuntimeStates,
  scheduledWakeRegistrations,
  worlds,
} from "./schema.js";
import { generateResidentSeed } from "./resident-seed.js";

export type ScheduledWakeDatabase = ReturnType<typeof createDb>["db"];
export type ScheduledWakeRow = typeof scheduledWakeRegistrations.$inferSelect;
export type ScheduledWakeTransaction = Parameters<
  Parameters<ScheduledWakeDatabase["transaction"]>[0]
>[0];

export class ScheduledWakeStoreError extends Error {
  constructor(
    public readonly code: "INVALID_WAKE" | "WAKE_REGISTRATION_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ScheduledWakeStoreError";
  }
}

export async function acknowledgeScheduledWake(
  database: ScheduledWakeDatabase,
  input: Readonly<{ worldId: string; wakeId: string }>,
): Promise<boolean> {
  const deleted = await database
    .delete(scheduledWakeRegistrations)
    .where(
      and(
        eq(scheduledWakeRegistrations.worldId, input.worldId),
        eq(scheduledWakeRegistrations.wakeId, input.wakeId),
      ),
    )
    .returning({ wakeId: scheduledWakeRegistrations.wakeId });
  return deleted.length === 1;
}

const WORK_BOUNDARY_POLICY_VERSION = "m3-scheduler-v2" as const;

function deterministicWakeId(value: string): string {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function nextWorkBoundaryWorldTime(worldTime: Date): Date {
  if (Number.isNaN(worldTime.getTime())) {
    throw new ScheduledWakeStoreError(
      "INVALID_WAKE",
      "Work boundary requires a valid World Time",
    );
  }
  const day = Date.UTC(
    worldTime.getUTCFullYear(),
    worldTime.getUTCMonth(),
    worldTime.getUTCDate(),
    9,
  );
  let candidate = new Date(day);
  while (
    candidate.getTime() < worldTime.getTime() ||
    candidate.getUTCDay() === 0 ||
    candidate.getUTCDay() === 6
  ) {
    candidate = new Date(candidate.getTime() + 24 * 60 * 60_000);
  }
  return candidate;
}

export type RegisterWorkBoundaryWakeInput = Readonly<{
  worldId: string;
  worldSeed: string;
  worldTime: Date;
  sourceWorldSeq: bigint;
  residentId: string;
  sourceStateVersion: number;
  decisionEpoch?: number;
}>;

export async function registerScheduledWakeInTransaction(
  transaction: ScheduledWakeTransaction,
  input: ScheduledWakeRegistration,
): Promise<ScheduledWakeRegistration> {
  const wake = parseScheduledWakeRegistration(input);
  await transaction
    .insert(scheduledWakeRegistrations)
    .values({
      wakeId: wake.wakeId,
      worldId: wake.worldId,
      residentId: wake.residentId,
      wakeReason: wake.wakeReason,
      dueWorldTime: new Date(wake.dueWorldTime),
      sourceStateVersion: wake.sourceStateVersion,
      sourceWorldSeq: BigInt(wake.sourceWorldSeq),
      decisionEpoch: wake.decisionEpoch,
      dedupeKey: wake.dedupeKey,
      policyVersion: wake.policyVersion,
    })
    .onConflictDoNothing({
      target: [
        scheduledWakeRegistrations.worldId,
        scheduledWakeRegistrations.dedupeKey,
      ],
    });

  const [row] = await transaction
    .select()
    .from(scheduledWakeRegistrations)
    .where(
      and(
        eq(scheduledWakeRegistrations.worldId, wake.worldId),
        eq(scheduledWakeRegistrations.dedupeKey, wake.dedupeKey),
      ),
    );
  if (!row) {
    throw new ScheduledWakeStoreError(
      "INVALID_WAKE",
      "Scheduled wake registration could not be read after insert",
    );
  }

  const persisted = toRegistration(row);
  if (
    persisted.wakeId !== wake.wakeId ||
    persisted.residentId !== wake.residentId ||
    persisted.wakeReason !== wake.wakeReason ||
    persisted.dueWorldTime !== wake.dueWorldTime ||
    persisted.sourceStateVersion !== wake.sourceStateVersion ||
    persisted.sourceWorldSeq !== wake.sourceWorldSeq ||
    persisted.decisionEpoch !== wake.decisionEpoch ||
    persisted.policyVersion !== wake.policyVersion
  ) {
    throw new ScheduledWakeStoreError(
      "WAKE_REGISTRATION_CONFLICT",
      `Scheduled wake dedupe key ${wake.dedupeKey} is already registered with different content`,
    );
  }
  return persisted;
}

export async function registerNextWorkBoundaryWakeInTransaction(
  transaction: ScheduledWakeTransaction,
  input: RegisterWorkBoundaryWakeInput,
): Promise<ScheduledWakeRegistration | null> {
  const resident = generateResidentSeed({
    worldId: input.worldId,
    seed: input.worldSeed,
  }).residents.find(({ residentId }) => residentId === input.residentId);
  if (!resident || resident.employment.status !== "EMPLOYED") return null;

  if (
    !Number.isInteger(input.sourceStateVersion) ||
    input.sourceStateVersion < 0 ||
    input.sourceWorldSeq < 0n
  ) {
    throw new ScheduledWakeStoreError(
      "INVALID_WAKE",
      "Work boundary source state is invalid",
    );
  }
  const dueWorldTime = nextWorkBoundaryWorldTime(
    new Date(input.worldTime.getTime() + 1),
  );
  const dedupeKey = [
    WORK_BOUNDARY_POLICY_VERSION,
    "WORK_BOUNDARY",
    input.worldId,
    input.residentId,
    dueWorldTime.toISOString(),
  ].join("|");
  const wake: ScheduledWakeRegistration = {
    policyVersion: WORK_BOUNDARY_POLICY_VERSION,
    wakeId: deterministicWakeId(dedupeKey),
    worldId: input.worldId,
    residentId: input.residentId,
    wakeReason: "WORK_BOUNDARY",
    dueWorldTime: dueWorldTime.toISOString(),
    sourceStateVersion: input.sourceStateVersion,
    sourceWorldSeq: input.sourceWorldSeq.toString(),
    decisionEpoch: input.decisionEpoch ?? 0,
    dedupeKey,
  };
  const [existing] = await transaction
    .select()
    .from(scheduledWakeRegistrations)
    .where(
      and(
        eq(scheduledWakeRegistrations.worldId, wake.worldId),
        eq(scheduledWakeRegistrations.dedupeKey, wake.dedupeKey),
      ),
    )
    .for("update");
  if (existing) {
    const persisted = toRegistration(existing);
    if (
      persisted.wakeId !== wake.wakeId ||
      persisted.residentId !== wake.residentId ||
      persisted.wakeReason !== wake.wakeReason ||
      persisted.dueWorldTime !== wake.dueWorldTime ||
      persisted.policyVersion !== wake.policyVersion
    ) {
      throw new ScheduledWakeStoreError(
        "WAKE_REGISTRATION_CONFLICT",
        `Scheduled wake dedupe key ${wake.dedupeKey} is already registered with different content`,
      );
    }
    const [updated] = await transaction
      .update(scheduledWakeRegistrations)
      .set({
        sourceStateVersion: wake.sourceStateVersion,
        sourceWorldSeq: BigInt(wake.sourceWorldSeq),
        decisionEpoch: wake.decisionEpoch,
      })
      .where(eq(scheduledWakeRegistrations.wakeId, wake.wakeId))
      .returning();
    if (!updated) {
      throw new ScheduledWakeStoreError(
        "INVALID_WAKE",
        "Scheduled work boundary wake could not be refreshed",
      );
    }
    return toRegistration(updated);
  }
  return registerScheduledWakeInTransaction(transaction, wake);
}

export async function registerNextWorkBoundaryWakes(
  database: ScheduledWakeDatabase,
  input: Readonly<{ worldId: string; decisionEpoch?: number }>,
): Promise<readonly ScheduledWakeRegistration[]> {
  return database.transaction(async (transaction) => {
    const [world] = await transaction
      .select({
        id: worlds.id,
        seed: worlds.seed,
        worldTime: worlds.worldTime,
        worldSeq: worlds.worldSeq,
      })
      .from(worlds)
      .where(eq(worlds.id, input.worldId))
      .for("update");
    if (!world) {
      throw new ScheduledWakeStoreError(
        "INVALID_WAKE",
        `World ${input.worldId} was not found`,
      );
    }
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.filter(({ employment }) => employment.status === "EMPLOYED");
    const runtimeRows = await transaction
      .select({
        residentId: residentRuntimeStates.residentId,
        stateVersion: residentRuntimeStates.stateVersion,
      })
      .from(residentRuntimeStates)
      .where(eq(residentRuntimeStates.worldId, world.id));
    const versions = new Map(
      runtimeRows.map((row) => [row.residentId, row.stateVersion]),
    );
    const registrations: ScheduledWakeRegistration[] = [];
    for (const resident of residents.sort((left, right) =>
      left.residentId.localeCompare(right.residentId),
    )) {
      const sourceStateVersion = versions.get(resident.residentId);
      if (sourceStateVersion === undefined) continue;
      const registration = await registerNextWorkBoundaryWakeInTransaction(
        transaction,
        {
          worldId: world.id,
          worldSeed: world.seed,
          worldTime: world.worldTime,
          sourceWorldSeq: world.worldSeq,
          residentId: resident.residentId,
          sourceStateVersion,
          decisionEpoch: input.decisionEpoch,
        },
      );
      if (registration) registrations.push(registration);
    }
    return registrations;
  });
}

function toRegistration(row: ScheduledWakeRow): ScheduledWakeRegistration {
  return parseScheduledWakeRegistration({
    policyVersion: row.policyVersion,
    wakeId: row.wakeId,
    worldId: row.worldId,
    residentId: row.residentId,
    wakeReason: row.wakeReason,
    dueWorldTime: row.dueWorldTime.toISOString(),
    sourceStateVersion: row.sourceStateVersion,
    sourceWorldSeq: row.sourceWorldSeq.toString(),
    decisionEpoch: row.decisionEpoch,
    dedupeKey: row.dedupeKey,
  });
}

export async function registerScheduledWake(
  database: ScheduledWakeDatabase,
  input: ScheduledWakeRegistration,
): Promise<ScheduledWakeRegistration> {
  return database.transaction((transaction) =>
    registerScheduledWakeInTransaction(transaction, input),
  );
}

export async function readDueScheduledWakes(
  database: ScheduledWakeDatabase,
  input: ScheduledWakeReadInput,
): Promise<readonly ScheduledWakeRegistration[]> {
  if (
    input.worldId.trim().length === 0 ||
    Number.isNaN(input.targetWorldTime.getTime()) ||
    !Number.isInteger(input.limit) ||
    input.limit <= 0
  ) {
    throw new ScheduledWakeStoreError(
      "INVALID_WAKE",
      "Scheduled wake query is invalid",
    );
  }

  const rows = await database
    .select()
    .from(scheduledWakeRegistrations)
    .where(
      and(
        eq(scheduledWakeRegistrations.worldId, input.worldId),
        lte(scheduledWakeRegistrations.dueWorldTime, input.targetWorldTime),
      ),
    )
    .orderBy(
      asc(scheduledWakeRegistrations.dueWorldTime),
      asc(scheduledWakeRegistrations.residentId),
      asc(scheduledWakeRegistrations.wakeReason),
      asc(scheduledWakeRegistrations.decisionEpoch),
      asc(scheduledWakeRegistrations.wakeId),
    )
    .limit(input.limit);

  return rows.map(toRegistration);
}

export async function readNextScheduledWakeWorldTime(
  database: ScheduledWakeDatabase,
  input: Readonly<{ worldId: string }>,
): Promise<Date | null> {
  const [row] = await database
    .select({ dueWorldTime: scheduledWakeRegistrations.dueWorldTime })
    .from(scheduledWakeRegistrations)
    .where(eq(scheduledWakeRegistrations.worldId, input.worldId))
    .orderBy(
      asc(scheduledWakeRegistrations.dueWorldTime),
      asc(scheduledWakeRegistrations.residentId),
      asc(scheduledWakeRegistrations.wakeId),
    )
    .limit(1);
  return row?.dueWorldTime ? new Date(row.dueWorldTime.getTime()) : null;
}
