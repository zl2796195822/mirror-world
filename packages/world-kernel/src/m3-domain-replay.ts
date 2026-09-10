import { createHash } from "node:crypto";
import { getResidentFoodItemId, type ResidentSeedBundle } from "@mirror/db";
import {
  EAT_DURATION_WORLD_MINUTES,
  LIFECYCLE_SEMANTICS_POLICY_VERSION,
  NEED_EFFECTS_POLICY_VERSION,
  TALK_DURATION_WORLD_MINUTES,
  WORK_ATTENDANCE_MINUTES,
  getWorkShift,
  workObligationKey,
} from "./lifecycle-semantics.js";

export const M3_DOMAIN_EVENT_REGISTRY_VERSION =
  "m3-domain-event-registry-v2" as const;
export const M3_DOMAIN_REPLAY_SCHEMA_VERSION =
  "m3-resident-projection-v2" as const;

export const M3_TYPED_EVENT_TYPES = [
  "WORLD_TIME_ADVANCED",
  "RESIDENT_MOVE_STARTED",
  "RESIDENT_MOVE_COMPLETED",
  "RESIDENT_SLEEP_STARTED",
  "RESIDENT_SLEEP_COMPLETED",
  "RESIDENT_EAT_STARTED",
  "RESIDENT_EAT_COMPLETED",
  "RESIDENT_WORK_STARTED",
  "RESIDENT_WORK_COMPLETED",
  "RESIDENT_TALK_STARTED",
  "RESIDENT_TALK_COMPLETED",
] as const;

export type M3TypedEventType = (typeof M3_TYPED_EVENT_TYPES)[number];

export type M3ReplayEvent = Readonly<{
  id: string;
  worldId: string;
  seq: bigint;
  type: string;
  actorId: string | null;
  targetId: string | null;
  payload: unknown;
  occurredAt: Date;
}>;

export type M3ResidentProjection = Readonly<{
  residentId: string;
  actorId: string;
  locationId: string;
  activity:
    | "IDLE"
    | "TRAVELING"
    | "SLEEPING"
    | "EATING"
    | "WORKING"
    | "TALKING";
  activityInstanceId: string | null;
  activityTargetLocationId: string | null;
  activityTargetResidentId: string | null;
  startedAtWorldTime: string | null;
  dueAtWorldTime: string | null;
  foodUnits: number;
  resourceVersion: number;
  lastAteAtWorldTime: string | null;
  lastSocialContactAtWorldTime: string | null;
  completedWorkShiftKeys: readonly string[];
  stateVersion: number;
  sourceWorldSeq: string;
}>;

export type M3ResidentProjectionSnapshot = Readonly<{
  schemaVersion: typeof M3_DOMAIN_REPLAY_SCHEMA_VERSION;
  registryVersion: typeof M3_DOMAIN_EVENT_REGISTRY_VERSION;
  worldId: string;
  worldTime: string;
  worldSeq: string;
  residents: readonly M3ResidentProjection[];
}>;

export type M3ResidentProjectionCheckpoint = Readonly<{
  worldId: string;
  worldSeq: bigint;
  checksum: string;
  snapshot: M3ResidentProjectionSnapshot;
}>;

export class M3DomainReplayError extends Error {
  constructor(
    public readonly code:
      | "WORLD_MISMATCH"
      | "SEQ_MISMATCH"
      | "UNKNOWN_EVENT"
      | "INVALID_PAYLOAD"
      | "INVALID_TRANSITION",
    message: string,
  ) {
    super(message);
    this.name = "M3DomainReplayError";
  }
}

function recordPayload(payload: unknown): Record<string, unknown> {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "M3 event payload must be an object",
    );
  }
  const record = payload as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "M3 event payload schemaVersion must be 1",
    );
  }
  return record;
}

function stringField(payload: Record<string, unknown>, name: string): string {
  const value = payload[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `M3 event payload field ${name} must be a non-empty string`,
    );
  }
  return value;
}

function isoField(payload: Record<string, unknown>, name: string): string {
  const value = stringField(payload, name);
  if (Number.isNaN(new Date(value).getTime())) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `M3 event payload field ${name} must be an ISO date`,
    );
  }
  return new Date(value).toISOString();
}

function integerField(
  payload: Record<string, unknown>,
  name: string,
  options: Readonly<{ min?: number }> = {},
): number {
  const value = payload[name];
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    (options.min !== undefined && value < options.min)
  ) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `M3 event payload field ${name} must be a safe integer`,
    );
  }
  return value;
}

function objectField(
  payload: Record<string, unknown>,
  name: string,
): Record<string, unknown> {
  const value = payload[name];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `M3 event payload field ${name} must be an object`,
    );
  }
  return value as Record<string, unknown>;
}

function assertEventTime(
  event: M3ReplayEvent,
  payload: Record<string, unknown>,
  phase: "STARTED" | "COMPLETED",
): {
  startedAtWorldTime: string;
  dueAtWorldTime: string;
  completedAtWorldTime?: string;
} {
  const startedAtWorldTime = isoField(payload, "startedAtWorldTime");
  const dueAtWorldTime = isoField(payload, "dueAtWorldTime");
  if (
    new Date(dueAtWorldTime).getTime() < new Date(startedAtWorldTime).getTime()
  ) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "M3 activity due time must not precede its start time",
    );
  }
  if (
    event.occurredAt.toISOString() !==
    (phase === "STARTED"
      ? startedAtWorldTime
      : isoField(payload, "completedAtWorldTime"))
  ) {
    throw new M3DomainReplayError(
      "INVALID_TRANSITION",
      `M3 ${phase.toLowerCase()} event time does not match its payload`,
    );
  }
  return phase === "COMPLETED"
    ? {
        startedAtWorldTime,
        dueAtWorldTime,
        completedAtWorldTime: isoField(payload, "completedAtWorldTime"),
      }
    : { startedAtWorldTime, dueAtWorldTime };
}

