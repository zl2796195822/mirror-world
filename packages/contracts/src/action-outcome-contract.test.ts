import { describe, expect, it } from "vitest";
import {
  kernelActionOutcomeSchema,
  safeParseKernelActionOutcome,
} from "./action-outcome-contract.js";

const ids = {
  outcomeId: "00000000-0000-4000-8000-000000000030",
  requestId: "00000000-0000-4000-8000-000000000020",
  worldId: "00000000-0000-4000-8000-000000000002",
};

const firstEventId = "00000000-0000-4000-8000-000000000031";
const secondEventId = "00000000-0000-4000-8000-000000000032";

const recordedAt = "2026-09-08T00:02:00.000Z";

function event(eventId: string, eventIndex: number, seq: string) {
  return {
    eventId,
    eventIndex,
    worldId: ids.worldId,
    seq,
    type: "PURCHASE_COMPLETED",
  };
}

describe("KernelActionOutcome contract", () => {
  it("accepts a committed outcome with multiple authoritative events", () => {
    const result = safeParseKernelActionOutcome({
      ...ids,
      status: "COMMITTED",
      reasonCode: null,
      eventCount: 2,
      eventRefs: [event(firstEventId, 0, "21"), event(secondEventId, 1, "22")],
      worldSeqStart: "21",
      worldSeqEnd: "22",
      recordedAt,
    });

    expect(result.success).toBe(true);
  });

  it.each(["REJECTED", "CONFLICT"] as const)(
    "accepts a %s outcome with no events",
    (status) => {
      const result = safeParseKernelActionOutcome({
        ...ids,
        status,
        reasonCode:
          status === "CONFLICT" ? "KERNEL_CONFLICT" : "KERNEL_INVALID_LOCATION",
        eventCount: 0,
        eventRefs: [],
        worldSeqStart: null,
        worldSeqEnd: null,
        recordedAt,
      });

      expect(result.success).toBe(true);
    },
  );

  it.each([
    {
      status: "COMMITTED",
      reasonCode: null,
      eventCount: 0,
      eventRefs: [],
      worldSeqStart: null,
      worldSeqEnd: null,
    },
    {
      status: "REJECTED",
      reasonCode: null,
      eventCount: 0,
      eventRefs: [],
      worldSeqStart: null,
      worldSeqEnd: null,
    },
    {
      status: "COMMITTED",
      reasonCode: "TIMED_OUT",
      eventCount: 1,
      eventRefs: [event(firstEventId, 0, "21")],
      worldSeqStart: "21",
      worldSeqEnd: "21",
    },
  ])("rejects invalid outcome shapes", (shape) => {
    const result = safeParseKernelActionOutcome({
      ...ids,
      ...shape,
      recordedAt,
    });

    expect(result.success).toBe(false);
  });

  it("does not mutate a valid outcome while parsing", () => {
    const outcome = {
      ...ids,
      status: "REJECTED" as const,
      reasonCode: "KERNEL_INVALID_ACTION" as const,
      eventCount: 0,
      eventRefs: [],
      worldSeqStart: null,
      worldSeqEnd: null,
      recordedAt,
    };
    const before = structuredClone(outcome);

    expect(kernelActionOutcomeSchema.parse(outcome)).toEqual(outcome);
    expect(outcome).toEqual(before);
  });

  it("rejects event references from another world or non-increasing sequences", () => {
    const result = safeParseKernelActionOutcome({
      ...ids,
      status: "COMMITTED",
      reasonCode: null,
      eventCount: 2,
      eventRefs: [
        event(firstEventId, 0, "21"),
        {
          ...event(secondEventId, 1, "23"),
          worldId: "00000000-0000-4000-8000-000000000099",
        },
      ],
      worldSeqStart: "21",
      worldSeqEnd: "23",
      recordedAt,
    });

    expect(result.success).toBe(false);

    const nonIncreasing = safeParseKernelActionOutcome({
      ...ids,
      status: "COMMITTED",
      reasonCode: null,
      eventCount: 2,
      eventRefs: [event(firstEventId, 0, "21"), event(secondEventId, 1, "21")],
      worldSeqStart: "21",
      worldSeqEnd: "21",
      recordedAt,
    });
    expect(nonIncreasing.success).toBe(false);
  });

  it("accepts a sequence gap caused by another action's committed event", () => {
    const result = safeParseKernelActionOutcome({
      ...ids,
      status: "COMMITTED",
      reasonCode: null,
      eventCount: 2,
      eventRefs: [event(firstEventId, 0, "21"), event(secondEventId, 1, "23")],
      worldSeqStart: "21",
      worldSeqEnd: "23",
      recordedAt,
    });

    expect(result.success).toBe(true);
  });
});
