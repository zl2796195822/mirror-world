import {
  CLIENT_PROJECTION_SCHEMA_VERSION,
  type ClientEventFeed,
  type ClientPlaceProjection,
  type ClientResidentActivity,
  type ClientResidentProjection,
  type ClientWorldEvent,
  type ClientWorldSnapshot,
  type ClientWorldStatus,
} from "@mirror/contracts";
import {
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  readResidentRuntimeStateRows,
  readWorldById,
  readWorldEventsAfterSeq,
  type ResidentLocationKind,
  type ResidentRuntimeStateDatabase,
  type ResidentRuntimeStateRow,
} from "@mirror/db";

export const CLIENT_PROJECTION_TRANSPORT = ["http_poll"] as const;
export const CLIENT_PROJECTION_CAPABILITIES = [
  "contract",
  "world_snapshot",
  "places",
  "resident_detail",
  "event_feed",
] as const;

export class ClientProjectionError extends Error {
  constructor(
    public readonly code: "WORLD_NOT_FOUND" | "WORLD_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "ClientProjectionError";
  }
}

type Db = ResidentRuntimeStateDatabase;

function asIso(value: Date): string {
  return value.toISOString();
}

function asOptionalIso(value: Date | null): string | null {
  return value ? asIso(value) : null;
}

function placeDisplayKey(key: string): string {
  return key
    .split("-")
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part.toUpperCase() : part.toUpperCase(),
    )
    .join(" ");
}

function residentDisplayName(index: number): string {
  return `Resident ${String(index + 1).padStart(3, "0")}`;
}

function toClientActivity(value: string): ClientResidentActivity {
  switch (value) {
    case "IDLE":
    case "TRAVELING":
    case "SLEEPING":
    case "EATING":
    case "WORKING":
    case "TALKING":
      return value;
    default:
      return "UNKNOWN_ACTIVITY";
  }
}

function toClientPlaceKind(
  kind: ResidentLocationKind | string,
): ClientPlaceProjection["placeType"] {
  switch (kind) {
    case "HOME":
    case "OFFICE":
    case "CAFE":
    case "STORE":
    case "PARK":
    case "TRANSIT":
      return kind;
    default:
      return "UNKNOWN_PLACE";
  }
}

async function readWorldOrThrow(database: Db, worldId: string) {
  const world = await readWorldById(database, worldId);

  if (!world) {
    throw new ClientProjectionError(
      "WORLD_NOT_FOUND",
      `World ${worldId} was not found`,
    );
  }

  return world;
}

function buildActorMaps(seedBundle: ReturnType<typeof generateResidentSeed>) {
  const actorToResident = new Map<string, string>();
  for (const resident of seedBundle.residents) {
    actorToResident.set(resident.actorRef.actorId, resident.residentId);
  }
  return { actorToResident };
}

