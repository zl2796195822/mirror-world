import { describe, expect, it } from "vitest";
import {
  EAT_DURATION_WORLD_MINUTES,
  TALK_DURATION_WORLD_MINUTES,
  getWorkShift,
  workObligationKey,
} from "./lifecycle-semantics.js";

describe("M3 lifecycle semantics", () => {
  it("freezes world-time durations", () => {
    expect(EAT_DURATION_WORLD_MINUTES).toBe(30);
    expect(TALK_DURATION_WORLD_MINUTES).toBe(15);
  });

  it("accepts only the exact UTC work boundary", () => {
    const start = new Date("2026-09-14T09:00:00.000Z");
    expect(getWorkShift(start)).toMatchObject({
      status: "DUE",
      start: start.toISOString(),
      end: "2026-09-14T17:00:00.000Z",
    });
    expect(getWorkShift(new Date("2026-09-14T09:01:00.000Z")).status).toBe(
      "DUE",
    );
    expect(getWorkShift(new Date("2026-09-14T08:59:00.000Z")).status).toBe(
      "NOT_DUE",
    );
    expect(getWorkShift(new Date("2026-09-12T09:00:00.000Z")).status).toBe(
      "NOT_DUE",
    );
  });

  it("uses a deterministic shift identity", () => {
    expect(
      workObligationKey(
        "00000000-0000-4000-8000-000000000001",
        "2026-09-14T09:00:00.000Z",
      ),
    ).toBe("00000000-0000-4000-8000-000000000001|2026-09-14T09:00:00.000Z");
  });
});
