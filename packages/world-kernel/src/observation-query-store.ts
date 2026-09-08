import { eq } from "drizzle-orm";
import {
  buildWorldObservationSnapshot,
  type ObservationBatchQueryInput,
  type ObservationResidentRecord,
  type ObservationQueryInput,
  type ObservationQueryPort,
  type ObservationWorldRecord,
  type WorldObservationSnapshot,
} from "@mirror/contracts";
import type { ResidentRuntimeStateReadPort } from "@mirror/contracts";
import { createDb, generateResidentSeed, worlds } from "@mirror/db";
import {
  createM3SeedResidentBridge,
  ResidentBridgeError,
  type ResidentBridgeFactory,
} from "./resident-bridges.js";
import {
  createPostgresResidentRuntimeStateReadPort,
  ResidentRuntimeAuthorityError,
} from "./resident-runtime-authority.js";

export const OBSERVATION_QUERY_POLICY = {
  version: "m3-observation-v1",
  maxResidentsPerQuery: 30,
} as const;

export type ObservationSource = Readonly<{
  readWorld(worldId: string): Promise<ObservationWorldRecord | null>;
  readResidents(input: {
    worldId: string;
    worldSeed: string;
    worldTime: Date;
    worldSeq: bigint;
    residentIds: readonly string[];
  }): Promise<readonly ObservationResidentRecord[]>;
}>;

export type ObservationQueryDatabase = ReturnType<typeof createDb>["db"];
export type ObservationResidentSource = (input: {
  worldId: string;
  worldSeed: string;
}) =>
  | readonly ObservationResidentRecord[]
  | Promise<readonly ObservationResidentRecord[]>;

export type ObservationQueryErrorCode =
  | "WORLD_NOT_FOUND"
  | "RESIDENT_NOT_FOUND"
  | "WORLD_MISMATCH"
  | "OBSERVATION_SOURCE_UNAVAILABLE"
  | "STALE_READ"
  | "INVALID_QUERY"
  | "ACTOR_REF_UNAVAILABLE"
  | "RESOURCE_SOURCE_UNAVAILABLE"
  | "RESOURCE_VERSION_INVALID"
  | "RUNTIME_STATE_UNAVAILABLE";

export class ObservationQueryError extends Error {
  constructor(
    public readonly code: ObservationQueryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ObservationQueryError";
  }
}

function assertNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new ObservationQueryError(
      "INVALID_QUERY",
      `${name} must be non-empty`,
    );
  }
}

function assertWorldSeq(value: string | undefined): void {
  if (value !== undefined && !/^\d+$/.test(value)) {
    throw new ObservationQueryError(
      "INVALID_QUERY",
      "expectedWorldSeq must be a non-negative decimal string",
    );
  }
}

function sortedUniqueResidentIds(ids: readonly string[]): string[] {
  if (
    ids.length === 0 ||
    ids.length > OBSERVATION_QUERY_POLICY.maxResidentsPerQuery
  ) {
    throw new ObservationQueryError(
      "INVALID_QUERY",
      `residentIds must contain 1-${OBSERVATION_QUERY_POLICY.maxResidentsPerQuery} ids`,
    );
  }
  for (const id of ids) {
    assertNonEmpty(id, "residentId");
  }
  const sorted = [...ids].sort();
  if (new Set(sorted).size !== sorted.length) {
    throw new ObservationQueryError(
      "INVALID_QUERY",
      "residentIds must be unique",
    );
  }
  return sorted;
}

function isObservationWorldStatus(
  value: string,
): value is ObservationWorldRecord["status"] {
  return value === "RUNNING" || value === "PAUSED" || value === "MAINTENANCE";
}