function mapEventPayloadSummary(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  const summary: Record<string, string | number | boolean | null> = {};
  for (const key of [
    "actionType",
    "phase",
    "activityInstanceId",
    "sourceLocationId",
    "destinationId",
    "workplaceId",
    "participantId",
    "startedAtWorldTime",
    "dueAtWorldTime",
    "completedAtWorldTime",
    "durationWorldMinutes",
  ]) {
    const value = record[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      summary[key] = value;
    }
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

export async function buildClientWorldSnapshot(
  database: Db,
  worldId: string,
): Promise<ClientWorldSnapshot> {
  const world = await readWorldOrThrow(database, worldId);
  const seedBundle = generateResidentSeed({
    worldId: world.id,
    seed: world.seed,
  });
  const locations = getFirstStreetLocationFixtures(world.id);
  const locationById = new Map(
    locations.map((location) => [location.id, location]),
  );
  const runtimeRows = await readResidentRuntimeStateRows(database, {
    worldId: world.id,
    residentIds: seedBundle.residents.map((resident) => resident.residentId),
  });
  const runtimeByResident = new Map<string, ResidentRuntimeStateRow>(
    runtimeRows.map((row) => [row.residentId, row]),
  );

  const residents = seedBundle.residents.map((resident, index) => {
    const runtime = runtimeByResident.get(resident.residentId);
    const locationId = runtime?.currentLocationId ?? resident.homeLocationId;
    const location = locationById.get(locationId);
    return {
      residentId: resident.residentId,
      displayName: residentDisplayName(index),
      placeId: locationId,
      placeKey: location?.key ?? null,
      placeKind: location ? toClientPlaceKind(location.kind) : "UNKNOWN_PLACE",
      activity: toClientActivity(runtime?.currentActivity ?? "IDLE"),
      activityInstanceId: runtime?.activityInstanceId ?? null,
      activityStartedAtWorldTime: asOptionalIso(
        runtime?.activityStartedAtWorldTime ?? null,
      ),
      activityDueAtWorldTime: asOptionalIso(
        runtime?.activityDueAtWorldTime ?? null,
      ),
      targetPlaceId: runtime?.activityTargetLocationId ?? null,
      participantId: runtime?.activityTargetResidentId ?? null,
      employmentStatus: resident.employment.status,
      workplaceId: resident.employment.workplaceId,
      projectionSeq: (runtime?.sourceWorldSeq ?? world.worldSeq).toString(),
    } satisfies ClientResidentProjection;
  });

  const residentCountByPlace = new Map<string, number>();
  for (const resident of residents) {
    residentCountByPlace.set(
      resident.placeId,
      (residentCountByPlace.get(resident.placeId) ?? 0) + 1,
    );
  }

  const places = locations.map((location) => ({
    placeId: location.id,
    placeKey: location.key,
    placeType: toClientPlaceKind(location.kind),
    displayName: placeDisplayKey(location.key),
    parentPlaceId: null,
    residentCount: residentCountByPlace.get(location.id) ?? 0,
  })) satisfies ClientPlaceProjection[];

  return {
    schemaVersion: CLIENT_PROJECTION_SCHEMA_VERSION,
    worldId: world.id,
    worldTime: asIso(world.worldTime),
    worldSeq: world.worldSeq.toString(),
    worldStatus: world.status as ClientWorldStatus,
    generatedAt: asIso(new Date()),
    places,
    residents,
  };
}

export async function buildClientEventFeed(
  database: Db,
  input: Readonly<{
    worldId: string;
    afterSeq?: string;
    limit?: number;
    residentId?: string;
  }>,
): Promise<ClientEventFeed> {
  const world = await readWorldOrThrow(database, input.worldId);
  const seedBundle = generateResidentSeed({
    worldId: world.id,
    seed: world.seed,
  });
  const { actorToResident } = buildActorMaps(seedBundle);
  const afterSeq = BigInt(input.afterSeq ?? "0");
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

  const rows = await readWorldEventsAfterSeq(database, {
    worldId: world.id,
    afterSeq,
    limit,
  });

  const events: ClientWorldEvent[] = [];
  for (const row of rows) {
    const payload = mapEventPayloadSummary(row.payload);
    const residentId = row.actorId
      ? (actorToResident.get(row.actorId) ?? null)
      : null;
    const participantActorId =
      payload && typeof payload.participantId === "string"
        ? payload.participantId
        : null;
    const participantId = participantActorId
      ? (actorToResident.get(participantActorId) ?? null)
      : null;

    if (input.residentId && residentId !== input.residentId) {
      continue;
    }

    const sourceLocationId =
      payload && typeof payload.sourceLocationId === "string"
        ? payload.sourceLocationId
        : null;
    const targetPlaceId =
      row.type === "RESIDENT_MOVE_STARTED" ||
      row.type === "RESIDENT_MOVE_COMPLETED" ||
      row.type === "RESIDENT_WORK_STARTED" ||
      row.type === "RESIDENT_WORK_COMPLETED"
        ? row.targetId
        : null;

    events.push({
      eventId: row.id,
      worldSeq: row.seq.toString(),
      eventType: row.type,
      occurredAtWorldTime: asIso(row.occurredAt),
      residentId,
      participantId,
      placeId: sourceLocationId,
      targetPlaceId,
      payloadSummary: payload,
    });
  }

  const nextAfterSeq = events.length
    ? events[events.length - 1].worldSeq
    : afterSeq.toString();

  return {
    schemaVersion: CLIENT_PROJECTION_SCHEMA_VERSION,
    worldId: world.id,
    worldSeq: world.worldSeq.toString(),
    events,
    nextAfterSeq,
  };
}

export async function buildClientResidentDetail(
  database: Db,
  input: Readonly<{ worldId: string; residentId: string }>,
): Promise<ClientResidentProjection> {
  const snapshot = await buildClientWorldSnapshot(database, input.worldId);
  const resident = snapshot.residents.find(
    (item) => item.residentId === input.residentId,
  );
  if (!resident) {
    throw new ClientProjectionError(
      "WORLD_NOT_FOUND",
      `Resident ${input.residentId} was not found in world ${input.worldId}`,
    );
  }
  return resident;
}
