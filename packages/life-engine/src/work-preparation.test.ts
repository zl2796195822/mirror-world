import { describe, expect, it } from "vitest";
import {
  createResidentNeedAnchorStore,
  runResidentActionLoopStepV2,
} from "./action-loop.js";
import { evaluateGoals, type GoalEvaluationInput } from "./goals.js";

const worldId = "00000000-0000-4000-8000-000000000001";
const residentId = "00000000-0000-4000-8000-000000000002";
const workplaceId = "00000000-0000-4000-8000-000000000003";
const preparationWorldTime = new Date("2026-09-07T08:45:00.000Z");
const shiftStartWorldTime = new Date("2026-09-07T09:00:00.000Z");

function preparationInput(): GoalEvaluationInput {
  return {
    worldId,
    seed: "work-preparation-test",
    currentWorldTime: preparationWorldTime,
    status: "RUNNING",
    resident: {
      residentId,
      worldId,
      homeLocationId: "00000000-0000-4000-8000-000000000004",
      profile: {
        personality: { conscientiousness: 0.8, extraversion: 0.5 },
        routine: {
          sleepPhase: "STANDARD",
          mealPhase: "STANDARD",
          socialWindow: "MORNING",
        },
      },
      employment: { status: "EMPLOYED", workplaceId },
    },
    needs: {
      residentId,
      policyVersion: "m3-needs-v1",
      hungerPressure: 20,
      restPressure: 20,
      socialPressure: 20,
      energyLevel: 80,
      conditionBand: "STABLE",
    },
    obligation: {
      status: "NOT_DUE",
      workplaceId,
      startsAtWorldTime: shiftStartWorldTime,
    },
    workPreparation: {
      boundaryWorldTime: preparationWorldTime,
      travelDurationWorldMinutes: 15,
    },
  } satisfies GoalEvaluationInput;
}

describe("M3 WORK preparation goal", () => {
  it("creates a work preparation opportunity at the deterministic commute boundary", () => {
    const result = evaluateGoals(preparationInput());

    expect(result.selectedGoal).toMatchObject({
      type: "FULFILL_WORK_OBLIGATION",
      reasonCode: "WORK_PREPARATION",
    });
  });

  it("turns the preparation goal into a workplace MOVE through Action Loop v2", async () => {
    const { store } = createResidentNeedAnchorStore();
    const submitted: string[] = [];
    const result = await runResidentActionLoopStepV2({
      world: {
        id: worldId,
        seed: "work-preparation-test",
        status: "RUNNING",
        worldTime: preparationWorldTime,
        worldSeq: "0",
      },
      observation: {
        residentId,
        actorId: "00000000-0000-4000-8000-000000000005",
        homeLocationId: "00000000-0000-4000-8000-000000000004",
        workplaceId,
        locationId: "00000000-0000-4000-8000-000000000004",
        locationKind: "HOME",
        activityKind: "IDLE",
        obligation: {
          status: "NOT_DUE",
          workplaceId,
          startsAtWorldTime: shiftStartWorldTime,
        },
        workPreparation: {
          boundaryWorldTime: preparationWorldTime,
          travelDurationWorldMinutes: 15,
        },
        profile: preparationInput().resident.profile,
      },
      locations: [
        { id: "00000000-0000-4000-8000-000000000004", kind: "HOME" },
        { id: workplaceId, kind: "OFFICE", capabilities: ["WORK"] },
      ],
      needAnchors: store,
      submission: {
        async submit(request) {
          submitted.push(request.actionType);
          return {
            disposition: "EXECUTED",
            request,
            outcome: null,
          };
        },
      },
    });

    expect(result.goalEvaluation.selectedGoal?.reasonCode).toBe(
      "WORK_PREPARATION",
    );
    expect(result.decision.selectedCandidate?.actionType).toBe("MOVE");
    expect(submitted).toEqual(["MOVE"]);
  });
});
