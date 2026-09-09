import { describe, expect, it } from "vitest";
import type {
  ActionRecoverySignal,
  DecisionAttemptBudget,
  ReplanPolicyInput,
} from "@mirror/contracts";
import {
  REPLAN_POLICY_V1,
  classifyFailure,
  decideReplan,
  getReconsiderationDelayWorldMinutes,
} from "./replan-policy.js";

const ids = {
  outcomeId: "00000000-0000-4000-8000-000000000030",
  requestId: "00000000-0000-4000-8000-000000000020",
  worldId: "00000000-0000-4000-8000-000000000002",
};

const worldTime = "2026-09-09T00:00:00.000Z";
const budget: DecisionAttemptBudget = {
  submissionAttempts: 1,
  conflictRecoveries: 0,
  replans: 0,
};

function rejected(reasonCode: string): ActionRecoverySignal {
  return {
    kind: "KERNEL_OUTCOME",
    disposition: "EXECUTED",
    outcome: {
      outcomeId: ids.outcomeId,
      requestId: ids.requestId,
      worldId: ids.worldId,
      status: "REJECTED",
      reasonCode: reasonCode as never,
      eventCount: 0,
      eventRefs: [],
      worldSeqStart: null,
      worldSeqEnd: null,
      recordedAt: worldTime,
    },
  } as ActionRecoverySignal;
}

function input(
  signal: ActionRecoverySignal,
  overrides: Partial<ReplanPolicyInput> = {},
): ReplanPolicyInput {
  return {
    currentWorldTime: worldTime,
    budget,
    signal,
    ...overrides,
  };
}

