import { describe, expect, it } from "vitest";
import {
  OBSERVATION_POLICY_VERSION,
  buildWorldObservationSnapshot,
  parseWorldObservationSnapshot,
  type ObservationResidentRecord,
  type ObservationWorldRecord,
} from "./observation-contract.js";

const world: ObservationWorldRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  seed: "world-seed-v1",
  status: "RUNNING",
  worldTime: new Date("2026-09-08T08:00:00.000Z"),
  worldSeq: 12n,
};

const resident: ObservationResidentRecord = {
  residentId: "00000000-0000-4000-8000-000000000010",
  worldId: world.id,
  identityKind: "NATIVE",
  homeLocationId: "00000000-0000-4000-8000-000000000020",
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
  employment: {
    status: "EMPLOYED",
    workplaceId: "00000000-0000-4000-8000-000000000021",
    role: "OFFICE_ASSISTANT",
  },
};

describe("WorldObservationSnapshot contract", () => {
  it("builds a bounded, world-scoped, resident-scoped read snapshot", () => {
    const snapshot = buildWorldObservationSnapshot({ world, resident });

    expect(snapshot).toMatchObject({
      policyVersion: OBSERVATION_POLICY_VERSION,
      worldId: world.id,
      subjectResidentId: resident.residentId,
      worldSeed: world.seed,
      worldTime: world.worldTime.toISOString(),
      worldStatus: world.status,
      sourceWorldSeq: "12",
      self: {
        residentId: resident.residentId,
        homeLocationId: resident.homeLocationId,
        employment: resident.employment,
      },
    });
    expect(snapshot).not.toHaveProperty("otherResidents");
    expect(snapshot.actorRef.status).toBe("UNAVAILABLE");
    expect(snapshot.location.status).toBe("UNAVAILABLE");
    expect(snapshot.activity.status).toBe("UNAVAILABLE");
    expect(snapshot.workObligation.status).toBe("UNAVAILABLE");
    expect(snapshot.resources.status).toBe("UNAVAILABLE");
    expect(snapshot.localContext.status).toBe("UNAVAILABLE");
    expect(Object.isFrozen(snapshot.self.profile.routine)).toBe(true);
    expect(Object.isFrozen(snapshot.localContext.entities)).toBe(true);
  });

  it("has a runtime-validated contract and no wall-clock metadata", () => {
    const snapshot = buildWorldObservationSnapshot({ world, resident });

    expect(parseWorldObservationSnapshot(snapshot)).toEqual(snapshot);
    expect(snapshot).not.toHaveProperty("snapshotCreatedAt");
    expect(snapshot).not.toHaveProperty("createdAt");
  });
});