function assertLifecyclePayload(
  event: M3ReplayEvent,
  payload: Record<string, unknown>,
  actionType: "EAT" | "WORK" | "TALK",
  phase: "STARTED" | "COMPLETED",
  durationWorldMinutes: number,
): {
  actionRequestId: string;
  activityInstanceId: string;
  times: ReturnType<typeof assertEventTime>;
} {
  if (payload.actionType !== actionType || payload.phase !== phase) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `${event.type} does not match its action or phase`,
    );
  }
  const action = actionFields(event, payload);
  const times = assertEventTime(event, payload, phase);
  if (
    payload.policyVersion !== LIFECYCLE_SEMANTICS_POLICY_VERSION ||
    integerField(payload, "durationWorldMinutes", { min: 1 }) !==
      durationWorldMinutes ||
    new Date(times.dueAtWorldTime).getTime() -
      new Date(times.startedAtWorldTime).getTime() !==
      durationWorldMinutes * 60_000 ||
    (phase === "COMPLETED" &&
      new Date(times.completedAtWorldTime ?? 0).getTime() <
        new Date(times.dueAtWorldTime).getTime())
  ) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `${event.type} has an unsupported lifecycle policy or duration`,
    );
  }
  return { ...action, times };
}

function aliasedIsoField(
  payload: Record<string, unknown>,
  names: readonly string[],
): string {
  const name = names.find((candidate) => payload[candidate] !== undefined);
  if (!name) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `M3 event payload is missing one of ${names.join(", ")}`,
    );
  }
  return isoField(payload, name);
}

function assertSourceLocation(
  residentId: string,
  current: M3ResidentProjection,
  payload: Record<string, unknown>,
): void {
  if (stringField(payload, "sourceLocationId") !== current.locationId) {
    throw new M3DomainReplayError(
      "INVALID_TRANSITION",
      `Resident ${residentId} changed location without a replayed MOVE`,
    );
  }
}

function lifecycleEventSpec(type: M3TypedEventType):
  | Readonly<{
      actionType: "EAT" | "WORK" | "TALK";
      phase: "STARTED" | "COMPLETED";
      durationWorldMinutes: number;
    }>
  | undefined {
  switch (type) {
    case "RESIDENT_EAT_STARTED":
      return {
        actionType: "EAT",
        phase: "STARTED",
        durationWorldMinutes: EAT_DURATION_WORLD_MINUTES,
      };
    case "RESIDENT_EAT_COMPLETED":
      return {
        actionType: "EAT",
        phase: "COMPLETED",
        durationWorldMinutes: EAT_DURATION_WORLD_MINUTES,
      };
    case "RESIDENT_WORK_STARTED":
      return {
        actionType: "WORK",
        phase: "STARTED",
        durationWorldMinutes: WORK_ATTENDANCE_MINUTES,
      };
    case "RESIDENT_WORK_COMPLETED":
      return {
        actionType: "WORK",
        phase: "COMPLETED",
        durationWorldMinutes: WORK_ATTENDANCE_MINUTES,
      };
    case "RESIDENT_TALK_STARTED":
      return {
        actionType: "TALK",
        phase: "STARTED",
        durationWorldMinutes: TALK_DURATION_WORLD_MINUTES,
      };
    case "RESIDENT_TALK_COMPLETED":
      return {
        actionType: "TALK",
        phase: "COMPLETED",
        durationWorldMinutes: TALK_DURATION_WORLD_MINUTES,
      };
    default:
      return undefined;
  }
}