describe("PRE-AL-06 bounded replan policy", () => {
  it("treats COMMITTED and reused duplicate outcomes as terminal success", () => {
    const signal: ActionRecoverySignal = {
      kind: "KERNEL_OUTCOME",
      disposition: "REUSED",
      outcome: {
        ...ids,
        status: "COMMITTED",
        reasonCode: null,
        eventCount: 1,
        eventRefs: [
          {
            eventId: "00000000-0000-4000-8000-000000000031",
            eventIndex: 0,
            worldId: ids.worldId,
            seq: "21",
            type: "RESIDENT_MOVE_STARTED",
          },
        ],
        worldSeqStart: "21",
        worldSeqEnd: "21",
        recordedAt: worldTime,
      },
    };

    expect(decideReplan(input(signal))).toMatchObject({
      directive: "SUCCESS",
      failureClass: "SUCCESS",
      budget,
    });
  });

  it("routes conflict to bounded reobserve and never same-request retry", () => {
    const signal: ActionRecoverySignal = {
      kind: "KERNEL_OUTCOME",
      disposition: "EXECUTED",
      outcome: {
        ...ids,
        status: "CONFLICT",
        reasonCode: "KERNEL_CONFLICT",
        eventCount: 0,
        eventRefs: [],
        worldSeqStart: null,
        worldSeqEnd: null,
        recordedAt: worldTime,
      },
    };
    const result = decideReplan(input(signal));

    expect(result).toMatchObject({
      directive: "REOBSERVE_NOW",
      failureClass: "STALE_STATE",
      budget: { submissionAttempts: 1, conflictRecoveries: 1, replans: 0 },
    });
  });

  it.each([
    ["KERNEL_INVALID_ACTION", "PERMANENT_INVALID"],
    ["KERNEL_ACTOR_NOT_FOUND", "PERMANENT_INVALID"],
    ["KERNEL_INVALID_LOCATION", "PERMANENT_INVALID"],
    ["KERNEL_PERMISSION_DENIED", "AUTHORIZATION"],
    ["KERNEL_INSUFFICIENT_RESOURCE", "RESOURCE_UNAVAILABLE"],
    ["KERNEL_INSUFFICIENT_FUNDS", "RESOURCE_UNAVAILABLE"],
  ] as const)("classifies %s as %s", (reasonCode, failureClass) => {
    expect(classifyFailure(rejected(reasonCode)).failureClass).toBe(
      failureClass,
    );
  });

  it("replans only when an alternative is explicitly available", () => {
    expect(
      decideReplan(
        input(rejected("KERNEL_INVALID_LOCATION"), {
          alternativeCandidateAvailable: true,
        }),
      ),
    ).toMatchObject({
      directive: "REPLAN_NOW",
      budget: { submissionAttempts: 1, conflictRecoveries: 0, replans: 1 },
    });
    expect(
      decideReplan(input(rejected("KERNEL_INVALID_LOCATION"))),
    ).toMatchObject({
      directive: "STOP",
      stopReason: "NO_FEASIBLE_ALTERNATIVE",
    });
  });

  it("defers not-due completion on World Time and never creates a retry", () => {
    const result = decideReplan(
      input({
        kind: "NOT_DUE",
        requestId: ids.requestId,
        worldId: ids.worldId,
        dueAtWorldTime: "2026-09-09T00:30:00.000Z",
      }),
    );

    expect(result).toMatchObject({
      directive: "DEFER_UNTIL_WORLD_TIME",
      failureClass: "TEMPORARY_NOT_DUE",
      untilWorldTime: "2026-09-09T00:30:00.000Z",
    });
  });

  it("reconciles a committed timeout and retries only when no durable outcome exists", () => {
    const committedTimeout: ActionRecoverySignal = {
      kind: "TIMED_OUT",
      requestId: ids.requestId,
      worldId: ids.worldId,
      idempotencyKey: "resident-action-1",
      reconciliation: {
        status: "FOUND",
        outcome: {
          ...ids,
          status: "COMMITTED",
          reasonCode: null,
          eventCount: 1,
          eventRefs: [
            {
              eventId: "00000000-0000-4000-8000-000000000031",
              eventIndex: 0,
              worldId: ids.worldId,
              seq: "21",
              type: "RESIDENT_MOVE_STARTED",
            },
          ],
          worldSeqStart: "21",
          worldSeqEnd: "21",
          recordedAt: worldTime,
        },
      },
    };
    expect(decideReplan(input(committedTimeout))).toMatchObject({
      directive: "SUCCESS",
    });

    const notRecorded: ActionRecoverySignal = {
      ...committedTimeout,
      reconciliation: { status: "NOT_FOUND" },
    };
    expect(decideReplan(input(notRecorded))).toMatchObject({
      directive: "RETRY_SAME_REQUEST",
      failureClass: "TRANSPORT_TIMEOUT",
      requestId: ids.requestId,
      idempotencyKey: "resident-action-1",
      budget: { submissionAttempts: 2 },
    });
    expect(
      decideReplan(
        input(notRecorded, {
          budget: { submissionAttempts: 2, conflictRecoveries: 0, replans: 0 },
        }),
      ),
    ).toMatchObject({
      directive: "STOP",
      stopReason: "BUDGET_EXHAUSTED",
      failureClass: "TRANSPORT_TIMEOUT",
    });
  });

  it("fails closed for idempotency conflict, unavailable reconciliation, and unknown errors", () => {
    expect(
      decideReplan(
        input({
          kind: "IDEMPOTENCY_CONFLICT",
          requestId: ids.requestId,
          worldId: ids.worldId,
        }),
      ),
    ).toMatchObject({ directive: "STOP", stopReason: "IDEMPOTENCY_ERROR" });
    expect(
      decideReplan(
        input({
          kind: "TIMED_OUT",
          requestId: ids.requestId,
          worldId: ids.worldId,
          idempotencyKey: "resident-action-1",
          reconciliation: { status: "UNAVAILABLE" },
        }),
      ),
    ).toMatchObject({
      directive: "STOP",
      stopReason: "RECONCILIATION_REQUIRED",
    });
    expect(
      decideReplan(input({ kind: "UNKNOWN_FAILURE", code: "unclassified" })),
    ).toMatchObject({ directive: "STOP", failureClass: "UNKNOWN_FAILURE" });
    expect(decideReplan(input(rejected("WORLD_NOT_RUNNING")))).toMatchObject({
      directive: "STOP",
      stopReason: "WORLD_NOT_RUNNING",
    });
    expect(
      decideReplan(input({ kind: "EXECUTOR_ERROR", code: "ROLLBACK" })),
    ).toMatchObject({ directive: "STOP", stopReason: "INTERNAL_ERROR" });
  });

  it("terminates repeated replan failures within the versioned budget", () => {
    let state = budget;
    let result = decideReplan(
      input(rejected("KERNEL_INVALID_LOCATION"), {
        alternativeCandidateAvailable: true,
      }),
    );
    let steps = 0;
    for (; result.directive !== "STOP" && steps < 1000; steps += 1) {
      state = result.budget;
      result = decideReplan(
        input(rejected("KERNEL_INVALID_LOCATION"), {
          alternativeCandidateAvailable: true,
          budget: state,
        }),
      );
    }

    expect(steps).toBeLessThan(10);
    expect(result).toMatchObject({
      directive: "STOP",
      stopReason: "BUDGET_EXHAUSTED",
    });
  });

  it("uses explicit World Time deterministic reconsideration backoff", () => {
    expect(REPLAN_POLICY_V1.version).toBe("m3-replan-v1");
    expect(getReconsiderationDelayWorldMinutes(0)).toBe(2);
    expect(getReconsiderationDelayWorldMinutes(4)).toBe(32);
    expect(getReconsiderationDelayWorldMinutes(20)).toBe(60);

    const first = decideReplan(input(rejected("KERNEL_INSUFFICIENT_RESOURCE")));
    const second = decideReplan(
      input(rejected("KERNEL_INSUFFICIENT_RESOURCE"), {
        budget: { ...first.budget },
      }),
    );
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      directive: "DEFER_UNTIL_WORLD_TIME",
      untilWorldTime: "2026-09-09T00:02:00.000Z",
      budget,
    });
  });

  it("stops when conflict recovery budget is exhausted", () => {
    expect(
      decideReplan(
        input(
          {
            kind: "KERNEL_OUTCOME",
            disposition: "EXECUTED",
            outcome: {
              ...ids,
              status: "CONFLICT",
              reasonCode: "KERNEL_CONFLICT",
              eventCount: 0,
              eventRefs: [],
              worldSeqStart: null,
              worldSeqEnd: null,
              recordedAt: worldTime,
            },
          },
          {
            budget: {
              submissionAttempts: 1,
              conflictRecoveries: 2,
              replans: 0,
            },
          },
        ),
      ),
    ).toMatchObject({
      directive: "STOP",
      stopReason: "BUDGET_EXHAUSTED",
      failureClass: "STALE_STATE",
    });
  });

  it("fails closed when a not-due signal is already due", () => {
    expect(
      decideReplan(
        input({
          kind: "NOT_DUE",
          requestId: ids.requestId,
          worldId: ids.worldId,
          dueAtWorldTime: worldTime,
        }),
      ),
    ).toMatchObject({ directive: "STOP", stopReason: "UNKNOWN_FAILURE" });
  });
});
