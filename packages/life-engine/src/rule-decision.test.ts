import { describe, expect, it } from "vitest";
import { evaluateNeeds } from "./needs.js";
import {
  evaluateRuleDecision,
  RULE_DECISION_POLICY_VERSION,
  type DecisionLocationRef,
  type RuleDecisionInput,
} from "./rule-decision.js";

const WORLD_ID = "11111111-1111-4111-8111-111111111111";
const RESIDENT_ID = "22222222-2222-4222-8222-222222222222";
const ACTOR_ID = "33333333-3333-4333-8333-333333333333";
const HOME_ID = "44444444-4444-4444-8444-444444444444";
const OFFICE_ID = "55555555-5555-4555-8555-555555555555";
const CAFE_ID = "66666666-6666-4666-8666-666666666666";
const PARK_ID = "77777777-7777-4777-8777-777777777777";

const LOCATIONS: readonly DecisionLocationRef[] = [
  { id: HOME_ID, kind: "HOME" },
  { id: OFFICE_ID, kind: "OFFICE" },
  { id: CAFE_ID, kind: "CAFE" },
  { id: PARK_ID, kind: "PARK" },
];

const WORLD_TIME = new Date("2026-09-09T22:30:00.000Z");

function baseInput(
  overrides: Partial<RuleDecisionInput> = {},
): RuleDecisionInput {
  return {
    worldId: WORLD_ID,
    seed: "m3-t04-seed",
    currentWorldTime: WORLD_TIME,
    status: "RUNNING",
    sourceWorldSeq: "12",
    decisionEpoch: 0,
    resident: {
      residentId: RESIDENT_ID,
      worldId: WORLD_ID,
      actorId: ACTOR_ID,
      homeLocationId: HOME_ID,
      workplaceId: OFFICE_ID,
      stateVersion: 3,
    },
    observation: {
      locationId: PARK_ID,
      locationKind: "PARK",
      activity: { kind: "IDLE" },
    },
    needs: {
      residentId: RESIDENT_ID,
      policyVersion: "m3-needs-v1",
      hungerPressure: 30,
      restPressure: 92,
      socialPressure: 20,
      energyLevel: 8,
      conditionBand: "CRITICAL",
    },
    selectedGoal: {
      type: "REST",
      score: 110,
      priority: 90,
      reasonCode: "REST_HIGH",
    },
    locations: LOCATIONS,
    ...overrides,
  };
}

