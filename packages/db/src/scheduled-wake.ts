import { and, asc, eq, lte } from "drizzle-orm";
import {
  parseScheduledWakeRegistration,
  type ScheduledWakeReadInput,
  type ScheduledWakeRegistration,
} from "@mirror/contracts";
import { createDb } from "./client.js";
import { scheduledWakeRegistrations } from "./schema.js";

export type ScheduledWakeDatabase = ReturnType<typeof createDb>["db"];
export type ScheduledWakeRow = typeof scheduledWakeRegistrations.$inferSelect;

export class ScheduledWakeStoreError extends Error {
  constructor(
    public readonly code: "INVALID_WAKE" | "WAKE_REGISTRATION_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ScheduledWakeStoreError";
  }
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
  const wake = parseScheduledWakeRegistration(input);
  const values = {
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
  };

  await database
    .insert(scheduledWakeRegistrations)
    .values(values)
    .onConflictDoNothing({
      target: [
        scheduledWakeRegistrations.worldId,
        scheduledWakeRegistrations.dedupeKey,
      ],
    });

  const [row] = await database
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
