import {
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  type ResidentSeed,
} from "@mirror/db";
import {
  parseResidentRuntimeObservation,
  RUNTIME_STATE_POLICY_VERSION,
  type ResidentRuntimeObservation,
  type ResidentActivity,
  type ResidentRuntimeStateReadPort,
  type WorkObligationSnapshot,
} from "@mirror/contracts";
import {
  readResidentRuntimeStateRows,
  type ResidentRuntimeStateDatabase,
  type ResidentRuntimeStateRow,
} from "@mirror/db";

export const M3_RUNTIME_STATE_POLICY = {
  version: RUNTIME_STATE_POLICY_VERSION,
  initialLocation: "HOME",
  initialActivity: "IDLE",
  workSchedule: {
    weekdaysUtc: [1, 2, 3, 4, 5],
    startHourUtc: 9,
    endHourUtc: 17,
  },
} as const;
export const RESIDENT_RUNTIME_MAX_BATCH_SIZE = 30 as const;

function assertWorldTime(value: Date): void {
  if (Number.isNaN(value.getTime())) {
    throw new Error("Resident runtime worldTime must be valid");
  }
}

function assertInput(input: {
  worldId: string;
  worldSeed: string;
  worldSeq: string;
  resident: ResidentSeed;
}): void {
  if (
    input.worldId.trim().length === 0 ||
    input.worldSeed.trim().length === 0 ||
    !/^\d+$/.test(input.worldSeq)
  ) {
    throw new Error("Resident runtime input is invalid");
  }
  if (input.resident.worldId !== input.worldId) {
    throw new Error("Resident runtime resident belongs to another world");
  }
}

function activityFromRow(
  row: ResidentRuntimeStateRow,
  participantRow?: ResidentRuntimeStateRow,
): ResidentActivity {
  if (row.currentActivity === "IDLE") {
    if (
      row.activityInstanceId !== null ||
      row.activityTargetLocationId !== null ||
      row.activityTargetResidentId !== null ||
      row.activityStartedAtWorldTime !== null ||
      row.activityDueAtWorldTime !== null
    ) {
      throw new ResidentRuntimeAuthorityError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Idle runtime state contains active activity metadata",
      );
    }
    return { kind: "IDLE" };
  }

  if (
    row.activityInstanceId === null ||
    row.activityStartedAtWorldTime === null ||
    row.activityDueAtWorldTime === null
  ) {
    throw new ResidentRuntimeAuthorityError(
      "RUNTIME_STATE_UNAVAILABLE",
      "Active runtime state is missing activity metadata",
    );
  }

  if (row.currentActivity === "TRAVELING") {
    if (row.activityTargetLocationId === null) {
      throw new ResidentRuntimeAuthorityError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Traveling runtime state is missing its target location",
      );
    }
    return {
      kind: "TRAVELING",
      activityInstanceId: row.activityInstanceId,
      targetLocationId: row.activityTargetLocationId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }

  if (row.currentActivity === "SLEEPING") {
    if (
      row.activityTargetLocationId !== null ||
      row.activityTargetResidentId !== null
    ) {
      throw new ResidentRuntimeAuthorityError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Sleeping runtime state cannot contain a target location",
      );
    }
    return {
      kind: "SLEEPING",
      activityInstanceId: row.activityInstanceId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }

  if (row.currentActivity === "EATING" || row.currentActivity === "WORKING") {
    if (
      row.activityTargetLocationId !== null ||
      row.activityTargetResidentId !== null
    ) {
      throw new ResidentRuntimeAuthorityError(
        "RUNTIME_STATE_UNAVAILABLE",
        `${row.currentActivity} runtime state cannot contain a target`,
      );
    }
    return {
      kind: row.currentActivity,
      activityInstanceId: row.activityInstanceId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }

  if (row.currentActivity === "TALKING") {
    if (
      row.activityTargetLocationId !== null ||
      row.activityTargetResidentId === null ||
      !participantRow ||
      participantRow.worldId !== row.worldId ||
      participantRow.runtimePolicyVersion !== RUNTIME_STATE_POLICY_VERSION ||
      participantRow.currentActivity !== "TALKING" ||
      participantRow.currentLocationId !== row.currentLocationId ||
      participantRow.activityInstanceId !== row.activityInstanceId ||
      participantRow.activityTargetResidentId !== row.residentId ||
      participantRow.activityTargetLocationId !== null ||
      participantRow.activityStartedAtWorldTime?.getTime() !==
        row.activityStartedAtWorldTime.getTime() ||
      participantRow.activityDueAtWorldTime?.getTime() !==
        row.activityDueAtWorldTime.getTime()
    ) {
      throw new ResidentRuntimeAuthorityError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Talking runtime state must contain a resident target",
      );
    }
    return {
      kind: "TALKING",
      activityInstanceId: row.activityInstanceId,
      targetResidentId: row.activityTargetResidentId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }

  throw new ResidentRuntimeAuthorityError(
    "RUNTIME_STATE_UNAVAILABLE",
    `Unsupported resident runtime activity: ${row.currentActivity}`,
  );
}

