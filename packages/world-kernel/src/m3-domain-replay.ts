import { createHash } from "node:crypto";
import type { ResidentSeedBundle } from "@mirror/db";

export const M3_DOMAIN_EVENT_REGISTRY_VERSION =
  "m3-domain-event-registry-v1" as const;
export const M3_DOMAIN_REPLAY_SCHEMA_VERSION =
  "m3-resident-projection-v1" as const;

export const M3_TYPED_EVENT_TYPES = [
  "WORLD_TIME_ADVANCED",
  "RESIDENT_MOVE_STARTED",
  "RESIDENT_MOVE_COMPLETED",
  "RESIDENT_SLEEP_STARTED",
  "RESIDENT_SLEEP_COMPLETED",
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
  activity: "IDLE" | "TRAVELING" | "SLEEPING";
  activityInstanceId: string | null;
  activityTargetLocationId: string | null;
  startedAtWorldTime: string | null;
  dueAtWorldTime: string | null;
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
  return {
    actionRequestId: stringField(payload, "actionRequestId"),
    activityInstanceId: stringField(payload, "activityInstanceId"),
  };
}

function canonicalProjection(
  snapshot: M3ResidentProjectionSnapshot,
): M3ResidentProjectionSnapshot {
  return {
    schemaVersion: snapshot.schemaVersion,
    registryVersion: snapshot.registryVersion,
    worldId: snapshot.worldId,
    worldTime: snapshot.worldTime,
    worldSeq: snapshot.worldSeq,
    residents: [...snapshot.residents]
      .sort((left, right) => left.residentId.localeCompare(right.residentId))
      .map((resident) => ({
        residentId: resident.residentId,
        actorId: resident.actorId,
        locationId: resident.locationId,
        activity: resident.activity,
        activityInstanceId: resident.activityInstanceId,
        activityTargetLocationId: resident.activityTargetLocationId,
        startedAtWorldTime: resident.startedAtWorldTime,
        dueAtWorldTime: resident.dueAtWorldTime,
        stateVersion: resident.stateVersion,
        sourceWorldSeq: resident.sourceWorldSeq,
      })),
  };
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
      residents.set(residentId, {
        ...current,
        activity: expectedActivity,
        activityInstanceId: action.activityInstanceId,
        activityTargetLocationId: isMove
          ? stringField(payload, "destinationId")
          : null,
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
        startedAtWorldTime: null,
        dueAtWorldTime: null,
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
      activityStartedAtWorldTime: Date | null;
      activityDueAtWorldTime: Date | null;
      stateVersion: number;
      sourceWorldSeq: bigint;
    }>[];
  }>,
): M3ResidentProjectionSnapshot {
  const actorByResidentId = new Map(
    input.seed.residents.map((resident) => [
      resident.residentId,
      resident.actorRef.actorId,
    ]),
  );
  const residents = input.rows.map((row) => {
    if (!["IDLE", "TRAVELING", "SLEEPING"].includes(row.currentActivity)) {
      throw new M3DomainReplayError(
        "INVALID_PAYLOAD",
        `Unsupported live activity ${row.currentActivity}`,
      );
    }
    return {
      residentId: row.residentId,
      actorId: actorByResidentId.get(row.residentId) ?? "",
      locationId: row.currentLocationId,
      activity: row.currentActivity as M3ResidentProjection["activity"],
      activityInstanceId: row.activityInstanceId,
      activityTargetLocationId: row.activityTargetLocationId,
      startedAtWorldTime: row.activityStartedAtWorldTime?.toISOString() ?? null,
      dueAtWorldTime: row.activityDueAtWorldTime?.toISOString() ?? null,
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
