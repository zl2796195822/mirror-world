import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { M0_FIXTURE_IDS, generateResidentSeed } from "@mirror/db";
import {
  GOAL_POLICY_V1,
  evaluateGoals,
  evaluateResidentsGoals,
  type GoalEvaluationInput,
  type GoalResident,
} from "./goals.js";
import type { NeedState } from "./needs.js";

const worldId = M0_FIXTURE_IDS.world;
const worldTime = new Date("2026-09-08T08:15:00.000Z");

const resident: GoalResident = {
  residentId: "00000000-0000-4000-8000-000000000001",
  worldId,
  homeLocationId: "home-1",
  profile: {
    personality: { conscientiousness: 0.8, extraversion: 0.6 },
    routine: {
      sleepPhase: "STANDARD",
      mealPhase: "STANDARD",
      socialWindow: "AFTERNOON",
    },
  },
  employment: { status: "EMPLOYED", workplaceId: "work-1" },
};

const calmNeeds: NeedState = {
  residentId: resident.residentId,
  policyVersion: "m3-needs-v1",
  hungerPressure: 20,
  restPressure: 20,
  socialPressure: 20,
  energyLevel: 80,
  conditionBand: "STABLE",
};

function input(
  overrides: Partial<GoalEvaluationInput> = {},
): GoalEvaluationInput {
  return {
    worldId,
    seed: "RES-M3-001-seed-20260908",
    currentWorldTime: worldTime,
    status: "RUNNING",
    resident,
    needs: calmNeeds,
    ...overrides,
  };
}

describe("M3-T03 goal engine", () => {
  it("turns a high need into a Goal without producing an ActionRequest", () => {
    const result = evaluateGoals(
      input({
        needs: { ...calmNeeds, hungerPressure: 90 },
      }),
    );

    expect(result.policyVersion).toBe("m3-goals-v1");
    expect(result.selectedGoal?.type).toBe("SATISFY_HUNGER");
    expect(result.selectedGoal?.source).toBe("NEED");
    expect(result.selectedGoal?.reasonCode).toBe("HUNGER_HIGH");
    expect(result).not.toHaveProperty("actionRequest");
  });

  it("uses a routine window as a Goal source even when pressure is low", () => {
    const result = evaluateGoals(input());

    expect(result.selectedGoal?.type).toBe("SATISFY_HUNGER");
    expect(result.selectedGoal?.source).toBe("ROUTINE");
    expect(result.selectedGoal?.reasonCode).toBe("MEAL_WINDOW");
  });

  it("lets a due work obligation outrank an ordinary need", () => {
    const result = evaluateGoals(
      input({
        needs: { ...calmNeeds, hungerPressure: 85 },
        obligation: {
          status: "DUE",
          workplaceId: "work-1",
          deadline: new Date("2026-09-08T09:00:00.000Z"),
        },
      }),
    );

    expect(result.selectedGoal?.type).toBe("FULFILL_WORK_OBLIGATION");
    expect(result.selectedGoal?.source).toBe("OBLIGATION");
    expect(result.selectedGoal?.targetLocationId).toBe("work-1");
  });

  it("reroutes to a context Goal when an event interrupts routine", () => {
    const result = evaluateGoals(
      input({
        context: {
          event: "RETURN_HOME_REQUIRED",
          currentLocationId: "work-1",
        },
      }),
    );

    expect(result.selectedGoal?.type).toBe("RETURN_HOME");
    expect(result.selectedGoal?.source).toBe("CONTEXT");
    expect(result.selectedGoal?.reasonCode).toBe("RETURN_HOME_REQUIRED");
    expect(result.selectedGoal?.targetLocationId).toBe(resident.homeLocationId);
  });

  it("does not advance routines or emit a Goal while paused", () => {
    const result = evaluateGoals(
      input({
        status: "PAUSED",
        needs: { ...calmNeeds, hungerPressure: 100 },
        obligation: {
          status: "DUE",
          workplaceId: "work-1",
          deadline: new Date("2026-09-08T09:00:00.000Z"),
        },
      }),
    );

    expect(result.candidates).toEqual([]);
    expect(result.selectedGoal).toBeNull();
  });

  it("keeps an active Goal stable within the policy switch margin", () => {
    const result = evaluateGoals(
      input({
        needs: { ...calmNeeds, hungerPressure: 90, restPressure: 90 },
        activeGoal: { type: "SATISFY_HUNGER", status: "ACTIVE" },
      }),
    );

    expect(result.selectedGoal?.type).toBe("SATISFY_HUNGER");
  });

  it("uses a stable key when candidates have the same score", () => {
    const result = evaluateGoals(
      input({
        currentWorldTime: new Date("2026-09-08T12:00:00.000Z"),
        needs: { ...calmNeeds, hungerPressure: 90, restPressure: 90 },
        policy: {
          ...GOAL_POLICY_V1,
          priorities: {
            ...GOAL_POLICY_V1.priorities,
            hunger: 80,
            rest: 80,
          },
        },
      }),
    );

    expect(result.selectedGoal?.type).toBe("REST");
    expect(result.candidates.map(({ type }) => type)).toEqual([
      "REST",
      "SATISFY_HUNGER",
    ]);
  });

  it("evaluates all T01 residents in stable order through the T02 boundary", () => {
    const fixture = generateResidentSeed({
      worldId,
      seed: "RES-M3-001-seed-20260908",
    });
    const needInputs = fixture.residents.map((seedResident) => ({
      resident: {
        residentId: seedResident.residentId,
        worldId: seedResident.worldId,
        homeLocationId: seedResident.homeLocationId,
        profile: {
          personality: {
            conscientiousness:
              seedResident.profile.personality.conscientiousness,
            extraversion: seedResident.profile.personality.extraversion,
          },
          routine: seedResident.profile.routine,
        },
        employment: seedResident.employment,
      },
      needs: {
        ...calmNeeds,
        hungerPressure: 85,
        residentId: seedResident.residentId,
      },
      obligation:
        seedResident.employment.status === "EMPLOYED"
          ? {
              status: "DUE" as const,
              workplaceId: seedResident.employment.workplaceId,
              deadline: new Date("2026-09-08T09:00:00.000Z"),
            }
          : undefined,
    }));
    const first = evaluateResidentsGoals({
      worldId,
      seed: "RES-M3-001-seed-20260908",
      currentWorldTime: new Date("2026-09-08T08:15:00.000Z"),
      status: "RUNNING",
      residents: needInputs,
    });
    const second = evaluateResidentsGoals({
      worldId,
      seed: "RES-M3-001-seed-20260908",
      currentWorldTime: new Date("2026-09-08T08:15:00.000Z"),
      status: "RUNNING",
      residents: [...needInputs].reverse(),
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(30);
    expect(first.map(({ residentId }) => residentId)).toEqual(
      [...first.map(({ residentId }) => residentId)].sort(),
    );
    expect(first.every(({ selectedGoal }) => selectedGoal !== null)).toBe(true);
  });

  it("has no wall-clock, runtime randomness, timer, LLM, or request submission path", () => {
    const source = readFileSync(new URL("./goals.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(
      /Math\.random|randomUUID|Date\.now|performance\.now|setInterval|setTimeout|ActionRequest|LLM|OpenAI|Anthropic/,
    );
  });
});