function applyLifecycleEvent(input: {
  worldId: string;
  event: M3ReplayEvent;
  type: M3TypedEventType;
  payload: Record<string, unknown>;
  residents: Map<string, M3ResidentProjection>;
  actors: Map<string, string>;
}): void {
  const spec = lifecycleEventSpec(input.type);
  if (!spec) return;
  const action = assertLifecyclePayload(
    input.event,
    input.payload,
    spec.actionType,
    spec.phase,
    spec.durationWorldMinutes,
  );
  const initiatorId = input.actors.get(input.event.actorId ?? "");
  if (!initiatorId) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `Event ${input.event.id} references an unknown resident actor`,
    );
  }
  const initiator = input.residents.get(initiatorId);
  if (!initiator) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `Resident ${initiatorId} is missing from the projection`,
    );
  }
  assertSourceLocation(initiatorId, initiator, input.payload);

  if (spec.actionType === "EAT") {
    const itemId = stringField(input.payload, "itemId");
    const quantity = integerField(input.payload, "quantity", { min: 1 });
    if (itemId !== getResidentFoodItemId(input.worldId, initiatorId)) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `EAT event ${input.event.id} references a food item outside its world resident scope`,
      );
    }
    if (input.event.targetId !== null && input.event.targetId !== itemId) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `EAT event ${input.event.id} has an invalid target item`,
      );
    }
    if (spec.phase === "STARTED") {
      const effect =
        input.payload.resourceEffect !== undefined
          ? objectField(input.payload, "resourceEffect")
          : input.payload;
      const beforeUnits = integerField(
        effect,
        input.payload.resourceEffect !== undefined
          ? "beforeUnits"
          : "foodBeforeUnits",
        { min: 0 },
      );
      const afterUnits = integerField(
        effect,
        input.payload.resourceEffect !== undefined
          ? "afterUnits"
          : "foodAfterUnits",
        { min: 0 },
      );
      const beforeVersion = integerField(
        effect,
        input.payload.resourceEffect !== undefined
          ? "beforeVersion"
          : "resourceBeforeVersion",
        { min: 0 },
      );
      const afterVersion = integerField(
        effect,
        input.payload.resourceEffect !== undefined
          ? "afterVersion"
          : "resourceAfterVersion",
        { min: 0 },
      );
      if (
        input.payload.resourceEffect !== undefined &&
        effect.kind !== "FOOD_UNITS_CONSUMED" &&
        effect.kind !== "KERNEL_OWNED_FOOD_CAS_AT_START"
      ) {
        throw new M3DomainReplayError(
          "INVALID_PAYLOAD",
          `EAT event ${input.event.id} has an invalid resource effect`,
        );
      }
      if (
        initiator.activity !== "IDLE" ||
        beforeUnits !== initiator.foodUnits ||
        afterUnits !== beforeUnits - quantity ||
        beforeVersion !== initiator.resourceVersion ||
        afterVersion !== beforeVersion + 1
      ) {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `EAT event ${input.event.id} violates food conservation`,
        );
      }
      input.residents.set(initiatorId, {
        ...initiator,
        activity: "EATING",
        activityInstanceId: action.activityInstanceId,
        activityTargetLocationId: null,
        activityTargetResidentId: null,
        startedAtWorldTime: action.times.startedAtWorldTime,
        dueAtWorldTime: action.times.dueAtWorldTime,
        foodUnits: afterUnits,
        resourceVersion: afterVersion,
        stateVersion: initiator.stateVersion + 1,
        sourceWorldSeq: input.event.seq.toString(),
      });
      return;
    }

    if (
      initiator.activity !== "EATING" ||
      initiator.activityInstanceId !== action.activityInstanceId ||
      initiator.startedAtWorldTime !== action.times.startedAtWorldTime ||
      initiator.dueAtWorldTime !== action.times.dueAtWorldTime
    ) {
      throw new M3DomainReplayError(
        "INVALID_TRANSITION",
        `Resident ${initiatorId} completed an unrelated EAT`,
      );
    }
    const effect = objectField(input.payload, "needEffect");
    const effectKind =
      typeof effect.kind === "string" ? effect.kind : effect.type;
    const reliefPoints =
      typeof effect.reliefPoints === "number"
        ? effect.reliefPoints
        : effect.amount;
    if (
      effectKind !== "HUNGER_PRESSURE_RELIEF" ||
      effect.policyVersion !== NEED_EFFECTS_POLICY_VERSION ||
      integerField(effect, "quantity", { min: 1 }) !== quantity ||
      reliefPoints !== 55 * quantity
    ) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `EAT completion ${input.event.id} has an invalid need effect`,
      );
    }
    input.residents.set(initiatorId, {
      ...initiator,
      activity: "IDLE",
      activityInstanceId: null,
      activityTargetLocationId: null,
      activityTargetResidentId: null,
      startedAtWorldTime: null,
      dueAtWorldTime: null,
      lastAteAtWorldTime: action.times.completedAtWorldTime ?? null,
      stateVersion: initiator.stateVersion + 1,
      sourceWorldSeq: input.event.seq.toString(),
    });
    return;
  }

  if (spec.actionType === "WORK") {
    const workplaceId = stringField(input.payload, "workplaceId");
    const shiftStart = aliasedIsoField(input.payload, [
      "shiftStartsAtWorldTime",
      "shiftStartedAtWorldTime",
      "startedAtWorldTime",
    ]);
    const shiftEnd = aliasedIsoField(input.payload, [
      "shiftEndsAtWorldTime",
      "shiftDueAtWorldTime",
      "dueAtWorldTime",
    ]);
    const obligationKey = stringField(input.payload, "workObligationKey");
    const shift = getWorkShift(new Date(shiftStart));
    if (
      input.event.targetId !== workplaceId ||
      initiator.locationId !== workplaceId ||
      shiftStart !== action.times.startedAtWorldTime ||
      shiftEnd !== action.times.dueAtWorldTime ||
      shift.status !== "DUE" ||
      shift.start !== shiftStart ||
      shift.end !== shiftEnd ||
      new Date(shiftEnd).getTime() - new Date(shiftStart).getTime() !==
        WORK_ATTENDANCE_MINUTES * 60_000 ||
      obligationKey !== workObligationKey(initiatorId, shiftStart)
    ) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `WORK event ${input.event.id} has an invalid obligation`,
      );
    }
    if (spec.phase === "STARTED") {
      if (
        initiator.activity !== "IDLE" ||
        initiator.completedWorkShiftKeys.includes(obligationKey)
      ) {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `Resident ${initiatorId} cannot start completed or active WORK`,
        );
      }
      input.residents.set(initiatorId, {
        ...initiator,
        activity: "WORKING",
        activityInstanceId: action.activityInstanceId,
        activityTargetLocationId: null,
        activityTargetResidentId: null,
        startedAtWorldTime: action.times.startedAtWorldTime,
        dueAtWorldTime: action.times.dueAtWorldTime,
        stateVersion: initiator.stateVersion + 1,
        sourceWorldSeq: input.event.seq.toString(),
      });
      return;
    }
    if (
      initiator.activity !== "WORKING" ||
      initiator.activityInstanceId !== action.activityInstanceId ||
      initiator.startedAtWorldTime !== action.times.startedAtWorldTime ||
      initiator.dueAtWorldTime !== action.times.dueAtWorldTime ||
      integerField(input.payload, "attendanceMinutes", { min: 0 }) !==
        WORK_ATTENDANCE_MINUTES
    ) {
      throw new M3DomainReplayError(
        "INVALID_TRANSITION",
        `Resident ${initiatorId} completed an unrelated WORK`,
      );
    }
    input.residents.set(initiatorId, {
      ...initiator,
      activity: "IDLE",
      activityInstanceId: null,
      activityTargetLocationId: null,
      activityTargetResidentId: null,
      startedAtWorldTime: null,
      dueAtWorldTime: null,
      completedWorkShiftKeys: [
        ...initiator.completedWorkShiftKeys,
        obligationKey,
      ].sort(),
      stateVersion: initiator.stateVersion + 1,
      sourceWorldSeq: input.event.seq.toString(),
    });
    return;
  }

  const participantId = stringField(input.payload, "participantId");
  const participantActorId = stringField(input.payload, "participantActorId");
  if (participantId !== participantActorId) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `TALK event ${input.event.id} must use the participant ActorRef actor id`,
    );
  }
  const participantResidentId = input.actors.get(participantActorId);
  const participant = participantResidentId
    ? input.residents.get(participantResidentId)
    : undefined;
  if (
    !participantResidentId ||
    input.event.targetId !== participantActorId ||
    participantResidentId === initiatorId ||
    !participant ||
    participant.locationId !== initiator.locationId
  ) {
    throw new M3DomainReplayError(
      "INVALID_TRANSITION",
      `TALK event ${input.event.id} does not reference a valid paired resident`,
    );
  }
  if (spec.phase === "STARTED") {
    if (initiator.activity !== "IDLE" || participant.activity !== "IDLE") {
      throw new M3DomainReplayError(
        "INVALID_TRANSITION",
        `TALK event ${input.event.id} starts while one resident is busy`,
      );
    }
    input.residents.set(initiatorId, {
      ...initiator,
      activity: "TALKING",
      activityInstanceId: action.activityInstanceId,
      activityTargetLocationId: null,
      activityTargetResidentId: participantResidentId,
      startedAtWorldTime: action.times.startedAtWorldTime,
      dueAtWorldTime: action.times.dueAtWorldTime,
      stateVersion: initiator.stateVersion + 1,
      sourceWorldSeq: input.event.seq.toString(),
    });
    input.residents.set(participantResidentId, {
      ...participant,
      activity: "TALKING",
      activityInstanceId: action.activityInstanceId,
      activityTargetLocationId: null,
      activityTargetResidentId: initiatorId,
      startedAtWorldTime: action.times.startedAtWorldTime,
      dueAtWorldTime: action.times.dueAtWorldTime,
      stateVersion: participant.stateVersion + 1,
      sourceWorldSeq: input.event.seq.toString(),
    });
    return;
  }
  if (
    initiator.activity !== "TALKING" ||
    participant.activity !== "TALKING" ||
    initiator.activityInstanceId !== action.activityInstanceId ||
    participant.activityInstanceId !== action.activityInstanceId ||
    initiator.startedAtWorldTime !== action.times.startedAtWorldTime ||
    initiator.dueAtWorldTime !== action.times.dueAtWorldTime ||
    participant.startedAtWorldTime !== action.times.startedAtWorldTime ||
    participant.dueAtWorldTime !== action.times.dueAtWorldTime ||
    initiator.activityTargetResidentId !== participantResidentId ||
    participant.activityTargetResidentId !== initiatorId
  ) {
    throw new M3DomainReplayError(
      "INVALID_TRANSITION",
      `TALK completion ${input.event.id} does not release a complete pair`,
    );
  }
  const effect = objectField(input.payload, "needEffect");
  const effectKind =
    typeof effect.kind === "string" ? effect.kind : effect.type;
  const reliefPoints =
    typeof effect.reliefPoints === "number"
      ? effect.reliefPoints
      : effect.amount;
  if (
    effectKind !== "SOCIAL_PRESSURE_RELIEF" ||
    effect.policyVersion !== NEED_EFFECTS_POLICY_VERSION ||
    reliefPoints !== 35
  ) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `TALK completion ${input.event.id} has an invalid need effect`,
    );
  }
  for (const [residentId, current] of [
    [initiatorId, initiator],
    [participantResidentId, participant],
  ] as const) {
    input.residents.set(residentId, {
      ...current,
      activity: "IDLE",
      activityInstanceId: null,
      activityTargetLocationId: null,
      activityTargetResidentId: null,
      startedAtWorldTime: null,
      dueAtWorldTime: null,
      lastSocialContactAtWorldTime: action.times.completedAtWorldTime ?? null,
      stateVersion: current.stateVersion + 1,
      sourceWorldSeq: input.event.seq.toString(),
    });
  }
}

