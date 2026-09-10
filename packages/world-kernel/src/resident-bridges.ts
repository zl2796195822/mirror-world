import { and, eq, inArray } from "drizzle-orm";
import {
  createDb,
  generateResidentSeed,
  getResidentFoodItemId,
  residentResourceStates,
  type ResidentSeed,
} from "@mirror/db";
import {
  parseActorRef,
  parseResidentResourceSnapshot,
  type ActorRef,
  type ResidentActorResolver,
  type ResidentResourceSnapshot,
  type ResourceReadPort,
} from "@mirror/contracts";

export const RESIDENT_BRIDGE_MAX_BATCH_SIZE = 30 as const;

export type ResidentBridgeErrorCode =
  | "INVALID_QUERY"
  | "WORLD_MISMATCH"
  | "RESIDENT_NOT_FOUND"
  | "ACTOR_REF_UNAVAILABLE"
  | "RESOURCE_SOURCE_UNAVAILABLE"
  | "RESOURCE_VERSION_INVALID";

export class ResidentBridgeError extends Error {
  constructor(
    public readonly code: ResidentBridgeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ResidentBridgeError";
  }
}

export type M3SeedBridgeInput = Readonly<{
  worldId: string;
  worldSeed: string;
}>;

export type ResidentBridge = Readonly<{
  actorResolver: ResidentActorResolver;
  resourceReader: ResourceReadPort;
}>;

export type ResidentBridgeFactory = (
  input: M3SeedBridgeInput,
) => ResidentBridge;

export type PostgresResidentResourceDatabase = ReturnType<
  typeof createDb
>["db"];

function sortedResidentIds(ids: readonly string[]): string[] {
  if (
    ids.length === 0 ||
    ids.length > RESIDENT_BRIDGE_MAX_BATCH_SIZE ||
    ids.some((id) => id.trim().length === 0)
  ) {
    throw new ResidentBridgeError(
      "INVALID_QUERY",
      `residentIds must contain 1-${RESIDENT_BRIDGE_MAX_BATCH_SIZE} non-empty ids`,
    );
  }

  const sorted = [...ids].sort();
  if (new Set(sorted).size !== sorted.length) {
    throw new ResidentBridgeError(
      "INVALID_QUERY",
      "residentIds must be unique",
    );
  }
  return sorted;
}

function assertWorld(expectedWorldId: string, actualWorldId: string): void {
  if (expectedWorldId !== actualWorldId) {
    throw new ResidentBridgeError(
      "WORLD_MISMATCH",
      "Resident bridge query belongs to a different world",
    );
  }
}

function fixtureByResidentId(
  worldId: string,
  residents: readonly ResidentSeed[],
): Map<string, ResidentSeed> {
  for (const resident of residents) {
    assertWorld(worldId, resident.worldId);
  }
  return new Map(residents.map((resident) => [resident.residentId, resident]));
}

function createResidentActorResolver(
  worldId: string,
  residents: readonly ResidentSeed[],
): ResidentActorResolver {
  const residentsById = fixtureByResidentId(worldId, residents);

  function findResident(residentId: string): ResidentSeed {
    const resident = residentsById.get(residentId);
    if (!resident) {
      throw new ResidentBridgeError(
        "RESIDENT_NOT_FOUND",
        `Resident ${residentId} was not found in world ${worldId}`,
      );
    }
    return resident;
  }

  function resolveResidentActorRef(input: {
    worldId: string;
    residentId: string;
  }): ActorRef {
    assertWorld(worldId, input.worldId);
    const resident = findResident(input.residentId);
    try {
      return parseActorRef({
        worldId,
        residentId: resident.residentId,
        actorId: resident.actorRef.actorId,
        kind: "NATIVE_RESIDENT",
      });
    } catch (error) {
      throw new ResidentBridgeError(
        "ACTOR_REF_UNAVAILABLE",
        `ActorRef for resident ${resident.residentId} is unavailable: ${String(error)}`,
      );
    }
  }

  return {
    async resolveResidentActorRef(input) {
      return resolveResidentActorRef(input);
    },
    async resolveResidentActorRefs(input) {
      const ids = sortedResidentIds(input.residentIds);
      return ids.map((residentId) =>
        resolveResidentActorRef({ worldId: input.worldId, residentId }),
      );
    },
  };
}

