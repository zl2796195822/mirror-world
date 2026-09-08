import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createObservationQuery,
  type ObservationResidentRecord,
  type ObservationSource,
  type ObservationWorldRecord,
} from "./observation-query-store.js";

const worldA: ObservationWorldRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  seed: "world-a-seed",
  status: "RUNNING",
  worldTime: new Date("2026-09-08T08:00:00.000Z"),
  worldSeq: 12n,
};

const worldB: ObservationWorldRecord = {
  ...worldA,
  id: "00000000-0000-4000-8000-000000000002",
  seed: "world-b-seed",
  worldSeq: 4n,
};

function resident(
  world: ObservationWorldRecord,
  residentId: string,
  homeLocationId: string,
): ObservationResidentRecord {
  return {
    residentId,
    worldId: world.id,
    identityKind: "NATIVE",
    homeLocationId,
    profile: {
      version: "first-street-v1",
      personality: { conscientiousness: 0.8, extraversion: 0.6 },
      routine: {
        sleepPhase: "STANDARD",
        mealPhase: "STANDARD",
        socialWindow: "AFTERNOON",
        flexibility: 0.55,
      },
    },
    employment: { status: "UNEMPLOYED", workplaceId: null, role: null },
  };
}

function sourceFor(
  worlds: readonly ObservationWorldRecord[],
  residents: readonly ObservationResidentRecord[],
): ObservationSource {
  return {
    async readWorld(worldId) {
      return worlds.find((candidate) => candidate.id === worldId) ?? null;
    },
    async readResidents(input) {
      return residents.filter(
        (candidate) =>
          candidate.worldId === input.worldId &&
          input.residentIds.includes(candidate.residentId),
      );
    },
  };
}

describe("observation query boundary", () => {
  it("returns the same deep-frozen snapshot for the same input", async () => {
    const subject = resident(
      worldA,
      "00000000-0000-4000-8000-000000000010",
      "00000000-0000-4000-8000-000000000020",
    );
    const query = createObservationQuery(sourceFor([worldA], [subject]));

    const first = await query.getResidentObservation({
      worldId: worldA.id,
      residentId: subject.residentId,
    });
    const second = await query.getResidentObservation({
      worldId: worldA.id,
      residentId: subject.residentId,
    });

    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.self)).toBe(true);
    expect(Object.isFrozen(first.self.profile)).toBe(true);
  });

  it("keeps same-shaped resident ids isolated by world", async () => {
    const residentId = "00000000-0000-4000-8000-000000000010";
    const query = createObservationQuery(
      sourceFor(
        [worldA, worldB],
        [
          resident(worldA, residentId, "00000000-0000-4000-8000-000000000020"),
          resident(worldB, residentId, "00000000-0000-4000-8000-000000000030"),
        ],
      ),
    );

    const snapshotA = await query.getResidentObservation({
      worldId: worldA.id,
      residentId,
    });
    const snapshotB = await query.getResidentObservation({
      worldId: worldB.id,
      residentId,
    });

    expect(snapshotA.worldId).toBe(worldA.id);
    expect(snapshotA.self.homeLocationId).toBe(
      "00000000-0000-4000-8000-000000000020",
    );
    expect(snapshotB.worldId).toBe(worldB.id);
    expect(snapshotB.self.homeLocationId).toBe(
      "00000000-0000-4000-8000-000000000030",
    );
  });

  it("sorts batch results by resident id rather than source order", async () => {
    const residents = [
      resident(
        worldA,
        "00000000-0000-4000-8000-000000000012",
        "00000000-0000-4000-8000-000000000022",
      ),
      resident(
        worldA,
        "00000000-0000-4000-8000-000000000010",
        "00000000-0000-4000-8000-000000000020",
      ),
      resident(
        worldA,
        "00000000-0000-4000-8000-000000000011",
        "00000000-0000-4000-8000-000000000021",
      ),
    ];
    const query = createObservationQuery(
      sourceFor([worldA], [...residents].reverse()),
    );

    const snapshots = await query.getResidentObservations({
      worldId: worldA.id,
      residentIds: residents.map(({ residentId }) => residentId),
    });

    expect(snapshots.map(({ subjectResidentId }) => subjectResidentId)).toEqual(
      [
        "00000000-0000-4000-8000-000000000010",
        "00000000-0000-4000-8000-000000000011",
        "00000000-0000-4000-8000-000000000012",
      ],
    );
  });

  it("reads one world and one resident source for a bounded batch", async () => {
    let worldReads = 0;
    let residentReads = 0;
    const subjects = [
      resident(
        worldA,
        "00000000-0000-4000-8000-000000000010",
        "00000000-0000-4000-8000-000000000020",
      ),
      resident(
        worldA,
        "00000000-0000-4000-8000-000000000011",
        "00000000-0000-4000-8000-000000000021",
      ),
      resident(
        worldA,
        "00000000-0000-4000-8000-000000000012",
        "00000000-0000-4000-8000-000000000022",
      ),
    ];
    const query = createObservationQuery({
      async readWorld(worldId) {
        worldReads += 1;
        return worldId === worldA.id ? worldA : null;
      },
      async readResidents(input) {
        residentReads += 1;
        return subjects.filter(({ residentId }) =>
          input.residentIds.includes(residentId),
        );
      },
    });

    await query.getResidentObservations({
      worldId: worldA.id,
      residentIds: subjects.map(({ residentId }) => residentId),
    });

    expect(worldReads).toBe(1);
    expect(residentReads).toBe(1);
  });

  it("does not expose a resident from another world or an unknown world", async () => {
    const residentId = "00000000-0000-4000-8000-000000000010";
    const query = createObservationQuery(
      sourceFor([worldA], [resident(worldA, residentId, "home-1")]),
    );

    await expect(
      query.getResidentObservation({ worldId: worldB.id, residentId }),
    ).rejects.toMatchObject({
      code: "WORLD_NOT_FOUND",
    });
    await expect(
      query.getResidentObservation({
        worldId: worldA.id,
        residentId: "00000000-0000-4000-8000-000000000099",
      }),
    ).rejects.toMatchObject({
      code: "RESIDENT_NOT_FOUND",
    });
  });

  it("rejects an explicitly stale world sequence", async () => {
    const subject = resident(
      worldA,
      "00000000-0000-4000-8000-000000000010",
      "home-1",
    );
    const query = createObservationQuery(sourceFor([worldA], [subject]));

    await expect(
      query.getResidentObservation({
        worldId: worldA.id,
        residentId: subject.residentId,
        expectedWorldSeq: "11",
      }),
    ).rejects.toMatchObject({ code: "STALE_READ" });
  });

  it("does not use runtime randomness or wall-clock time", () => {
    const source = readFileSync(
      new URL("./observation-query-store.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(
      /Math\.random|Date\.now|new Date|performance\.now|setTimeout|setInterval/,
    );
  });
});
