import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { M0_FIXTURE_IDS } from "./fixture.js";
import {
  EMPLOYED_RESIDENT_COUNT,
  RESIDENT_PROFILE_COUNT,
  RESIDENT_SEED_CONFIG_VERSION,
  RESIDENT_SEED_COUNT,
  RESIDENT_SEED_GENERATOR_VERSION,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
} from "./resident-seed.js";

const input = {
  worldId: M0_FIXTURE_IDS.world,
  seed: "RES-M3-001-seed-20260908",
} as const;

function countBy<T extends string>(values: readonly T[]): Record<T, number> {
  return values.reduce(
    (counts, value) => ({ ...counts, [value]: (counts[value] ?? 0) + 1 }),
    {} as Record<T, number>,
  );
}

describe("M3-T01 resident seed", () => {
  it("generates a stable 30-resident fixture with stable ordering and IDs", () => {
    const first = generateResidentSeed(input);
    const second = generateResidentSeed(input);
    const ids = first.residents.map(({ residentId }) => residentId);

    expect(first).toEqual(second);
    expect(first.residents).toHaveLength(RESIDENT_SEED_COUNT);
    expect(new Set(ids).size).toBe(RESIDENT_SEED_COUNT);
    expect(ids).toEqual([...ids].sort());
    expect(ids.every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
    expect(first.generatorVersion).toBe(RESIDENT_SEED_GENERATOR_VERSION);
    expect(first.configVersion).toBe(RESIDENT_SEED_CONFIG_VERSION);
    expect(first.profileHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the required profile and employment distributions", () => {
    const fixture = generateResidentSeed(input);
    const profileCounts = countBy(
      fixture.residents.map(({ profile }) => profile.routine.profileId),
    );
    const employmentCounts = countBy(
      fixture.residents.map(({ employment }) => employment.status),
    );
    const roleCounts = countBy(
      fixture.residents.flatMap(({ employment }) =>
        employment.status === "EMPLOYED" ? [employment.role] : [],
      ),
    );
    const cashCounts = countBy(
      fixture.residents.map(({ resources }) => String(resources.cashCents)),
    );
    const foodCounts = countBy(
      fixture.residents.map(({ resources }) => String(resources.foodUnits)),
    );

    expect(Object.keys(profileCounts)).toHaveLength(RESIDENT_PROFILE_COUNT);
    expect(Object.values(profileCounts)).toEqual([6, 6, 6, 6, 6]);
    expect(employmentCounts).toEqual({
      EMPLOYED: EMPLOYED_RESIDENT_COUNT,
      UNEMPLOYED: 4,
    });
    expect(roleCounts).toEqual({
      OFFICE_ASSISTANT: 9,
      CAFE_BARISTA: 9,
      STORE_CLERK: 8,
    });

    expect({
      residentCount: fixture.residents.length,
      profileCounts,
      employmentCounts,
      roleCounts,
      cashCounts,
      foodCounts,
    }).toMatchInlineSnapshot(`
      {
        "cashCounts": {
          "120000": 5,
          "160000": 5,
          "200000": 5,
          "260000": 5,
          "320000": 5,
          "400000": 5,
        },
        "employmentCounts": {
          "EMPLOYED": 26,
          "UNEMPLOYED": 4,
        },
        "foodCounts": {
          "0": 5,
          "1": 5,
          "2": 10,
          "3": 5,
          "4": 5,
        },
        "profileCounts": {
          "early-private": 6,
          "early-social": 6,
          "late-flexible": 6,
          "late-social": 6,
          "standard-balanced": 6,
        },
        "residentCount": 30,
        "roleCounts": {
          "CAFE_BARISTA": 9,
          "OFFICE_ASSISTANT": 9,
          "STORE_CLERK": 8,
        },
      }
    `);
  });

  it("uses only valid first-street fixture references and read-only resource values", () => {
    const fixture = generateResidentSeed(input);
    const locations = new Set(
      getFirstStreetLocationFixtures(input.worldId).map(({ id }) => id),
    );
    const workplaces = new Set(
      getFirstStreetLocationFixtures(input.worldId)
        .filter(({ kind }) => ["OFFICE", "CAFE", "STORE"].includes(kind))
        .map(({ id }) => id),
    );

    expect(
      fixture.residents.every(({ homeLocationId }) =>
        locations.has(homeLocationId),
      ),
    ).toBe(true);
    expect(
      fixture.residents.every(
        ({ employment }) =>
          employment.status === "UNEMPLOYED" ||
          workplaces.has(employment.workplaceId),
      ),
    ).toBe(true);
    expect(
      fixture.residents.every(({ identityKind }) => identityKind === "NATIVE"),
    ).toBe(true);
    expect(
      fixture.residents.every(
        ({ residentId, actorRef, profile, resources }) =>
          residentId !== actorRef.actorId &&
          actorRef.scope === "FIXTURE_ONLY" &&
          resources.residentId === residentId &&
          resources.worldId === input.worldId &&
          resources.cashCents >= 0 &&
          resources.foodUnits >= 0 &&
          resources.version === 0 &&
          Object.values(profile.personality).every(
            (value) => value >= 0 && value <= 1,
          ),
      ),
    ).toBe(true);
  });

  it("changes the fixture for a different seed without changing the fixed count", () => {
    const first = generateResidentSeed(input);
    const second = generateResidentSeed({ ...input, seed: "another-seed" });

    expect(second.residents).toHaveLength(RESIDENT_SEED_COUNT);
    expect(second).not.toEqual(first);
    expect(second.residents.map(({ residentId }) => residentId)).not.toEqual(
      first.residents.map(({ residentId }) => residentId),
    );
  });

  it("does not use runtime randomness or wall-clock input", () => {
    const source = readFileSync(
      new URL("./resident-seed.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toMatch(/Math\.random|randomUUID|Date\.now|new Date/);
  });
});
