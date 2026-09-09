import {
  SCHEDULER_POLICY_VERSION,
  type SchedulerWorkItem,
} from "@mirror/contracts";

export const SCHEDULER_POLICY = {
  version: SCHEDULER_POLICY_VERSION,
  maxWorkItemsPerStep: 30,
  phases: ["ACTIVITY_COMPLETION", "DECISION_WAKE"] as const,
  wakeReasonOrder: [
    "ACTIVITY_COMPLETED",
    "DEFERRED_REPLAN",
    "INITIAL_DECISION",
    "WORK_BOUNDARY",
  ] as const,
} as const;

function compareUuidBytes(left: string, right: string): number {
  const leftHex = left.replaceAll("-", "").toLowerCase();
  const rightHex = right.replaceAll("-", "").toLowerCase();
  for (let index = 0; index < leftHex.length; index += 2) {
    const difference =
      Number.parseInt(leftHex.slice(index, index + 2), 16) -
      Number.parseInt(rightHex.slice(index, index + 2), 16);
    if (difference !== 0) return difference;
  }
  return 0;
}

function compareDates(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

function workTypeOrder(workType: SchedulerWorkItem["workType"]): number {
  return SCHEDULER_POLICY.phases.indexOf(workType);
}

function wakeReasonOrder(wakeReason: SchedulerWorkItem["wakeReason"]): number {
  return SCHEDULER_POLICY.wakeReasonOrder.indexOf(wakeReason);
}

export function compareSchedulerWorkItems(
  left: SchedulerWorkItem,
  right: SchedulerWorkItem,
): number {
  return (
    compareDates(left.dueWorldTime, right.dueWorldTime) ||
    compareUuidBytes(left.residentId, right.residentId) ||
    wakeReasonOrder(left.wakeReason) - wakeReasonOrder(right.wakeReason) ||
    left.decisionEpoch - right.decisionEpoch ||
    workTypeOrder(left.workType) - workTypeOrder(right.workType) ||
    compareUuidBytes(
      left.workType === "ACTIVITY_COMPLETION"
        ? left.activityInstanceId
        : (left.wakeId ?? "00000000-0000-0000-0000-000000000000"),
      right.workType === "ACTIVITY_COMPLETION"
        ? right.activityInstanceId
        : (right.wakeId ?? "00000000-0000-0000-0000-000000000000"),
    )
  );
}

export function orderSchedulerWorkItems(
  items: readonly SchedulerWorkItem[],
): SchedulerWorkItem[] {
  return [...items].sort(compareSchedulerWorkItems);
}