function actionFields(
  event: M3ReplayEvent,
  payload: Record<string, unknown>,
): { actionRequestId: string; activityInstanceId: string } {
  if (!event.actorId) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `M3 event ${event.type} must have actorId`,
    );
  }
  const actionRequestId = stringField(payload, "actionRequestId");
  const activityInstanceId = stringField(payload, "activityInstanceId");
  if (actionRequestId !== activityInstanceId) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `Event ${event.id} must keep action request and activity identities equal`,
    );
  }
  return { actionRequestId, activityInstanceId };
}

function canonicalProjection(
  snapshot: M3ResidentProjectionSnapshot,
): M3ResidentProjectionSnapshot {
  assertProjectionShape(snapshot);
  return {
    schemaVersion: snapshot.schemaVersion,
    registryVersion: snapshot.registryVersion,
    worldId: snapshot.worldId,
    worldTime: new Date(snapshot.worldTime).toISOString(),
    worldSeq: BigInt(snapshot.worldSeq).toString(),
    residents: [...snapshot.residents]
      .sort((left, right) => left.residentId.localeCompare(right.residentId))
      .map((resident) => ({
        residentId: resident.residentId,
        actorId: resident.actorId,
        locationId: resident.locationId,
        activity: resident.activity,
        activityInstanceId: resident.activityInstanceId,
        activityTargetLocationId: resident.activityTargetLocationId,
        activityTargetResidentId: resident.activityTargetResidentId,
        startedAtWorldTime: resident.startedAtWorldTime
          ? new Date(resident.startedAtWorldTime).toISOString()
          : null,
        dueAtWorldTime: resident.dueAtWorldTime
          ? new Date(resident.dueAtWorldTime).toISOString()
          : null,
        foodUnits: resident.foodUnits,
        resourceVersion: resident.resourceVersion,
        lastAteAtWorldTime: resident.lastAteAtWorldTime
          ? new Date(resident.lastAteAtWorldTime).toISOString()
          : null,
        lastSocialContactAtWorldTime: resident.lastSocialContactAtWorldTime
          ? new Date(resident.lastSocialContactAtWorldTime).toISOString()
          : null,
        completedWorkShiftKeys: [...resident.completedWorkShiftKeys].sort(),
        stateVersion: resident.stateVersion,
        sourceWorldSeq: resident.sourceWorldSeq,
      })),
  };
}

