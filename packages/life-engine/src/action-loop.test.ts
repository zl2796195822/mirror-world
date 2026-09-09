import { describe, expect, it } from "vitest";
import type { ActionRequest, KernelActionOutcome } from "@mirror/contracts";
import {
  applyCompletedSleepToAnchors,
  createResidentNeedAnchorStore,
  runResidentActionLoopStep,
  type ActionLoopObservation,
  type ActionSubmissionResult,
} from "./action-loop.js";
import type { DecisionLocationRef } from "./rule-decision.js";

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

function observation(
  overrides: Partial<ActionLoopObservation> = {},
): ActionLoopObservation {
  return {
    residentId: RESIDENT_ID,
    actorId: ACTOR_ID,
    homeLocationId: HOME_ID,
    workplaceId: OFFICE_ID,
    stateVersion: 1,
    locationId: PARK_ID,
    locationKind: "PARK",
    activityKind: "IDLE",
    profile: {
      personality: {
        conscientiousness: 0.6,
        extraversion: 0.5,
      },
      routine: {
        sleepPhase: "STANDARD",
        mealPhase: "STANDARD",
        socialWindow: "EVENING",
        flexibility: 0.5,
      },
    },
    ...overrides,
  };
}

function committedOutcome(request: ActionRequest): KernelActionOutcome {
  return {
    status: "COMMITTED",
    outcomeId: "99999999-9999-4999-8999-999999999999",
    requestId: request.id,
    worldId: request.worldId,
    reasonCode: null,
    eventCount: 1,
    eventRefs: [
      {
        eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        eventIndex: 0,
        worldId: request.worldId,
        seq: "21",
        type: "RESIDENT_MOVE_STARTED",
      },
    ],
    worldSeqStart: "21",
    worldSeqEnd: "21",
    recordedAt: WORLD_TIME.toISOString(),
  };
}

function rejectedOutcome(request: ActionRequest): KernelActionOutcome {
  return {
    status: "REJECTED",
    outcomeId: "99999999-9999-4999-8999-999999999999",
    requestId: request.id,
    worldId: request.worldId,
    reasonCode: "KERNEL_INVALID_ACTION",
    eventCount: 0,
    eventRefs: [],
    worldSeqStart: null,
    worldSeqEnd: null,
    recordedAt: WORLD_TIME.toISOString(),
  };
}