function currentShift(input: {
  worldId: string;
  residentId: string;
  worldTime: Date;
  workplaceId: string;
}): WorkObligationSnapshot {
  const weekday = input.worldTime.getUTCDay();
  const isWorkday = M3_RUNTIME_STATE_POLICY.workSchedule.weekdaysUtc.includes(
    weekday as (typeof M3_RUNTIME_STATE_POLICY.workSchedule.weekdaysUtc)[number],
  );
  if (!isWorkday) {
    return {
      policyVersion: RUNTIME_STATE_POLICY_VERSION,
      worldId: input.worldId,
      residentId: input.residentId,
      status: "NOT_DUE",
      workplaceId: input.workplaceId,
      startsAtWorldTime: null,
      endsAtWorldTime: null,
    };
  }

  const dayStart = Date.UTC(
    input.worldTime.getUTCFullYear(),
    input.worldTime.getUTCMonth(),
    input.worldTime.getUTCDate(),
  );
  const shiftStart = new Date(
    dayStart + M3_RUNTIME_STATE_POLICY.workSchedule.startHourUtc * 3_600_000,
  );
  const shiftEnd = new Date(
    dayStart + M3_RUNTIME_STATE_POLICY.workSchedule.endHourUtc * 3_600_000,
  );
  const currentTime = input.worldTime.getTime();
  const status =
    currentTime < shiftStart.getTime()
      ? "NOT_DUE"
      : currentTime < shiftEnd.getTime()
        ? "DUE"
        : "LATE";

  return {
    policyVersion: RUNTIME_STATE_POLICY_VERSION,
    worldId: input.worldId,
    residentId: input.residentId,
    status,
    workplaceId: input.workplaceId,
    startsAtWorldTime: shiftStart.toISOString(),
    endsAtWorldTime: shiftEnd.toISOString(),
  };
}

export class ResidentRuntimeAuthorityError extends Error {
  constructor(
    public readonly code:
      | "INVALID_QUERY"
      | "RESIDENT_NOT_FOUND"
      | "STALE_READ"
      | "RUNTIME_STATE_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "ResidentRuntimeAuthorityError";
  }
}

export function deriveResidentRuntimeObservation(input: {
  worldId: string;
  worldSeed: string;
  worldSeq: string;
  worldTime: Date;
  resident: ResidentSeed;
}): ResidentRuntimeObservation {
  assertInput(input);
  assertWorldTime(input.worldTime);

  const locations = getFirstStreetLocationFixtures(input.worldId);
  const home = locations.find(({ id }) => id === input.resident.homeLocationId);
  if (!home || home.kind !== M3_RUNTIME_STATE_POLICY.initialLocation) {
    throw new Error("Resident runtime home location is not a valid fixture");
  }

  const workObligation =
    input.resident.employment.status === "EMPLOYED"
      ? currentShift({
          worldId: input.worldId,
          residentId: input.resident.residentId,
          worldTime: input.worldTime,
          workplaceId: input.resident.employment.workplaceId,
        })
      : {
          policyVersion: RUNTIME_STATE_POLICY_VERSION,
          worldId: input.worldId,
          residentId: input.resident.residentId,
          status: "NO_CURRENT_OBLIGATION" as const,
          workplaceId: null,
          startsAtWorldTime: null,
          endsAtWorldTime: null,
        };

  return parseResidentRuntimeObservation({
    runtimeState: {
      policyVersion: RUNTIME_STATE_POLICY_VERSION,
      worldId: input.worldId,
      residentId: input.resident.residentId,
      currentLocation: {
        worldId: input.worldId,
        locationId: home.id,
        key: home.key,
        kind: home.kind,
      },
      activity: { kind: M3_RUNTIME_STATE_POLICY.initialActivity },
      stateVersion: 0,
      sourceWorldSeq: input.worldSeq,
    },
    workObligation: {
      ...workObligation,
      worldId: input.worldId,
      residentId: input.resident.residentId,
    },
  });
}