function assertProjectionShape(snapshot: M3ResidentProjectionSnapshot): void {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    !Array.isArray(snapshot.residents) ||
    typeof snapshot.worldId !== "string" ||
    typeof snapshot.worldTime !== "string" ||
    typeof snapshot.worldSeq !== "string"
  ) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "Resident projection snapshot is malformed",
    );
  }
  const worldTime = new Date(snapshot.worldTime);
  let worldSeq: bigint;
  try {
    worldSeq = BigInt(snapshot.worldSeq);
  } catch {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "Resident projection snapshot world sequence is invalid",
    );
  }
  if (Number.isNaN(worldTime.getTime()) || worldSeq < 0n) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "Resident projection snapshot position is invalid",
    );
  }
  const residentIds = new Set<string>();
  const actorIds = new Set<string>();
  const residentsById = new Map(
    snapshot.residents.map((resident) => [resident.residentId, resident]),
  );
  for (const resident of snapshot.residents) {
    if (
      !resident ||
      typeof resident.residentId !== "string" ||
      resident.residentId.length === 0 ||
      typeof resident.actorId !== "string" ||
      resident.actorId.length === 0 ||
      residentIds.has(resident.residentId) ||
      actorIds.has(resident.actorId) ||
      typeof resident.locationId !== "string" ||
      resident.locationId.length === 0 ||
      !Number.isSafeInteger(resident.stateVersion) ||
      resident.stateVersion < 0 ||
      !/^\d+$/.test(resident.sourceWorldSeq) ||
      BigInt(resident.sourceWorldSeq) > worldSeq ||
      !Number.isSafeInteger(resident.foodUnits) ||
      resident.foodUnits < 0 ||
      !Number.isSafeInteger(resident.resourceVersion) ||
      resident.resourceVersion < 0 ||
      !Array.isArray(resident.completedWorkShiftKeys) ||
      resident.completedWorkShiftKeys.some(
        (key: unknown) => typeof key !== "string" || key.length === 0,
      )
    ) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        "Resident projection snapshot contains an invalid resident",
      );
    }
    residentIds.add(resident.residentId);
    actorIds.add(resident.actorId);
    const active = resident.activity !== "IDLE";
    const hasActivityTimes =
      resident.startedAtWorldTime !== null && resident.dueAtWorldTime !== null;
    if (
      ![
        "IDLE",
        "TRAVELING",
        "SLEEPING",
        "EATING",
        "WORKING",
        "TALKING",
      ].includes(resident.activity) ||
      active !== hasActivityTimes ||
      (hasActivityTimes &&
        (Number.isNaN(new Date(resident.startedAtWorldTime).getTime()) ||
          Number.isNaN(new Date(resident.dueAtWorldTime).getTime()) ||
          new Date(resident.dueAtWorldTime).getTime() <
            new Date(resident.startedAtWorldTime).getTime())) ||
      (resident.activity === "IDLE" &&
        (resident.activityInstanceId !== null ||
          resident.activityTargetLocationId !== null ||
          resident.activityTargetResidentId !== null)) ||
      (resident.activity === "TRAVELING" &&
        (resident.activityInstanceId === null ||
          resident.activityTargetLocationId === null ||
          resident.activityTargetResidentId !== null)) ||
      (["SLEEPING", "EATING", "WORKING"].includes(resident.activity) &&
        (resident.activityInstanceId === null ||
          resident.activityTargetLocationId !== null ||
          resident.activityTargetResidentId !== null)) ||
      (resident.activity === "TALKING" &&
        (resident.activityInstanceId === null ||
          resident.activityTargetLocationId !== null ||
          resident.activityTargetResidentId === null)) ||
      (resident.activity !== "IDLE" &&
        (typeof resident.activityInstanceId !== "string" ||
          resident.activityInstanceId.length === 0)) ||
      (resident.activity === "TRAVELING" &&
        typeof resident.activityTargetLocationId !== "string") ||
      (resident.activity !== "TALKING" &&
        resident.activityTargetResidentId !== null)
    ) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Resident ${resident.residentId} has an invalid activity projection`,
      );
    }
    for (const field of [
      resident.lastAteAtWorldTime,
      resident.lastSocialContactAtWorldTime,
    ]) {
      if (field !== null && Number.isNaN(new Date(field).getTime())) {
        throw new M3DomainReplayError(
          "INVALID_PAYLOAD",
          `Resident ${resident.residentId} has an invalid historical time`,
        );
      }
    }
  }
  for (const resident of snapshot.residents) {
    if (resident.activity !== "TALKING") continue;
    const target = resident.activityTargetResidentId
      ? residentsById.get(resident.activityTargetResidentId)
      : undefined;
    if (
      !target ||
      target.activity !== "TALKING" ||
      target.activityInstanceId !== resident.activityInstanceId ||
      target.activityTargetResidentId !== resident.residentId ||
      target.startedAtWorldTime !== resident.startedAtWorldTime ||
      target.dueAtWorldTime !== resident.dueAtWorldTime
    ) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Resident ${resident.residentId} has an invalid paired TALK projection`,
      );
    }
  }
}

