import { describe, expect, it } from "vitest";
import {
  SCHEDULER_POLICY_VERSION,
  parseSchedulerStepResult,
  parseSchedulerWorkItem,
  parseScheduledWakeRegistration,
} from "./scheduler-contract.js";

const worldId = "00000000-0000-4000-8000-000000000001";
const residentId = "00000000-0000-4000-8000-000000000002";
const activityInstanceId = "00000000-0000-4000-8000-000000000003";
const worldTime = "2026-09-09T10:00:00.000Z";

describe("scheduler contracts", () => {
  it("parses an activity completion work item", () => {
    expect(
      parseSchedulerWorkItem({
        policyVersion: SCHEDULER_POLICY_VERSION,
        worldId,
        residentId,
        workType: "ACTIVITY_COMPLETION",
        wakeReason: "ACTIVITY_COMPLETED",
        dueWorldTime: worldTime,
        activityInstanceId,
        sourceStateVersion: 1,
        sourceWorldSeq: "4",
        decisionEpoch: 1,
      }),
    ).toMatchObject({
      workType: "ACTIVITY_COMPLETION",
      activityInstanceId,
    });
  });

  it("rejects an activity work item without its activity instance", () => {
    expect(() =>
      parseSchedulerWorkItem({
        policyVersion: SCHEDULER_POLICY_VERSION,
        worldId,
        residentId,
        workType: "ACTIVITY_COMPLETION",
        wakeReason: "ACTIVITY_COMPLETED",
        dueWorldTime: worldTime,
        activityInstanceId: null,
        sourceStateVersion: 1,
        sourceWorldSeq: "4",
        decisionEpoch: 1,
      }),
    ).toThrow();
  });

  it("parses a durable deferred wake registration", () => {
    expect(
      parseScheduledWakeRegistration({
        policyVersion: SCHEDULER_POLICY_VERSION,
        wakeId: activityInstanceId,
        worldId,
        residentId,
        wakeReason: "DEFERRED_REPLAN",
        dueWorldTime: worldTime,
        sourceStateVersion: 1,
        sourceWorldSeq: "4",
        decisionEpoch: 2,
        dedupeKey: "defer:resident:2",
      }),
    ).toMatchObject({ wakeReason: "DEFERRED_REPLAN" });
  });

  it("parses a decision wake without selecting an action", () => {
    const wake = parseSchedulerWorkItem({
      policyVersion: SCHEDULER_POLICY_VERSION,
      worldId,
      residentId,
      workType: "DECISION_WAKE",
      wakeReason: "DEFERRED_REPLAN",
      dueWorldTime: worldTime,
      activityInstanceId: null,
      wakeId: activityInstanceId,
      sourceStateVersion: 2,
      sourceWorldSeq: "4",
      decisionEpoch: 3,
    });

    expect(wake.workType).toBe("DECISION_WAKE");
    expect("selectedAction" in wake).toBe(false);
  });

  it("rejects unknown and cross-variant fields", () => {
    expect(() =>
      parseSchedulerWorkItem({
        policyVersion: SCHEDULER_POLICY_VERSION,
        worldId,
        residentId,
        workType: "DECISION_WAKE",
        wakeReason: "DEFERRED_REPLAN",
        dueWorldTime: worldTime,
        activityInstanceId: null,
        wakeId: null,
        sourceStateVersion: 2,
        sourceWorldSeq: "4",
        decisionEpoch: 3,
        selectedAction: "MOVE",
      }),
    ).toThrow();
    expect(() =>
      parseSchedulerWorkItem({
        policyVersion: SCHEDULER_POLICY_VERSION,
        worldId,
        residentId,
        workType: "ACTIVITY_COMPLETION",
        wakeReason: "ACTIVITY_COMPLETED",
        dueWorldTime: worldTime,
        activityInstanceId,
        wakeId: null,
        sourceStateVersion: 1,
        sourceWorldSeq: "4",
        decisionEpoch: 1,
      }),
    ).toThrow();
  });

  it("rejects invalid time and negative bounded counters", () => {
    expect(() =>
      parseSchedulerWorkItem({
        policyVersion: SCHEDULER_POLICY_VERSION,
        worldId,
        residentId,
        workType: "ACTIVITY_COMPLETION",
        wakeReason: "ACTIVITY_COMPLETED",
        dueWorldTime: "not-a-time",
        activityInstanceId,
        sourceStateVersion: -1,
        sourceWorldSeq: "4",
        decisionEpoch: 1,
      }),
    ).toThrow();
  });

  it("parses a machine-readable bounded step result", () => {
    const result = parseSchedulerStepResult({
      policyVersion: SCHEDULER_POLICY_VERSION,
      worldId,
      fromWorldTime: worldTime,
      toWorldTime: worldTime,
      fromWorldSeq: "4",
      toWorldSeq: "4",
      processedWork: 0,
      completedActivities: 0,
      completionOutcomes: [],
      wakeItems: [],
      failureItems: [],
      nextDueWorldTime: null,
    });

    expect(result.policyVersion).toBe(SCHEDULER_POLICY_VERSION);
    expect(result.failureItems).toEqual([]);
  });

  it("rejects a step that moves World Time backward", () => {
    expect(() =>
      parseSchedulerStepResult({
        policyVersion: SCHEDULER_POLICY_VERSION,
        worldId,
        fromWorldTime: worldTime,
        toWorldTime: "2026-09-09T09:59:59.000Z",
        fromWorldSeq: "4",
        toWorldSeq: "4",
        processedWork: 0,
        completedActivities: 0,
        completionOutcomes: [],
        wakeItems: [],
        failureItems: [],
        nextDueWorldTime: null,
      }),
    ).toThrow();
  });
});
