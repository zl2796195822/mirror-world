import { describe, expect, it } from "vitest";
import {
  generateResidentSeed,
  getFirstStreetLocationFixtures,
} from "@mirror/db";
import {
  RUNTIME_STATE_POLICY_VERSION,
  type ResidentRuntimeObservation,
} from "@mirror/contracts";
import {
  deriveResidentRuntimeObservation,
  M3_RUNTIME_STATE_POLICY,
} from "./resident-runtime-authority.js";

const worldId = "00000000-0000-4000-8000-000000000001";
const seed = "runtime-state-test-seed";
const worldTime = new Date("2026-09-07T08:00:00.000Z");

describe("resident runtime state authority", () => {
  it("gives all 30 residents an explicit home and IDLE bootstrap state", () => {
    const fixture = generateResidentSeed({ worldId, seed });
    const observations = fixture.residents.map((resident) =>
      deriveResidentRuntimeObservation({
        worldId,
        worldSeed: seed,
        worldSeq: "0",
        worldTime,
        resident,
      }),
    );

    expect(observations).toHaveLength(30);
    expect(
      observations.every(
        ({ runtimeState }) =>
          runtimeState.policyVersion === RUNTIME_STATE_POLICY_VERSION &&
          runtimeState.currentLocation.kind === "HOME" &&
          runtimeState.currentLocation.locationId ===
            fixture.residents.find(
              ({ residentId }) => residentId === runtimeState.residentId,
            )?.homeLocationId &&
          runtimeState.activity.kind === "IDLE",
      ),
    ).toBe(true);
  });

  it("derives weekday obligation status from explicit UTC world time", () => {
    const resident = generateResidentSeed({ worldId, seed }).residents.find(
      ({ employment }) => employment.status === "EMPLOYED",
    );
    if (!resident) throw new Error("expected an employed resident");

    const before = deriveResidentRuntimeObservation({
      worldId,
      worldSeed: seed,
      worldSeq: "0",
      worldTime: new Date("2026-09-07T08:59:59.000Z"),
      resident,
    });
    const due = deriveResidentRuntimeObservation({
      worldId,
      worldSeed: seed,
      worldSeq: "0",
      worldTime: new Date("2026-09-07T09:00:00.000Z"),
      resident,
    });
    const late = deriveResidentRuntimeObservation({
      worldId,
      worldSeed: seed,
      worldSeq: "0",
      worldTime: new Date("2026-09-07T17:00:00.000Z"),
      resident,
    });

    expect(before.workObligation.status).toBe("NOT_DUE");
    expect(due.workObligation.status).toBe("DUE");
    expect(late.workObligation.status).toBe("LATE");
    expect(due.workObligation.workplaceId).toBe(
      resident.employment.workplaceId,
    );
  });

  it("uses only first-street fixture locations", () => {
    const resident = generateResidentSeed({ worldId, seed }).residents[0];
    const locationIds = new Set(
      getFirstStreetLocationFixtures(worldId).map(({ id }) => id),
    );
    const observation: ResidentRuntimeObservation =
      deriveResidentRuntimeObservation({
        worldId,
        worldSeed: seed,
        worldSeq: "0",
        worldTime,
        resident,
      });

    expect(
      locationIds.has(observation.runtimeState.currentLocation.locationId),
    ).toBe(true);
    expect(M3_RUNTIME_STATE_POLICY.initialActivity).toBe("IDLE");
  });

  it("allows an unchanged runtime anchor behind later world-time events", () => {
    const resident = generateResidentSeed({ worldId, seed }).residents[0];
    const observation = deriveResidentRuntimeObservation({
      worldId,
      worldSeed: seed,
      worldSeq: "0",
      worldTime: new Date("2026-09-07T09:00:00.000Z"),
      resident,
    });

    expect(observation.runtimeState.sourceWorldSeq).toBe("0");
  });

  it("distinguishes unemployed residents from employed residents outside a shift", () => {
    const fixture = generateResidentSeed({ worldId, seed });
    const unemployed = fixture.residents.find(
      ({ employment }) => employment.status === "UNEMPLOYED",
    );
    const employed = fixture.residents.find(
      ({ employment }) => employment.status === "EMPLOYED",
    );
    if (!unemployed || !employed)
      throw new Error("expected employment fixture");
    const weekend = new Date("2026-09-06T08:00:00.000Z");

    expect(
      deriveResidentRuntimeObservation({
        worldId,
        worldSeed: seed,
        worldSeq: "0",
        worldTime: weekend,
        resident: unemployed,
      }).workObligation,
    ).toMatchObject({
      status: "NO_CURRENT_OBLIGATION",
      workplaceId: null,
    });
    expect(
      deriveResidentRuntimeObservation({
        worldId,
        worldSeed: seed,
        worldSeq: "0",
        worldTime: weekend,
        resident: employed,
      }).workObligation,
    ).toMatchObject({
      status: "NOT_DUE",
      workplaceId: employed.employment.workplaceId,
      startsAtWorldTime: null,
      endsAtWorldTime: null,
    });
  });
});