function optionalDateString(
  value: Date | string | null | undefined,
  field: string,
): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `Live projection field ${field} must be a valid date`,
    );
  }
  return date.toISOString();
}

function replayM3ResidentProjectionFromProjection(
  input: Readonly<{
    worldId: string;
    initialProjection: M3ResidentProjectionSnapshot;
    events: readonly M3ReplayEvent[];
  }>,
): M3ResidentProjectionSnapshot {
  const initialProjection = canonicalProjection(input.initialProjection);
  if (
    initialProjection.worldId !== input.worldId ||
    initialProjection.schemaVersion !== M3_DOMAIN_REPLAY_SCHEMA_VERSION ||
    initialProjection.registryVersion !== M3_DOMAIN_EVENT_REGISTRY_VERSION
  ) {
    throw new M3DomainReplayError(
      "WORLD_MISMATCH",
      "Resident projection checkpoint belongs to another schema or world",
    );
  }
  if (Number.isNaN(new Date(initialProjection.worldTime).getTime())) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "Resident projection checkpoint world time must be valid",
    );
  }

  const residents = new Map(
    initialProjection.residents.map((resident) => [
      resident.residentId,
      resident,
    ]),
  );
  const actors = new Map(
    initialProjection.residents.map((resident) => [
      resident.actorId,
      resident.residentId,
    ]),
  );

  let worldTime = new Date(initialProjection.worldTime);
  let worldSeq: bigint;
  try {
    worldSeq = BigInt(initialProjection.worldSeq);
  } catch {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "Resident projection checkpoint world sequence must be valid",
    );
  }
  for (const event of [...input.events].sort((left, right) =>
    left.seq < right.seq ? -1 : left.seq > right.seq ? 1 : 0,
  )) {
    if (event.worldId !== input.worldId) {
      throw new M3DomainReplayError(
        "WORLD_MISMATCH",
        `Event ${event.id} belongs to another world`,
      );
    }
    if (event.seq !== worldSeq + 1n) {
      throw new M3DomainReplayError(
        "SEQ_MISMATCH",
        `Expected event seq ${worldSeq + 1n}, received ${event.seq}`,
      );
    }
    if (!(M3_TYPED_EVENT_TYPES as readonly string[]).includes(event.type)) {
      throw new M3DomainReplayError(
        "UNKNOWN_EVENT",
        `Event type ${event.type} is not registered for M3 replay`,
      );
    }
    if (Number.isNaN(event.occurredAt.getTime())) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Event ${event.id} has an invalid occurredAt`,
      );
    }
    const payload = recordPayload(event.payload);
    const type = event.type as M3TypedEventType;

    if (type === "WORLD_TIME_ADVANCED") {
      const from = isoField(payload, "from");
      const to = isoField(payload, "to");
      if (
        from !== worldTime.toISOString() ||
        new Date(to).getTime() < worldTime.getTime() ||
        to !== event.occurredAt.toISOString()
      ) {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `World time event ${event.id} does not advance the replay clock`,
        );
      }
      worldTime = new Date(to);
      worldSeq = event.seq;
      continue;
    }

    if (event.occurredAt.getTime() !== worldTime.getTime()) {
      throw new M3DomainReplayError(
        "INVALID_TRANSITION",
        `Event ${event.id} does not occur at the replay world time`,
      );
    }

    if (lifecycleEventSpec(type)) {
      applyLifecycleEvent({
        worldId: input.worldId,
        event,
        type,
        payload,
        residents,
        actors,
      });
      worldSeq = event.seq;
      continue;
    }

    const residentId = event.actorId ? actors.get(event.actorId) : undefined;
    if (!residentId) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Event ${event.id} references an unknown resident actor`,
      );
    }
    const current = residents.get(residentId);
    if (!current) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Resident ${residentId} is missing from the projection`,
      );
    }
    const action = actionFields(event, payload);
    const isMove = type.startsWith("RESIDENT_MOVE");
    const expectedActivity = isMove ? "TRAVELING" : "SLEEPING";
    if (
      (payload.actionType !== undefined &&
        payload.actionType !== (isMove ? "MOVE" : "SLEEP")) ||
      (payload.policyVersion !== undefined &&
        payload.policyVersion !== "m3-action-semantics-v1")
    ) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Legacy event ${event.id} has an invalid action policy`,
      );
    }

    if (type.endsWith("_STARTED")) {
      if (current.activity !== "IDLE") {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `Resident ${residentId} started an action while ${current.activity}`,
        );
      }
      const sourceLocationId = stringField(payload, "sourceLocationId");
      if (sourceLocationId !== current.locationId) {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `Resident ${residentId} moved without matching source location`,
        );
      }
      const startedAtWorldTime = isoField(payload, "startedAtWorldTime");
      const dueAtWorldTime = isoField(payload, "dueAtWorldTime");
      if (startedAtWorldTime !== event.occurredAt.toISOString()) {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `Resident ${residentId} start time does not match event time`,
        );
      }
      residents.set(residentId, {
        ...current,
        activity: expectedActivity,
        activityInstanceId: action.activityInstanceId,
        activityTargetLocationId: isMove
          ? stringField(payload, "destinationId")
          : null,
        activityTargetResidentId: null,
        startedAtWorldTime,
        dueAtWorldTime,
        stateVersion: current.stateVersion + 1,
        sourceWorldSeq: event.seq.toString(),
      });
    } else {
      if (
        current.activity !== expectedActivity ||
        current.activityInstanceId !== action.activityInstanceId
      ) {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `Resident ${residentId} completed an unrelated activity`,
        );
      }
      if (
        isoField(payload, "completedAtWorldTime") !==
        event.occurredAt.toISOString()
      ) {
        throw new M3DomainReplayError(
          "INVALID_TRANSITION",
          `Resident ${residentId} completion time does not match event time`,
        );
      }
      const locationId = isMove
        ? stringField(payload, "destinationId")
        : current.locationId;
      residents.set(residentId, {
        ...current,
        locationId,
        activity: "IDLE",
        activityInstanceId: null,
        activityTargetLocationId: null,
        activityTargetResidentId: null,
        startedAtWorldTime: null,
        dueAtWorldTime: null,
        stateVersion: current.stateVersion + 1,
        sourceWorldSeq: event.seq.toString(),
      });
    }
    worldSeq = event.seq;
  }

  return canonicalProjection({
    schemaVersion: M3_DOMAIN_REPLAY_SCHEMA_VERSION,
    registryVersion: M3_DOMAIN_EVENT_REGISTRY_VERSION,
    worldId: input.worldId,
    worldTime: worldTime.toISOString(),
    worldSeq: worldSeq.toString(),
    residents: [...residents.values()],
  });
}

