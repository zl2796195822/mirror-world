import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { M0_FIXTURE_IDS, generateResidentSeed } from "@mirror/db";
import {
  NEED_POLICY_V1,
  applySleepCompletionToNeedAnchor,
  evaluateNeeds,
  evaluateResidentsNeeds,
  type NeedAnchor,
  type ResidentNeedProfile,
} from "./needs.js";

const worldId = M0_FIXTURE_IDS.world;
const worldTime = new Date("2026-09-08T00:00:00.000Z");
const anchor: NeedAnchor = {
  worldTime,
  activity: "AWAKE",
  hungerPressure: 10,
  restPressure: 20,
  socialPressure: 15,
};
const resident: ResidentNeedProfile = {
  residentId: "00000000-0000-4000-8000-000000000001",
  profile: {
    personality: { extraversion: 0.68 },
    routine: { flexibility: 0.35 },
  },
};

describe("M3-T02 needs evaluator", () => {
  it("exposes exactly three core pressures with one policy version", () => {
    const result = evaluateNeeds({
      worldId,
      currentWorldTime: worldTime,
      status: "RUNNING",
      resident,
      anchor,
    });

    expect(result.policyVersion).toBe("m3-needs-v1");
    expect(result).toHaveProperty("hungerPressure");
    expect(result).toHaveProperty("restPressure");
    expect(result).toHaveProperty("socialPressure");
    expect(result).not.toHaveProperty("stress");
    expect(result).not.toHaveProperty("moneyPressure");
    expect(result).not.toHaveProperty("purpose");
    expect(result).not.toHaveProperty("safety");
  });

  it("uses world time lazily and keeps every value in range", () => {
    const result = evaluateNeeds({
      worldId,
      currentWorldTime: new Date("2026-09-12T00:00:00.000Z"),
      status: "RUNNING",
      resident,
      anchor,
    });

    for (const value of [
      result.hungerPressure,
      result.restPressure,
      result.socialPressure,
      result.energyLevel,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(result.hungerPressure).toBeGreaterThan(anchor.hungerPressure);
    expect(result.restPressure).toBeGreaterThan(anchor.restPressure);
    expect(result.socialPressure).toBeGreaterThan(anchor.socialPressure);
  });

  it("clamps both pressure growth and resting relief", () => {
    const exhausted = evaluateNeeds({
      worldId,
      currentWorldTime: new Date("2030-01-01T00:00:00.000Z"),
      status: "RUNNING",
      resident,
      anchor: {
        ...anchor,
        hungerPressure: 99,
        restPressure: 99,
        socialPressure: 99,
      },
    });
    const recovered = evaluateNeeds({
      worldId,
      currentWorldTime: new Date("2030-01-01T00:00:00.000Z"),
      status: "RUNNING",
      resident,
      anchor: { ...anchor, activity: "RESTING", restPressure: 99 },
    });

    expect(exhausted.hungerPressure).toBe(100);
    expect(exhausted.restPressure).toBe(100);
    expect(exhausted.socialPressure).toBe(100);
    expect(recovered.restPressure).toBe(0);
    expect(recovered.energyLevel).toBe(100);
  });

  it("does not evolve while paused or maintained", () => {
    for (const status of ["PAUSED", "MAINTENANCE"] as const) {
      const result = evaluateNeeds({
        worldId,
        currentWorldTime: new Date("2030-01-01T00:00:00.000Z"),
        status,
        resident,
        anchor,
      });

      expect(result.hungerPressure).toBe(anchor.hungerPressure);
      expect(result.restPressure).toBe(anchor.restPressure);
      expect(result.socialPressure).toBe(anchor.socialPressure);
    }
  });

  it("supports a deterministic anchor reset without reading resources", () => {
    const afterAcceptedRelief = evaluateNeeds({
      worldId,
      currentWorldTime: new Date("2026-09-08T02:00:00.000Z"),
      status: "RUNNING",
      resident,
      anchor: {
        ...anchor,
        worldTime: new Date("2026-09-08T02:00:00.000Z"),
        hungerPressure: 2,
      },
    });

    expect(afterAcceptedRelief.hungerPressure).toBe(2);
  });

  it("reanchors from RESTING to AWAKE at explicit sleep completion time", () => {
    const sleepStartedAt = new Date("2026-09-08T00:00:00.000Z");
    const sleepCompletedAt = new Date("2026-09-08T08:00:00.000Z");
    const afterSleep = evaluateNeeds({
      worldId,
      currentWorldTime: sleepCompletedAt,
      status: "RUNNING",
      resident,
      anchor: { ...anchor, worldTime: sleepStartedAt, activity: "RESTING" },
    });
    const awakeAnchor: NeedAnchor = {
      worldTime: sleepCompletedAt,
      activity: "AWAKE",
      hungerPressure: afterSleep.hungerPressure,
      restPressure: afterSleep.restPressure,
      socialPressure: afterSleep.socialPressure,
    };
    const afterWake = evaluateNeeds({
      worldId,
      currentWorldTime: new Date("2026-09-08T09:00:00.000Z"),
      status: "RUNNING",
      resident,
      anchor: awakeAnchor,
    });

    expect(afterSleep.restPressure).toBeLessThan(anchor.restPressure);
    expect(afterWake.restPressure).toBeGreaterThan(afterSleep.restPressure);
    expect(afterWake.hungerPressure).toBeGreaterThan(afterSleep.hungerPressure);
    expect(afterWake.socialPressure).toBeGreaterThan(afterSleep.socialPressure);
  });

  it("adapts a completed SLEEP result into the existing NeedAnchor", () => {
    const nextAnchor = applySleepCompletionToNeedAnchor({
      worldId,
      resident,
      anchor,
      sleepStartedAtWorldTime: new Date("2026-09-08T00:00:00.000Z"),
      sleepCompletedAtWorldTime: new Date("2026-09-08T08:00:00.000Z"),
    });

    expect(nextAnchor).toMatchObject({
      activity: "AWAKE",
      worldTime: new Date("2026-09-08T08:00:00.000Z"),
    });
    expect(nextAnchor.restPressure).toBeLessThan(anchor.restPressure);
    expect(nextAnchor.hungerPressure).toBeGreaterThan(anchor.hungerPressure);
    expect(nextAnchor.socialPressure).toBeGreaterThan(anchor.socialPressure);
  });

  it("exposes the policy version instead of hiding calibration changes", () => {
    const result = evaluateNeeds({
      worldId,
      currentWorldTime: worldTime,
      status: "RUNNING",
      resident,
      anchor,
      policy: { ...NEED_POLICY_V1, version: "m3-needs-v1-calibration-2" },
    });

    expect(result.policyVersion).toBe("m3-needs-v1-calibration-2");
  });

  it("keeps resting pressure and derived energy consistent", () => {
    const result = evaluateNeeds({
      worldId,
      currentWorldTime: new Date("2026-09-08T04:00:00.000Z"),
      status: "RUNNING",
      resident,
      anchor: { ...anchor, activity: "RESTING" },
    });

    expect(result.restPressure).toBeLessThan(anchor.restPressure);
    expect(result.energyLevel).toBeCloseTo(100 - result.restPressure, 8);
  });

  it("evaluates all 30 T01 residents with stable ordering and variation", () => {
    const fixture = generateResidentSeed({
      worldId,
      seed: "RES-M3-001-seed-20260908",
    });
    const inputs = fixture.residents.map((seedResident) => ({
      resident: seedResident,
      anchor,
    }));
    const first = evaluateResidentsNeeds({
      worldId,
      currentWorldTime: new Date("2026-09-09T00:00:00.000Z"),
      status: "RUNNING",
      residents: inputs,
    });
    const second = evaluateResidentsNeeds({
      worldId,
      currentWorldTime: new Date("2026-09-09T00:00:00.000Z"),
      status: "RUNNING",
      residents: [...inputs].reverse(),
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(30);
    expect(first.map(({ residentId }) => residentId)).toEqual(
      [...first.map(({ residentId }) => residentId)].sort(),
    );
    expect(
      new Set(first.map(({ hungerPressure }) => hungerPressure)).size,
    ).toBeGreaterThan(1);
  });

  it("applies hysteresis to the derived condition band", () => {
    const critical = evaluateNeeds({
      worldId,
      currentWorldTime: worldTime,
      status: "RUNNING",
      resident,
      anchor: { ...anchor, hungerPressure: 95 },
    });
    const held = evaluateNeeds({
      worldId,
      currentWorldTime: worldTime,
      status: "RUNNING",
      resident,
      anchor: { ...anchor, hungerPressure: 85 },
      previousConditionBand: "CRITICAL",
    });

    expect(critical.conditionBand).toBe("CRITICAL");
    expect(held.conditionBand).toBe("CRITICAL");
  });

  it("is independent of runtime randomness and timers", () => {
    const source = readFileSync(new URL("./needs.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(
      /Math\.random|randomUUID|Date\.now|new Date|performance\.now/,
    );
    expect(source).not.toMatch(/setInterval|setTimeout/);
  });
});