function createResidentResourceReadPort(
  worldId: string,
  residents: readonly ResidentSeed[],
): ResourceReadPort {
  const residentsById = fixtureByResidentId(worldId, residents);

  function findResource(residentId: string): ResidentResourceSnapshot {
    const resident = residentsById.get(residentId);
    if (!resident) {
      throw new ResidentBridgeError(
        "RESIDENT_NOT_FOUND",
        `Resident ${residentId} was not found in world ${worldId}`,
      );
    }
    try {
      return parseResidentResourceSnapshot({ ...resident.resources });
    } catch (error) {
      throw new ResidentBridgeError(
        "RESOURCE_VERSION_INVALID",
        `Resource snapshot for resident ${residentId} is invalid: ${String(error)}`,
      );
    }
  }

  return {
    async getResidentResourceSnapshot(input) {
      assertWorld(worldId, input.worldId);
      return findResource(input.residentId);
    },
    async getResidentResourceSnapshots(input) {
      const ids = sortedResidentIds(input.residentIds);
      assertWorld(worldId, input.worldId);
      return ids.map(findResource);
    },
  };
}

export function createM3ResidentActorResolver(
  input: Readonly<{
    worldId: string;
    residents: readonly ResidentSeed[];
  }>,
): ResidentActorResolver {
  return createResidentActorResolver(input.worldId, input.residents);
}

export function createM3ResidentResourceReadPort(
  input: Readonly<{
    worldId: string;
    residents: readonly ResidentSeed[];
  }>,
): ResourceReadPort {
  return createResidentResourceReadPort(input.worldId, input.residents);
}

export function createM3SeedResidentBridge(
  input: M3SeedBridgeInput,
): ResidentBridge {
  const residents = generateResidentSeed({
    worldId: input.worldId,
    seed: input.worldSeed,
  }).residents;
  return {
    actorResolver: createM3ResidentActorResolver({
      worldId: input.worldId,
      residents,
    }),
    resourceReader: createM3ResidentResourceReadPort({
      worldId: input.worldId,
      residents,
    }),
  };
}

export function createM3SeedResidentActorResolver(
  input: M3SeedBridgeInput,
): ResidentActorResolver {
  return createM3SeedResidentBridge(input).actorResolver;
}

export function createM3SeedResourceReadPort(
  input: M3SeedBridgeInput,
): ResourceReadPort {
  return createM3SeedResidentBridge(input).resourceReader;
}

export function createPostgresResidentResourceReadPort(
  database: PostgresResidentResourceDatabase,
  input: M3SeedBridgeInput,
): ResourceReadPort {
  const residentsById = fixtureByResidentId(
    input.worldId,
    generateResidentSeed({ worldId: input.worldId, seed: input.worldSeed })
      .residents,
  );

  return {
    async getResidentResourceSnapshot(query) {
      const [snapshot] = await this.getResidentResourceSnapshots({
        worldId: query.worldId,
        residentIds: [query.residentId],
      });
      return snapshot;
    },
    async getResidentResourceSnapshots(query) {
      assertWorld(input.worldId, query.worldId);
      const ids = sortedResidentIds(query.residentIds);
      ids.forEach((residentId) => {
        if (!residentsById.has(residentId)) {
          throw new ResidentBridgeError(
            "RESIDENT_NOT_FOUND",
            `Resident ${residentId} was not found in world ${input.worldId}`,
          );
        }
      });
      const rows = await database
        .select()
        .from(residentResourceStates)
        .where(
          and(
            eq(residentResourceStates.worldId, input.worldId),
            inArray(residentResourceStates.residentId, ids),
          ),
        );
      const rowsByResidentId = new Map(
        rows.map((row) => [row.residentId, row]),
      );
      return ids.map((residentId) => {
        const row = rowsByResidentId.get(residentId);
        if (!row) {
          throw new ResidentBridgeError(
            "RESOURCE_SOURCE_UNAVAILABLE",
            `Canonical resource for resident ${residentId} was not found`,
          );
        }
        if (row.itemId !== getResidentFoodItemId(input.worldId, residentId)) {
          throw new ResidentBridgeError(
            "RESOURCE_VERSION_INVALID",
            `Canonical resource item for resident ${residentId} is invalid`,
          );
        }
        return parseResidentResourceSnapshot({
          worldId: row.worldId,
          residentId: row.residentId,
          cashCents: residentsById.get(residentId)?.resources.cashCents ?? 0,
          foodUnits: row.foodUnits,
          version: row.resourceVersion,
          itemId: row.itemId,
          locationId: row.locationId,
        });
      });
    },
  };
}