export function replayM3ResidentProjection(
  input: Readonly<{
    worldId: string;
    initialWorldTime: Date;
    seed: ResidentSeedBundle;
    events: readonly M3ReplayEvent[];
  }>,
): M3ResidentProjectionSnapshot {
  if (input.seed.worldId !== input.worldId) {
    throw new M3DomainReplayError(
      "WORLD_MISMATCH",
      "Resident seed belongs to another world",
    );
  }
  if (Number.isNaN(input.initialWorldTime.getTime())) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      "Initial world time must be valid",
    );
  }
  return replayM3ResidentProjectionFromProjection({
    worldId: input.worldId,
    initialProjection: {
      schemaVersion: M3_DOMAIN_REPLAY_SCHEMA_VERSION,
      registryVersion: M3_DOMAIN_EVENT_REGISTRY_VERSION,
      worldId: input.worldId,
      worldTime: input.initialWorldTime.toISOString(),
      worldSeq: "0",
      residents: input.seed.residents.map((resident) => ({
        residentId: resident.residentId,
        actorId: resident.actorRef.actorId,
        locationId: resident.homeLocationId,
        activity: "IDLE",
        activityInstanceId: null,
        activityTargetLocationId: null,
        activityTargetResidentId: null,
        startedAtWorldTime: null,
        dueAtWorldTime: null,
        foodUnits: resident.resources.foodUnits,
        resourceVersion: resident.resources.version,
        lastAteAtWorldTime: null,
        lastSocialContactAtWorldTime: null,
        completedWorkShiftKeys: [],
        stateVersion: 0,
        sourceWorldSeq: "0",
      })),
    },
    events: input.events,
  });
}

