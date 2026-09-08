import { describe, expect, it } from "vitest";
import { M0_FIXTURE_IDS, generateResidentSeed } from "@mirror/db";
import {
  ResidentBridgeError,
  createM3SeedResidentBridge,
} from "./resident-bridges.js";

const worldId = M0_FIXTURE_IDS.world;
const seed = "RES-M3-001-seed-20260908";

describe("M3 resident actor and resource bridges", () => {
  it("resolves all 30 residents with stable, world-scoped ActorRefs", async () => {
    const fixture = generateResidentSeed({ worldId, seed });
    const bridge = createM3SeedResidentBridge({ worldId, worldSeed: seed });
    const residentIds = fixture.residents.map(({ residentId }) => residentId);

    const first = await bridge.actorResolver.resolveResidentActorRefs({
      worldId,
      residentIds: [...residentIds].reverse(),
    });
    const second = await bridge.actorResolver.resolveResidentActorRefs({
      worldId,
      residentIds,
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(30);
    expect(first.map(({ residentId }) => residentId)).toEqual(
      [...residentIds].sort(),
    );
    expect(new Set(first.map(({ actorId }) => actorId)).size).toBe(30);
    expect(first[0].actorId).toBe(
      fixture.residents.find(
        ({ residentId }) => residentId === first[0].residentId,
      )?.actorRef.actorId,
    );
    expect(
      first.every(
        (ref) =>
          ref.worldId === worldId &&
          ref.kind === "NATIVE_RESIDENT" &&
          ref.residentId !== ref.actorId,
      ),
    ).toBe(true);
  });

  it("reads one immutable resource snapshot per resident without a write API", async () => {
    const fixture = generateResidentSeed({ worldId, seed });
    const bridge = createM3SeedResidentBridge({ worldId, worldSeed: seed });
    const residentIds = fixture.residents.map(({ residentId }) => residentId);

    const first = await bridge.resourceReader.getResidentResourceSnapshots({
      worldId,
      residentIds: [...residentIds].reverse(),
    });
    const second = await bridge.resourceReader.getResidentResourceSnapshots({
      worldId,
      residentIds,
    });

    expect(first).toEqual(second);
    expect(first.map(({ residentId }) => residentId)).toEqual(
      [...residentIds].sort(),
    );
    expect(
      first.every(
        ({ worldId: snapshotWorldId, cashCents, foodUnits, version }) =>
          snapshotWorldId === worldId &&
          cashCents >= 0 &&
          foodUnits >= 0 &&
          version === 0,
      ),
    ).toBe(true);
    expect(first).toEqual(
      [...fixture.residents]
        .sort((left, right) => left.residentId.localeCompare(right.residentId))
        .map(({ resources }) => resources),
    );
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(() => ((first[0] as { cashCents: number }).cashCents = 0)).toThrow();
    expect(second[0].cashCents).not.toBe(0);
  });

  it("rejects unknown residents and same-shaped ids from another world", async () => {
    const bridge = createM3SeedResidentBridge({ worldId, worldSeed: seed });
    const otherWorldId = "00000000-0000-4000-8000-000000000003";

    await expect(
      bridge.actorResolver.resolveResidentActorRef({
        worldId,
        residentId: "00000000-0000-4000-8000-000000000099",
      }),
    ).rejects.toMatchObject({ code: "RESIDENT_NOT_FOUND" });

    const fixtureResidentId = generateResidentSeed({ worldId, seed })
      .residents[0].residentId;
    await expect(
      bridge.actorResolver.resolveResidentActorRef({
        worldId: otherWorldId,
        residentId: fixtureResidentId,
      }),
    ).rejects.toMatchObject({ code: "WORLD_MISMATCH" });

    await expect(
      bridge.resourceReader.getResidentResourceSnapshot({
        worldId: otherWorldId,
        residentId: "00000000-0000-4000-8000-000000000010",
      }),
    ).rejects.toMatchObject({ code: "WORLD_MISMATCH" });
  });

  it("uses an explicit machine-readable bridge error", async () => {
    const bridge = createM3SeedResidentBridge({ worldId, worldSeed: seed });

    try {
      await bridge.resourceReader.getResidentResourceSnapshots({
        worldId,
        residentIds: [],
      });
      throw new Error("expected invalid query");
    } catch (error) {
      expect(error).toBeInstanceOf(ResidentBridgeError);
      expect((error as ResidentBridgeError).code).toBe("INVALID_QUERY");
    }
  });
});
