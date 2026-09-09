import { describe, expect, it } from "vitest";
import {
  actionRecoverySignalSchema,
  decisionAttemptBudgetSchema,
  replanDecisionSchema,
} from "./replan-contract.js";

const ids = {
  outcomeId: "00000000-0000-4000-8000-000000000030",
  requestId: "00000000-0000-4000-8000-000000000020",
  worldId: "00000000-0000-4000-8000-000000000002",
};

const committedOutcome = {
  ...ids,
  status: "COMMITTED" as const,
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
  recordedAt: "2026-09-09T00:00:00.000Z",
};

describe("PRE-AL-06 replan contracts", () => {
  it("accepts a per-decision-cycle budget and a kernel outcome signal", () => {
    expect(
      decisionAttemptBudgetSchema.parse({
        submissionAttempts: 1,
        conflictRecoveries: 0,
        replans: 0,
      }),
    ).toEqual({ submissionAttempts: 1, conflictRecoveries: 0, replans: 0 });

    expect(
      actionRecoverySignalSchema.parse({
        kind: "KERNEL_OUTCOME",
        disposition: "EXECUTED",
        outcome: committedOutcome,
      }),
    ).toMatchObject({ kind: "KERNEL_OUTCOME", disposition: "EXECUTED" });
  });

  it("accepts timeout reconciliation states without making timeout a Kernel status", () => {
    for (const reconciliation of [
      { status: "FOUND", outcome: committedOutcome },
      { status: "NOT_FOUND" },
      { status: "UNAVAILABLE" },
    ]) {
      expect(
        actionRecoverySignalSchema.parse({
          kind: "TIMED_OUT",
          requestId: ids.requestId,
          worldId: ids.worldId,
          idempotencyKey: "resident-action-1",
          reconciliation,
        }),
      ).toMatchObject({ kind: "TIMED_OUT", reconciliation });
    }
  });

  it("binds a found reconciliation outcome to the original request and world", () => {
    expect(
      actionRecoverySignalSchema.safeParse({
        kind: "TIMED_OUT",
        requestId: ids.requestId,
        worldId: ids.worldId,
        idempotencyKey: "resident-action-1",
        reconciliation: {
          status: "FOUND",
          outcome: { ...committedOutcome, requestId: ids.outcomeId },
        },
      }).success,
    ).toBe(false);
    expect(
      actionRecoverySignalSchema.safeParse({
        kind: "TIMED_OUT",
        requestId: ids.requestId,
        worldId: ids.worldId,
        idempotencyKey: "resident-action-1",
        reconciliation: {
          status: "FOUND",
          outcome: {
            ...committedOutcome,
            worldId: "00000000-0000-4000-8000-000000000099",
          },
        },
      }).success,
    ).toBe(false);
  });

  it("keeps directives strict and rejects invalid budget or extra fields", () => {
    expect(
      decisionAttemptBudgetSchema.safeParse({
        submissionAttempts: -1,
        conflictRecoveries: 0,
        replans: 0,
      }).success,
    ).toBe(false);
    expect(
      replanDecisionSchema.safeParse({
        policyVersion: "m3-replan-v1",
        directive: "SUCCESS",
        failureClass: "SUCCESS",
        reasonCode: null,
        budget: { submissionAttempts: 0, conflictRecoveries: 0, replans: 0 },
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
