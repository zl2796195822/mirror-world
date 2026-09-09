import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { type DueActivity, type DueActivityReadInput } from "@mirror/contracts";
import { createDb } from "./client.js";
import { residentRuntimeStates } from "./schema.js";

export const DUE_ACTIVITY_MAX_BATCH_SIZE = 30 as const;
export type DueActivityDatabase = ReturnType<typeof createDb>["db"];

export class DueActivityStoreError extends Error {
  constructor(
    public readonly code: "INVALID_QUERY",
    message: string,
  ) {
    super(message);
    this.name = "DueActivityStoreError";
  }
}

export async function readDueActivities(
  database: DueActivityDatabase,
  input: DueActivityReadInput,
): Promise<readonly DueActivity[]> {
  if (
    input.worldId.trim().length === 0 ||
    Number.isNaN(input.targetWorldTime.getTime()) ||
    !Number.isInteger(input.limit) ||
    input.limit <= 0 ||
    input.limit > DUE_ACTIVITY_MAX_BATCH_SIZE
  ) {
    throw new DueActivityStoreError(
      "INVALID_QUERY",
      `Due activity query requires a positive limit up to ${DUE_ACTIVITY_MAX_BATCH_SIZE}`,
    );
  }

  const rows = await database
    .select({
      worldId: residentRuntimeStates.worldId,
      residentId: residentRuntimeStates.residentId,
      activityInstanceId: residentRuntimeStates.activityInstanceId,
      activityKind: residentRuntimeStates.currentActivity,
      dueWorldTime: residentRuntimeStates.activityDueAtWorldTime,
      stateVersion: residentRuntimeStates.stateVersion,
      sourceWorldSeq: residentRuntimeStates.sourceWorldSeq,
    })
    .from(residentRuntimeStates)
    .where(
      and(
        eq(residentRuntimeStates.worldId, input.worldId),
        inArray(residentRuntimeStates.currentActivity, [
          "TRAVELING",
          "SLEEPING",
        ]),
        isNotNull(residentRuntimeStates.activityInstanceId),
        isNotNull(residentRuntimeStates.activityDueAtWorldTime),
        lte(
          residentRuntimeStates.activityDueAtWorldTime,
          input.targetWorldTime,
        ),
      ),
    )
    .orderBy(
      asc(residentRuntimeStates.activityDueAtWorldTime),
      asc(residentRuntimeStates.residentId),
      asc(residentRuntimeStates.activityInstanceId),
    )
    .limit(input.limit);

  return rows.map((row) => {
    if (
      (row.activityKind !== "TRAVELING" && row.activityKind !== "SLEEPING") ||
      row.activityInstanceId === null ||
      row.dueWorldTime === null
    ) {
      throw new DueActivityStoreError(
        "INVALID_QUERY",
        "Due activity query returned an invalid runtime state",
      );
    }
    return {
      worldId: row.worldId,
      residentId: row.residentId,
      activityInstanceId: row.activityInstanceId,
      activityKind: row.activityKind,
      dueWorldTime: new Date(row.dueWorldTime.getTime()),
      stateVersion: row.stateVersion,
      sourceWorldSeq: row.sourceWorldSeq.toString(),
    };
  });
}

export async function readNextActivityDueWorldTime(
  database: DueActivityDatabase,
  input: Readonly<{ worldId: string }>,
): Promise<Date | null> {
  const [row] = await database
    .select({ dueWorldTime: residentRuntimeStates.activityDueAtWorldTime })
    .from(residentRuntimeStates)
    .where(
      and(
        eq(residentRuntimeStates.worldId, input.worldId),
        inArray(residentRuntimeStates.currentActivity, [
          "TRAVELING",
          "SLEEPING",
        ]),
        isNotNull(residentRuntimeStates.activityDueAtWorldTime),
      ),
    )
    .orderBy(
      asc(residentRuntimeStates.activityDueAtWorldTime),
      asc(residentRuntimeStates.residentId),
    )
    .limit(1);
  return row?.dueWorldTime ? new Date(row.dueWorldTime.getTime()) : null;
}