describe("runResidentActionLoopStep", () => {
  it("closes observation → needs → goals → decision → action request", async () => {
    const { store } = createResidentNeedAnchorStore();
    store.set(RESIDENT_ID, {
      worldTime: WORLD_TIME,
      activity: "AWAKE",
      hungerPressure: 10,
      restPressure: 95,
      socialPressure: 10,
    });

    const submitted: ActionRequest[] = [];
    const result = await runResidentActionLoopStep({
      world: {
        id: WORLD_ID,
        seed: "m3-t04-loop",
        status: "RUNNING",
        worldTime: WORLD_TIME,
        worldSeq: "20",
      },
      observation: observation(),
      locations: LOCATIONS,
      needAnchors: store,
      submission: {
        async submit(request) {
          submitted.push(request);
          return {
            disposition: "EXECUTED",
            request,
            outcome: committedOutcome(request),
          };
        },
      },
    });

    expect(result.policyVersion).toBe("m3-action-loop-v1");
    expect(result.goalEvaluation.selectedGoal?.type).toBe("REST");
    expect(result.decision.selectedCandidate?.actionType).toBe("MOVE");
    expect(result.decision.selectedCandidate?.parameters).toMatchObject({
      destinationId: HOME_ID,
    });
    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.actionType).toBe("MOVE");
    expect(submitted[0]?.requestedBy).toBe("RULE");
    expect(submitted[0]?.parameters).toMatchObject({ destinationId: HOME_ID });
    expect(result.submission?.outcome?.status).toBe("COMMITTED");
    expect(result.replan?.directive).toBe("SUCCESS");
  });

  it("produces SLEEP request when resident is already home with high rest", async () => {
    const { store } = createResidentNeedAnchorStore();
    store.set(RESIDENT_ID, {
      worldTime: WORLD_TIME,
      activity: "AWAKE",
      hungerPressure: 10,
      restPressure: 95,
      socialPressure: 10,
    });

    const result = await runResidentActionLoopStep({
      world: {
        id: WORLD_ID,
        seed: "m3-t04-loop",
        status: "RUNNING",
        worldTime: WORLD_TIME,
        worldSeq: "20",
      },
      observation: observation({
        locationId: HOME_ID,
        locationKind: "HOME",
      }),
      locations: LOCATIONS,
      needAnchors: store,
      submission: {
        async submit(request) {
          return {
            disposition: "EXECUTED",
            request,
            outcome: committedOutcome(request),
          };
        },
      },
    });

    expect(result.decision.selectedCandidate?.actionType).toBe("SLEEP");
    expect(result.submission?.request.actionType).toBe("SLEEP");
  });

  it("classifies kernel rejection through bounded replan policy", async () => {
    const { store } = createResidentNeedAnchorStore();
    store.set(RESIDENT_ID, {
      worldTime: WORLD_TIME,
      activity: "AWAKE",
      hungerPressure: 10,
      restPressure: 95,
      socialPressure: 10,
    });

    const result = await runResidentActionLoopStep({
      world: {
        id: WORLD_ID,
        seed: "m3-t04-loop",
        status: "RUNNING",
        worldTime: WORLD_TIME,
        worldSeq: "20",
      },
      observation: observation(),
      locations: LOCATIONS,
      needAnchors: store,
      submission: {
        async submit(request): Promise<ActionSubmissionResult> {
          return {
            disposition: "EXECUTED",
            request,
            outcome: rejectedOutcome(request),
          };
        },
      },
    });

    expect(result.submission?.outcome?.status).toBe("REJECTED");
    expect(result.replan?.failureClass).toBe("PERMANENT_INVALID");
    expect(result.replan?.directive).toBe("STOP");
    expect(
      result.replan && "stopReason" in result.replan
        ? result.replan.stopReason
        : null,
    ).toBe("NO_FEASIBLE_ALTERNATIVE");
  });

  it("defers idle residents without a feasible action using world-time delay", async () => {
    const { store } = createResidentNeedAnchorStore();
    store.set(RESIDENT_ID, {
      worldTime: WORLD_TIME,
      activity: "AWAKE",
      hungerPressure: 90,
      restPressure: 10,
      socialPressure: 10,
    });

    const result = await runResidentActionLoopStep({
      world: {
        id: WORLD_ID,
        seed: "m3-t04-loop",
        status: "RUNNING",
        worldTime: WORLD_TIME,
        worldSeq: "20",
      },
      observation: observation(),
      locations: LOCATIONS,
      needAnchors: store,
      submission: {
        async submit() {
          throw new Error("should not submit");
        },
      },
    });

    expect(result.submission).toBeNull();
    expect(result.decision.noActionReason).toBe("NO_FEASIBLE_CANDIDATE");
    expect(result.replan?.directive).toBe("DEFER_UNTIL_WORLD_TIME");
  });

  it("applies completed sleep to need anchors", () => {
    const { store } = createResidentNeedAnchorStore();
    const anchor = {
      worldTime: new Date("2026-09-09T22:00:00.000Z"),
      activity: "AWAKE" as const,
      hungerPressure: 40,
      restPressure: 95,
      socialPressure: 30,
    };
    store.set(RESIDENT_ID, anchor);
    const next = applyCompletedSleepToAnchors({
      worldId: WORLD_ID,
      resident: {
        residentId: RESIDENT_ID,
        profile: {
          personality: { extraversion: 0.5 },
          routine: { flexibility: 0.5 },
        },
      },
      needAnchors: store,
      anchor,
      sleepStartedAtWorldTime: new Date("2026-09-09T22:00:00.000Z"),
      sleepCompletedAtWorldTime: new Date("2026-09-10T06:00:00.000Z"),
    });
    expect(next.activity).toBe("AWAKE");
    expect(next.restPressure).toBeLessThan(95);
    expect(store.get(RESIDENT_ID)?.restPressure).toBe(next.restPressure);
  });

  it("does not mutate other residents' anchors", async () => {
    const { store } = createResidentNeedAnchorStore();
    const otherId = "88888888-8888-4888-8888-888888888888";
    store.set(otherId, {
      worldTime: WORLD_TIME,
      activity: "AWAKE",
      hungerPressure: 50,
      restPressure: 50,
      socialPressure: 50,
    });
    store.set(RESIDENT_ID, {
      worldTime: WORLD_TIME,
      activity: "AWAKE",
      hungerPressure: 10,
      restPressure: 95,
      socialPressure: 10,
    });

    await runResidentActionLoopStep({
      world: {
        id: WORLD_ID,
        seed: "m3-t04-loop",
        status: "RUNNING",
        worldTime: WORLD_TIME,
        worldSeq: "20",
      },
      observation: observation(),
      locations: LOCATIONS,
      needAnchors: store,
      submission: {
        async submit(request) {
          return {
            disposition: "EXECUTED",
            request,
            outcome: committedOutcome(request),
          };
        },
      },
    });

    expect(store.get(otherId)?.restPressure).toBe(50);
    expect(store.get(RESIDENT_ID)?.restPressure).toBe(95);
  });
});