export function createPostgresResidentRuntimeStateReadPort(
  database: ResidentRuntimeStateDatabase,
  input: Readonly<{ worldId: string; worldSeed: string }>,
): ResidentRuntimeStateReadPort {
  return {
    async getResidentRuntimeStates(query) {
      if (
        query.worldId !== input.worldId ||
        query.worldId.trim().length === 0 ||
        !/^\d+$/.test(query.sourceWorldSeq) ||
        Number.isNaN(query.worldTime.getTime())
      ) {
        throw new ResidentRuntimeAuthorityError(
          "INVALID_QUERY",
          "Resident runtime query is invalid or belongs to another world",
        );
      }
      if (
        query.residentIds.length === 0 ||
        query.residentIds.length > RESIDENT_RUNTIME_MAX_BATCH_SIZE ||
        new Set(query.residentIds).size !== query.residentIds.length ||
        query.residentIds.some((residentId) => residentId.trim().length === 0)
      ) {
        throw new ResidentRuntimeAuthorityError(
          "INVALID_QUERY",
          `Resident runtime query requires 1-${RESIDENT_RUNTIME_MAX_BATCH_SIZE} unique resident ids`,
        );
      }

      const fixture = generateResidentSeed({
        worldId: input.worldId,
        seed: input.worldSeed,
      });
      const residentsById = new Map(
        fixture.residents.map((resident) => [resident.residentId, resident]),
      );
      const rows = await readResidentRuntimeStateRows(database, {
        worldId: input.worldId,
        residentIds: query.residentIds,
      });
      const rowsByResidentId = new Map(
        rows.map((row) => [row.residentId, row]),
      );
      const participantIds = rows.flatMap((row) =>
        row.currentActivity === "TALKING" && row.activityTargetResidentId
          ? [row.activityTargetResidentId]
          : [],
      );
      const participantRows = await readResidentRuntimeStateRows(database, {
        worldId: input.worldId,
        residentIds: [...new Set(participantIds)],
      });
      const runtimeRowsByResidentId = new Map([
        ...rowsByResidentId,
        ...participantRows.map((row) => [row.residentId, row] as const),
      ]);

      return [...query.residentIds].sort().map((residentId) => {
        const resident = residentsById.get(residentId);
        if (!resident) {
          throw new ResidentRuntimeAuthorityError(
            "RESIDENT_NOT_FOUND",
            `Resident ${residentId} was not found in world ${input.worldId}`,
          );
        }
        const row = rowsByResidentId.get(residentId);
        if (!row) {
          throw new ResidentRuntimeAuthorityError(
            "RUNTIME_STATE_UNAVAILABLE",
            `Runtime state for resident ${residentId} has not been bootstrapped`,
          );
        }
        if (row.sourceWorldSeq > BigInt(query.sourceWorldSeq)) {
          throw new ResidentRuntimeAuthorityError(
            "STALE_READ",
            `Runtime state for resident ${residentId} is ahead of world sequence ${query.sourceWorldSeq}`,
          );
        }
        const location = getFirstStreetLocationFixtures(input.worldId).find(
          ({ id }) => id === row.currentLocationId,
        );
        if (
          !location ||
          row.runtimePolicyVersion !== RUNTIME_STATE_POLICY_VERSION
        ) {
          throw new ResidentRuntimeAuthorityError(
            "RUNTIME_STATE_UNAVAILABLE",
            `Runtime state for resident ${residentId} has an invalid authority reference`,
          );
        }
        const derived = deriveResidentRuntimeObservation({
          worldId: input.worldId,
          worldSeed: input.worldSeed,
          worldSeq: query.sourceWorldSeq,
          worldTime: query.worldTime,
          resident,
        });
        const completedWorkShiftKeys = Array.isArray(row.completedWorkShiftKeys)
          ? row.completedWorkShiftKeys.filter(
              (value): value is string => typeof value === "string",
            )
          : [];
        return parseResidentRuntimeObservation({
          runtimeState: {
            policyVersion: row.runtimePolicyVersion,
            worldId: row.worldId,
            residentId: row.residentId,
            currentLocation: {
              worldId: row.worldId,
              locationId: location.id,
              key: location.key,
              kind: location.kind,
            },
            activity: activityFromRow(
              row,
              row.activityTargetResidentId
                ? runtimeRowsByResidentId.get(row.activityTargetResidentId)
                : undefined,
            ),
            stateVersion: row.stateVersion,
            sourceWorldSeq: row.sourceWorldSeq.toString(),
          },
          workObligation: {
            ...derived.workObligation,
            completedWorkShiftKeys,
          },
        });
      });
    },
  };
}
