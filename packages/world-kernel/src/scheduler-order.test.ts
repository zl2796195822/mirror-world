import { describe, expect, it } from "vitest";
import {
  SCHEDULER_POLICY,
  compareSchedulerWorkItems,
  orderSchedulerWorkItems,
} from "./scheduler-order.js";
import { SCHEDULER_POLICY_VERSION } from "@mirror/contracts";

const base = {
  policyVersion: SCHEDULER_POLICY_VERSION,
  worldId: "00000000-0000-4000-8000-000000000001",
  residentId: "00000000-0000-4000-8000-000000000002",
  dueWorldTime: "2026-09-09T10:00:00.000Z",
  sourceStateVersion: 1,
  sourceWorldSeq: "4",
  decisionEpoch: 0,
} as const;

describe("scheduler ordering", () => {
  it("uses due time, resident UUID bytes, reason, and epoch", () => {
    const first = {
      ...base,
      workType: "DECISION_WAKE" as const,
      wakeReason: "WORK_BOUNDARY" as const,
      activityInstanceId: null,
      wakeId: null,
    };
    const second = {
      ...base,
      residentId: "00000000-0000-4000-8000-000000000003",
      workType: "ACTIVITY_COMPLETION" as const,
      wakeReason: "ACTIVITY_COMPLETED" as const,
      activityInstanceId: "00000000-0000-4000-8000-000000000004",
    };

    expect(compareSchedulerWorkItems(first, second)).toBeLessThan(0);
    expect(orderSchedulerWorkItems([second, first])).toEqual([first, second]);
  });

  it("has a bounded serial policy", () => {
    expect(SCHEDULER_POLICY.version).toBe(SCHEDULER_POLICY_VERSION);
    expect(SCHEDULER_POLICY.maxWorkItemsPerStep).toBe(30);
    expect(SCHEDULER_POLICY.phases).toEqual([
      "ACTIVITY_COMPLETION",
      "DECISION_WAKE",
    ]);
  });

  it("returns the same ordering for repeated identical inputs", () => {
    const items = [
      {
        ...base,
        residentId: "00000000-0000-4000-8000-000000000004",
        workType: "DECISION_WAKE" as const,
        wakeReason: "DEFERRED_REPLAN" as const,
        activityInstanceId: null,
        wakeId: "00000000-0000-4000-8000-000000000005",
      },
      {
        ...base,
        residentId: "00000000-0000-4000-8000-000000000003",
        workType: "DECISION_WAKE" as const,
        wakeReason: "INITIAL_DECISION" as const,
        activityInstanceId: null,
        wakeId: "00000000-0000-4000-8000-000000000006",
      },
      {
        ...base,
        residentId: "00000000-0000-4000-8000-000000000002",
        workType: "ACTIVITY_COMPLETION" as const,
        wakeReason: "ACTIVITY_COMPLETED" as const,
        activityInstanceId: "00000000-0000-4000-8000-000000000007",
      },
    ];
    const expected = orderSchedulerWorkItems(items).map(
      ({ residentId, workType, wakeReason, decisionEpoch }) =>
        `${residentId}:${workType}:${wakeReason}:${decisionEpoch}`,
    );
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(
        orderSchedulerWorkItems(items).map(
          ({ residentId, workType, wakeReason, decisionEpoch }) =>
            `${residentId}:${workType}:${wakeReason}:${decisionEpoch}`,
        ),
      ).toEqual(expected);
    }
  });
});
