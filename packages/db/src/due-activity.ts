import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { type DueActivity, type DueActivityReadInput } from "@mirror/contracts";
import { createDb } from "./client.js";
import { generateResidentSeed } from "./resident-seed.js";
import { actionRequests, residentRuntimeStates, worlds } from "./schema.js";

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

type DueActivityQueryRow = {
  worldId: string;
  residentId: string;
  activityInstanceId: string | null;
  activityKind: string;
  dueWorldTime: Date | null;
  stateVersion: number;
  sourceWorldSeq: bigint;
  requestActorId: string | null;
  worldSeed: string;
};

const DUE_ACTIVITY_KINDS = [
  "TRAVELING",
  "SLEEPING",
  "EATING",
  "WORKING",
  "TALKING",
] as const;

function isDueActivityKind(
  value: string,
): value is DueActivity["activityKind"] {
  return DUE_ACTIVITY_KINDS.includes(value as DueActivity["activityKind"]);
}

function uuidSort(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requestOwnerResidentId(row: DueActivityQueryRow): string | null {
  if (row.requestActorId === null) return null;
  return (
    generateResidentSeed({
      worldId: row.worldId,
      seed: row.worldSeed,
    }).residents.find(({ actorRef }) => actorRef.actorId === row.requestActorId)
      ?.residentId ?? null
  );
}

function toDueActivity(row: DueActivityQueryRow): DueActivity {
  if (
    !isDueActivityKind(row.activityKind) ||
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
}

function coalesceTalkRows(rows: readonly DueActivityQueryRow[]): DueActivity {
  const first = rows[0];
  if (!first) {
    throw new DueActivityStoreError(
      "INVALID_QUERY",
      "TALK due activity group is empty",
    );
  }
  if (
    first.activityKind !== "TALKING" ||
    first.activityInstanceId === null ||
    first.dueWorldTime === null ||
    rows.length !== 2 ||
    new Set(rows.map(({ residentId }) => residentId)).size !== 2 ||
    rows.some(
      (row) =>
        row.activityKind !== "TALKING" ||
        row.activityInstanceId !== first.activityInstanceId ||
        row.dueWorldTime?.getTime() !== first.dueWorldTime?.getTime(),
    )
  ) {
    throw new DueActivityStoreError(
      "INVALID_QUERY",
      "TALK due activity rows do not describe one shared activity",
    );
  }

  const ownerResidentId = rows
    .map(requestOwnerResidentId)
    .find((residentId): residentId is string => residentId !== null);
  const owner =
    rows.find(({ residentId }) => residentId === ownerResidentId) ??
    [...rows].sort((left, right) =>
      uuidSort(left.residentId, right.residentId),
    )[0];
  return toDueActivity(owner);
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

  const rows: DueActivityQueryRow[] = await database
    .select({
      worldId: residentRuntimeStates.worldId,
      residentId: residentRuntimeStates.residentId,
      activityInstanceId: residentRuntimeStates.activityInstanceId,
      activityKind: residentRuntimeStates.currentActivity,
      dueWorldTime: residentRuntimeStates.activityDueAtWorldTime,
      stateVersion: residentRuntimeStates.stateVersion,
      sourceWorldSeq: residentRuntimeStates.sourceWorldSeq,
      requestActorId: actionRequests.actorId,
      worldSeed: worlds.seed,
    })
    .from(residentRuntimeStates)
    .innerJoin(worlds, eq(worlds.id, residentRuntimeStates.worldId))
    .leftJoin(
      actionRequests,
      and(
        eq(actionRequests.id, residentRuntimeStates.activityInstanceId),
        eq(actionRequests.worldId, residentRuntimeStates.worldId),
      ),
    )
    .where(
      and(
        eq(residentRuntimeStates.worldId, input.worldId),
        inArray(residentRuntimeStates.currentActivity, DUE_ACTIVITY_KINDS),
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
    // TALK contributes two runtime rows to one scheduler work item.
    .limit(input.limit * 2);

  const activities: DueActivity[] = [];
  const talkRows = new Map<string, DueActivityQueryRow[]>();
  for (const row of rows) {
    if (row.activityKind === "TALKING") {
      if (row.activityInstanceId === null) {
        throw new DueActivityStoreError(
          "INVALID_QUERY",
          "Due TALK activity is missing its activity instance",
        );
      }
      const group = talkRows.get(row.activityInstanceId) ?? [];
      group.push(row);
      talkRows.set(row.activityInstanceId, group);
    } else {
      activities.push(toDueActivity(row));
    }
  }
  for (const group of talkRows.values()) {
    activities.push(coalesceTalkRows(group));
  }
  return activities
    .sort(
      (left, right) =>
        left.dueWorldTime.getTime() - right.dueWorldTime.getTime() ||
        uuidSort(left.residentId, right.residentId) ||
        uuidSort(left.activityInstanceId, right.activityInstanceId),
    )
    .slice(0, input.limit);
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
        inArray(residentRuntimeStates.currentActivity, DUE_ACTIVITY_KINDS),
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