describe("evaluateRuleDecision", () => {
  it("is deterministic for identical inputs", () => {
    const left = evaluateRuleDecision(baseInput());
    const right = evaluateRuleDecision(baseInput());
    expect(left.selectedCandidate?.id).toBe(right.selectedCandidate?.id);
    expect(left.actionRequestDraft?.stableRequestSeed).toBe(
      right.actionRequestDraft?.stableRequestSeed,
    );
    expect(left.candidates.map((candidate) => candidate.stableKey)).toEqual(
      right.candidates.map((candidate) => candidate.stableKey),
    );
    expect(left.policyVersion).toBe(RULE_DECISION_POLICY_VERSION);
  });

  it("prefers MOVE home when REST goal and resident is away", () => {
    const decision = evaluateRuleDecision(baseInput());
    expect(decision.selectedCandidate?.actionType).toBe("MOVE");
    expect(decision.selectedCandidate?.parameters).toEqual({
      actionType: "MOVE",
      destinationId: HOME_ID,
    });
    expect(decision.selectedCandidate?.feasible).toBe(true);
    expect(decision.actionRequestDraft?.requestedBy).toBe("RULE");
    expect(decision.noActionReason).toBeNull();
  });

  it("selects SLEEP when REST goal and resident is already home", () => {
    const decision = evaluateRuleDecision(
      baseInput({
        observation: {
          locationId: HOME_ID,
          locationKind: "HOME",
          activity: { kind: "IDLE" },
        },
      }),
    );
    expect(decision.selectedCandidate?.actionType).toBe("SLEEP");
    expect(decision.selectedCandidate?.parameters).toEqual({
      actionType: "SLEEP",
    });
  });

  it("rejects SLEEP outside HOME via hard constraints", () => {
    const decision = evaluateRuleDecision(
      baseInput({
        observation: {
          locationId: OFFICE_ID,
          locationKind: "OFFICE",
          activity: { kind: "IDLE" },
        },
        selectedGoal: {
          type: "REST",
          score: 110,
          priority: 90,
          reasonCode: "REST_HIGH",
        },
      }),
    );
    // Away from home, REST maps to MOVE home, not SLEEP.
    expect(decision.selectedCandidate?.actionType).toBe("MOVE");
    expect(decision.selectedCandidate?.parameters).toMatchObject({
      destinationId: HOME_ID,
    });
    const sleepLike = decision.candidates.filter(
      (candidate) => candidate.actionType === "SLEEP",
    );
    expect(sleepLike).toHaveLength(0);
  });

  it("returns no action when busy", () => {
    const decision = evaluateRuleDecision(
      baseInput({
        observation: {
          locationId: PARK_ID,
          locationKind: "PARK",
          activity: { kind: "TRAVELING" },
        },
      }),
    );
    expect(decision.noActionReason).toBe("RESIDENT_BUSY");
    expect(decision.selectedCandidate).toBeNull();
  });

  it("returns no action when world is paused", () => {
    const decision = evaluateRuleDecision(baseInput({ status: "PAUSED" }));
    expect(decision.noActionReason).toBe("WORLD_NOT_RUNNING");
  });

  it("returns no action when no goal is selected", () => {
    const decision = evaluateRuleDecision(baseInput({ selectedGoal: null }));
    expect(decision.noActionReason).toBe("NO_SELECTED_GOAL");
  });

  it("does not treat hunger as executable without EAT lifecycle", () => {
    const decision = evaluateRuleDecision(
      baseInput({
        selectedGoal: {
          type: "SATISFY_HUNGER",
          score: 100,
          priority: 80,
          reasonCode: "HUNGER_HIGH",
        },
      }),
    );
    expect(decision.selectedCandidate).toBeNull();
    expect(decision.noActionReason).toBe("NO_FEASIBLE_CANDIDATE");
    expect(decision.candidates.every((candidate) => !candidate.feasible)).toBe(
      true,
    );
    expect(
      decision.candidates.some((candidate) =>
        candidate.hardConstraints.some(
          (item) => item.code === "GOAL_HAS_ACTION_PATH" && !item.passed,
        ),
      ),
    ).toBe(true);
  });

  it("moves employed resident to workplace for work obligation", () => {
    const decision = evaluateRuleDecision(
      baseInput({
        observation: {
          locationId: HOME_ID,
          locationKind: "HOME",
          activity: { kind: "IDLE" },
          workObligation: {
            status: "DUE",
            workplaceId: OFFICE_ID,
          },
        },
        selectedGoal: {
          type: "FULFILL_WORK_OBLIGATION",
          score: 120,
          priority: 100,
          reasonCode: "WORK_OBLIGATION_DUE",
          targetLocationId: OFFICE_ID,
        },
      }),
    );
    expect(decision.selectedCandidate?.actionType).toBe("MOVE");
    expect(decision.selectedCandidate?.parameters).toMatchObject({
      destinationId: OFFICE_ID,
    });
  });

  it("keeps stable candidate ordering across equivalent score ties", () => {
    const first = evaluateRuleDecision(
      baseInput({
        selectedGoal: {
          type: "RETURN_HOME",
          score: 90,
          priority: 130,
          reasonCode: "RETURN_HOME_REQUIRED",
        },
      }),
    );
    const second = evaluateRuleDecision(
      baseInput({
        selectedGoal: {
          type: "RETURN_HOME",
          score: 90,
          priority: 130,
          reasonCode: "RETURN_HOME_REQUIRED",
        },
      }),
    );
    expect(first.candidates.map((c) => c.id)).toEqual(
      second.candidates.map((c) => c.id),
    );
  });

  it("uses needs from the same resident only", () => {
    expect(() =>
      evaluateRuleDecision(
        baseInput({
          needs: {
            residentId: ACTOR_ID,
            hungerPressure: 1,
            restPressure: 1,
            socialPressure: 1,
          },
        }),
      ),
    ).toThrow(/different resident/);
  });

  it("feeds needs evaluation into decision deterministically", () => {
    const anchor = {
      worldTime: WORLD_TIME,
      activity: "AWAKE" as const,
      hungerPressure: 10,
      restPressure: 10,
      socialPressure: 10,
    };
    const needs = evaluateNeeds({
      worldId: WORLD_ID,
      currentWorldTime: new Date("2026-09-10T08:00:00.000Z"),
      status: "RUNNING",
      resident: {
        residentId: RESIDENT_ID,
        profile: {
          personality: { extraversion: 0.5 },
          routine: { flexibility: 0.5 },
        },
      },
      anchor,
    });
    const decision = evaluateRuleDecision(
      baseInput({
        currentWorldTime: new Date("2026-09-10T08:00:00.000Z"),
        needs,
        selectedGoal: {
          type: "REST",
          score: 90,
          priority: 90,
          reasonCode: "REST_HIGH",
        },
      }),
    );
    expect(decision.selectedCandidate).not.toBeNull();
    expect(decision.selectedCandidate?.scoreBreakdown.needUrgency).toBeCloseTo(
      needs.restPressure,
      6,
    );
  });
});