export function replayM3ResidentProjectionFromCheckpoint(
  input: Readonly<{
    checkpoint: M3ResidentProjectionCheckpoint;
    events: readonly M3ReplayEvent[];
  }>,
): M3ResidentProjectionSnapshot {
  const { checkpoint } = input;
  const worldMatches =
    String(checkpoint.snapshot.worldId) === String(checkpoint.worldId);
  const sequenceMatches =
    String(checkpoint.snapshot.worldSeq) === checkpoint.worldSeq.toString();
  const checksumMatches =
    projectionHash(checkpoint.snapshot) === checkpoint.checksum;
  if (!worldMatches || !sequenceMatches || !checksumMatches) {
    throw new M3DomainReplayError(
      "INVALID_PAYLOAD",
      `Resident projection checkpoint is invalid (world=${worldMatches}, sequence=${sequenceMatches}, checksum=${checksumMatches})`,
    );
  }
  return replayM3ResidentProjectionFromProjection({
    worldId: checkpoint.worldId,
    initialProjection: checkpoint.snapshot,
    events: input.events,
  });
}

export function projectionHash(snapshot: M3ResidentProjectionSnapshot): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalProjection(snapshot)))
    .digest("hex");
}

export function canonicalResidentProjectionFromRows(
  input: Readonly<{
    worldId: string;
    worldTime: Date;
    worldSeq: bigint;
    seed: ResidentSeedBundle;
    rows: readonly Readonly<{
      residentId: string;
      currentLocationId: string;
      currentActivity: string;
      activityInstanceId: string | null;
      activityTargetLocationId: string | null;
      activityTargetResidentId?: string | null;
      activityStartedAtWorldTime: Date | null;
      activityDueAtWorldTime: Date | null;
      foodUnits?: number;
      resourceVersion?: number;
      lastAteAtWorldTime?: Date | null;
      lastSocialContactAtWorldTime?: Date | null;
      completedWorkShiftKeys?: unknown;
      stateVersion: number;
      sourceWorldSeq: bigint;
    }>[];
    resourceRows?: readonly Readonly<{
      residentId: string;
      foodUnits: number;
      resourceVersion: number;
    }>[];
  }>,
): M3ResidentProjectionSnapshot {
  const actorByResidentId = new Map(
    input.seed.residents.map((resident) => [
      resident.residentId,
      resident.actorRef.actorId,
    ]),
  );
  const resourceByResidentId = new Map(
    input.seed.residents.map((resident) => [
      resident.residentId,
      {
        foodUnits: resident.resources.foodUnits,
        resourceVersion: resident.resources.version,
      },
    ]),
  );
  for (const resource of input.resourceRows ?? []) {
    if (!resourceByResidentId.has(resource.residentId)) {
      throw new M3DomainReplayError(
        "WORLD_MISMATCH",
        `Live resource row ${resource.residentId} is not in the resident seed`,
      );
    }
    resourceByResidentId.set(resource.residentId, resource);
  }
  const residents = input.rows.map((row) => {
    const seedResident = input.seed.residents.find(
      (resident) => resident.residentId === row.residentId,
    );
    if (!seedResident) {
      throw new M3DomainReplayError(
        "WORLD_MISMATCH",
        `Live resident ${row.residentId} is not in the resident seed`,
      );
    }
    if (
      ![
        "IDLE",
        "TRAVELING",
        "SLEEPING",
        "EATING",
        "WORKING",
        "TALKING",
      ].includes(row.currentActivity)
    ) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Unsupported live activity ${row.currentActivity}`,
      );
    }
    const resource = resourceByResidentId.get(row.residentId);
    if (!resource) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Live resident ${row.residentId} is missing its resource row`,
      );
    }
    const completedWorkShiftKeys = Array.isArray(row.completedWorkShiftKeys)
      ? row.completedWorkShiftKeys.map((key: unknown) => {
          if (typeof key !== "string" || key.length === 0) {
            throw new M3DomainReplayError(
              "INVALID_PAYLOAD",
              `Live resident ${row.residentId} has an invalid work shift key`,
            );
          }
          return key;
        })
      : [];
    return {
      residentId: row.residentId,
      actorId:
        actorByResidentId.get(row.residentId) ?? seedResident.actorRef.actorId,
      locationId: row.currentLocationId,
      activity: row.currentActivity as M3ResidentProjection["activity"],
      activityInstanceId: row.activityInstanceId,
      activityTargetLocationId: row.activityTargetLocationId,
      activityTargetResidentId: row.activityTargetResidentId ?? null,
      startedAtWorldTime: optionalDateString(
        row.activityStartedAtWorldTime,
        "activityStartedAtWorldTime",
      ),
      dueAtWorldTime: optionalDateString(
        row.activityDueAtWorldTime,
        "activityDueAtWorldTime",
      ),
      foodUnits: row.foodUnits ?? resource.foodUnits,
      resourceVersion: row.resourceVersion ?? resource.resourceVersion,
      lastAteAtWorldTime: optionalDateString(
        row.lastAteAtWorldTime,
        "lastAteAtWorldTime",
      ),
      lastSocialContactAtWorldTime: optionalDateString(
        row.lastSocialContactAtWorldTime,
        "lastSocialContactAtWorldTime",
      ),
      completedWorkShiftKeys,
      stateVersion: row.stateVersion,
      sourceWorldSeq: row.sourceWorldSeq.toString(),
    };
  });
  return canonicalProjection({
    schemaVersion: M3_DOMAIN_REPLAY_SCHEMA_VERSION,
    registryVersion: M3_DOMAIN_EVENT_REGISTRY_VERSION,
    worldId: input.worldId,
    worldTime: input.worldTime.toISOString(),
    worldSeq: input.worldSeq.toString(),
    residents,
  });
}