function unavailableSourceError(error: unknown): ObservationQueryError {
  if (error instanceof ObservationQueryError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "unknown source error";
  return new ObservationQueryError(
    "OBSERVATION_SOURCE_UNAVAILABLE",
    `Observation source is unavailable: ${message}`,
  );
}

function bridgeSourceError(error: unknown): ObservationQueryError {
  if (error instanceof ObservationQueryError) {
    return error;
  }
  if (error instanceof ResidentBridgeError) {
    return new ObservationQueryError(error.code, error.message);
  }
  if (error instanceof ResidentRuntimeAuthorityError) {
    return new ObservationQueryError(error.code, error.message);
  }
  return unavailableSourceError(error);
}

async function readWorld(
  source: ObservationSource,
  input: Readonly<{ worldId: string; expectedWorldSeq?: string }>,
): Promise<ObservationWorldRecord> {
  assertNonEmpty(input.worldId, "worldId");
  assertWorldSeq(input.expectedWorldSeq);

  let world: ObservationWorldRecord | null;
  try {
    world = await source.readWorld(input.worldId);
  } catch (error) {
    throw unavailableSourceError(error);
  }
  if (!world) {
    throw new ObservationQueryError(
      "WORLD_NOT_FOUND",
      `World ${input.worldId} was not found`,
    );
  }
  if (world.id !== input.worldId) {
    throw new ObservationQueryError(
      "WORLD_MISMATCH",
      "Observation source returned a different world",
    );
  }
  if (!isObservationWorldStatus(world.status)) {
    throw new ObservationQueryError(
      "OBSERVATION_SOURCE_UNAVAILABLE",
      "Observation source returned an invalid world status",
    );
  }
  if (
    input.expectedWorldSeq !== undefined &&
    world.worldSeq.toString() !== input.expectedWorldSeq
  ) {
    throw new ObservationQueryError(
      "STALE_READ",
      `World sequence ${world.worldSeq.toString()} does not match expected ${input.expectedWorldSeq}`,
    );
  }
  return world;
}

export function createObservationQuery(
  source: ObservationSource,
): ObservationQueryPort {
  return {
    async getResidentObservation(
      input: ObservationQueryInput,
    ): Promise<WorldObservationSnapshot> {
      const snapshots = await this.getResidentObservations({
        worldId: input.worldId,
        residentIds: [input.residentId],
        expectedWorldSeq: input.expectedWorldSeq,
      });
      return snapshots[0];
    },

    async getResidentObservations(
      input: ObservationBatchQueryInput,
    ): Promise<readonly WorldObservationSnapshot[]> {
      const residentIds = sortedUniqueResidentIds(input.residentIds);
      const world = await readWorld(source, input);

      let residents: readonly ObservationResidentRecord[];
      try {
        residents = await source.readResidents({
          worldId: world.id,
          worldSeed: world.seed,
          worldTime: world.worldTime,
          worldSeq: world.worldSeq,
          residentIds,
        });
      } catch (error) {
        throw bridgeSourceError(error);
      }

      const residentsById = new Map<string, ObservationResidentRecord>();
      for (const resident of residents) {
        if (resident.worldId !== world.id) {
          throw new ObservationQueryError(
            "WORLD_MISMATCH",
            "Observation source returned a resident from a different world",
          );
        }
        if (residentsById.has(resident.residentId)) {
          throw new ObservationQueryError(
            "OBSERVATION_SOURCE_UNAVAILABLE",
            "Observation source returned duplicate resident ids",
          );
        }
        residentsById.set(resident.residentId, resident);
      }

      return residentIds.map((residentId) => {
        const resident = residentsById.get(residentId);
        if (!resident) {
          throw new ObservationQueryError(
            "RESIDENT_NOT_FOUND",
            `Resident ${residentId} was not found in world ${world.id}`,
          );
        }
        return buildWorldObservationSnapshot({ world, resident });
      });
    },
  };
}

export function createPostgresObservationQuery(
  database: ObservationQueryDatabase,
  options: Readonly<{
    residentSource?: ObservationResidentSource;
    residentBridgeFactory?: ResidentBridgeFactory;
    runtimeStateReadPortFactory?: (input: {
      worldId: string;
      worldSeed: string;
    }) => ResidentRuntimeStateReadPort;
  }> = {},
): ObservationQueryPort {
  const usingDefaultResidentSource = options.residentSource === undefined;
  const residentSource =
    options.residentSource ??
    ((input) =>
      generateResidentSeed({
        worldId: input.worldId,
        seed: input.worldSeed,
      }).residents.map(
        ({
          residentId,
          worldId,
          identityKind,
          homeLocationId,
          profile,
          employment,
        }) => ({
          residentId,
          worldId,
          identityKind,
          homeLocationId,
          profile,
          employment,
        }),
      ));
  const residentBridgeFactory =
    options.residentBridgeFactory ??
    (usingDefaultResidentSource ? createM3SeedResidentBridge : undefined);
  const runtimeStateReadPortFactory =
    options.runtimeStateReadPortFactory ??
    (usingDefaultResidentSource
      ? ({ worldId, worldSeed }) =>
          createPostgresResidentRuntimeStateReadPort(database, {
            worldId,
            worldSeed,
          })
      : undefined);

  const source: ObservationSource = {
    async readWorld(worldId) {
      const [world] = await database
        .select({
          id: worlds.id,
          seed: worlds.seed,
          status: worlds.status,
          worldTime: worlds.worldTime,
          worldSeq: worlds.worldSeq,
        })
        .from(worlds)
        .where(eq(worlds.id, worldId));

      if (!world) {
        return null;
      }
      if (!isObservationWorldStatus(world.status)) {
        throw new ObservationQueryError(
          "OBSERVATION_SOURCE_UNAVAILABLE",
          "World row has an invalid status",
        );
      }
      return {
        id: world.id,
        seed: world.seed,
        status: world.status,
        worldTime: world.worldTime,
        worldSeq: world.worldSeq,
      };
    },
    async readResidents(input) {
      const residents = await residentSource({
        worldId: input.worldId,
        worldSeed: input.worldSeed,
      });
      const selectedResidents = residents.filter(({ residentId }) =>
        input.residentIds.includes(residentId),
      );
      if (selectedResidents.length === 0) {
        return selectedResidents;
      }
      const actorRefsByResidentId = new Map<
        string,
        NonNullable<ObservationResidentRecord["actorRef"]>
      >();
      const resourcesByResidentId = new Map<
        string,
        NonNullable<ObservationResidentRecord["resources"]>
      >();
      if (residentBridgeFactory) {
        const bridge = residentBridgeFactory({
          worldId: input.worldId,
          worldSeed: input.worldSeed,
        });
        const [actorRefs, resources] = await Promise.all([
          bridge.actorResolver.resolveResidentActorRefs({
            worldId: input.worldId,
            residentIds: selectedResidents.map(({ residentId }) => residentId),
          }),
          bridge.resourceReader.getResidentResourceSnapshots({
            worldId: input.worldId,
            residentIds: selectedResidents.map(({ residentId }) => residentId),
          }),
        ]);
        actorRefs.forEach((actorRef) =>
          actorRefsByResidentId.set(actorRef.residentId, actorRef),
        );
        resources.forEach((resource) =>
          resourcesByResidentId.set(resource.residentId, resource),
        );
      }
      const runtimeStatesByResidentId = new Map<
        string,
        NonNullable<ObservationResidentRecord["runtimeState"]>
      >();
      if (runtimeStateReadPortFactory) {
        const runtimeStates = await runtimeStateReadPortFactory({
          worldId: input.worldId,
          worldSeed: input.worldSeed,
        }).getResidentRuntimeStates({
          worldId: input.worldId,
          residentIds: selectedResidents.map(({ residentId }) => residentId),
          worldTime: input.worldTime,
          sourceWorldSeq: input.worldSeq.toString(),
        });
        runtimeStates.forEach((runtimeState) =>
          runtimeStatesByResidentId.set(
            runtimeState.runtimeState.residentId,
            runtimeState,
          ),
        );
      }

      return selectedResidents.map((resident) => {
        const actorRef = actorRefsByResidentId.get(resident.residentId);
        const resource = resourcesByResidentId.get(resident.residentId);
        if (residentBridgeFactory && !actorRef) {
          throw new ResidentBridgeError(
            "ACTOR_REF_UNAVAILABLE",
            `ActorRef for resident ${resident.residentId} was not returned`,
          );
        }
        if (residentBridgeFactory && !resource) {
          throw new ResidentBridgeError(
            "RESOURCE_SOURCE_UNAVAILABLE",
            `Resources for resident ${resident.residentId} were not returned`,
          );
        }
        const runtimeState = runtimeStatesByResidentId.get(resident.residentId);
        return {
          ...resident,
          ...(actorRef ? { actorRef } : {}),
          ...(resource ? { resources: resource } : {}),
          ...(runtimeState ? { runtimeState } : {}),
        };
      });
    },
  };

  return createObservationQuery(source);
}

export type {
  ObservationResidentRecord,
  ObservationWorldRecord,
  WorldObservationSnapshot,
} from "@mirror/contracts";
