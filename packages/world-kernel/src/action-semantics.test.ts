import { describe, expect, it } from "vitest";
import {
  ACTION_SEMANTICS_POLICY_VERSION,
  addWorldMinutes,
  getSleepDurationWorldMinutes,
  getTravelDurationWorldMinutes,
} from "./action-semantics.js";

describe("M3 action semantics policy", () => {
  it("is versioned and gives deterministic bounded durations", () => {
    expect(ACTION_SEMANTICS_POLICY_VERSION).toBe("m3-action-semantics-v1");
    expect(getTravelDurationWorldMinutes("HOME", "CAFE")).toBe(10);
    expect(getTravelDurationWorldMinutes("HOME", "OFFICE")).toBe(15);
    expect(getSleepDurationWorldMinutes()).toBe(480);
    expect(addWorldMinutes(new Date("2026-09-09T00:00:00.000Z"), 10)).toEqual(
      new Date("2026-09-09T00:10:00.000Z"),
    );
  });
});
