import { describe, expect, it } from "vitest";
import { deriveWorkPreparationBoundary } from "./work-preparation.js";

describe("M3 work preparation boundary", () => {
  it.each([
    ["HOME", "OFFICE", 15, "2026-09-07T08:45:00.000Z"],
    ["HOME", "CAFE", 10, "2026-09-07T08:50:00.000Z"],
  ] as const)(
    "uses the formal %s to %s route duration",
    (currentLocationKind, workplaceKind, duration, expected) => {
      const result = deriveWorkPreparationBoundary({
        currentWorldTime: new Date("2026-09-07T08:00:00.000Z"),
        currentLocationKind,
        workplaceKind,
      });

      expect(result.travelDurationWorldMinutes).toBe(duration);
      expect(result.preparationWorldTime.toISOString()).toBe(expected);
      expect(result.shiftStartWorldTime.toISOString()).toBe(
        "2026-09-07T09:00:00.000Z",
      );
    },
  );

  it("skips weekend shifts and selects the next weekday", () => {
    const result = deriveWorkPreparationBoundary({
      currentWorldTime: new Date("2026-09-12T08:00:00.000Z"),
      currentLocationKind: "HOME",
      workplaceKind: "OFFICE",
    });

    expect(result.shiftStartWorldTime.toISOString()).toBe(
      "2026-09-14T09:00:00.000Z",
    );
    expect(result.preparationWorldTime.toISOString()).toBe(
      "2026-09-14T08:45:00.000Z",
    );
  });
});
