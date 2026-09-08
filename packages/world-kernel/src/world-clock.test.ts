import { describe, expect, it } from "vitest";
import { advanceWorldClock, applyWorldClockControl } from "./world-clock.js";

const base = {
  worldTime: new Date("2026-09-08T00:00:00.000Z"),
  clockAnchorAt: new Date("2026-09-08T00:00:00.000Z"),
  status: "RUNNING" as const,
  timeScale: 10 as const,
};

describe("world clock", () => {
  it("advances world time by the explicit wall-clock delta and scale", () => {
    const next = advanceWorldClock(base, new Date("2026-09-08T00:00:02.000Z"));

    expect(next.worldTime.toISOString()).toBe("2026-09-08T00:00:20.000Z");
    expect(next.clockAnchorAt.toISOString()).toBe("2026-09-08T00:00:02.000Z");
  });

  it("does not tick while paused and consumes the paused wall time", () => {
    const next = advanceWorldClock(
      { ...base, status: "PAUSED" },
      new Date("2026-09-08T01:00:00.000Z"),
    );

    expect(next.worldTime).toEqual(base.worldTime);
    expect(next.clockAnchorAt.toISOString()).toBe("2026-09-08T01:00:00.000Z");
  });

  it("never moves world time backward when wall time moves backward", () => {
    const next = advanceWorldClock(
      { ...base, worldTime: new Date("2026-09-08T00:00:20.000Z") },
      new Date("2026-09-07T23:59:00.000Z"),
    );

    expect(next.worldTime.toISOString()).toBe("2026-09-08T00:00:20.000Z");
    expect(next.clockAnchorAt.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("forces production to 1x", () => {
    const next = advanceWorldClock(
      base,
      new Date("2026-09-08T00:00:02.000Z"),
      "production",
    );

    expect(next.timeScale).toBe(1);
    expect(next.worldTime.toISOString()).toBe("2026-09-08T00:00:02.000Z");
  });

  it("applies development pause and acceleration at one explicit boundary", () => {
    const paused = applyWorldClockControl(
      base,
      { status: "PAUSED" },
      new Date("2026-09-08T00:00:02.000Z"),
    );
    const resumed = applyWorldClockControl(
      paused,
      { status: "RUNNING", timeScale: 100 },
      new Date("2026-09-08T00:00:12.000Z"),
    );

    expect(paused.worldTime.toISOString()).toBe("2026-09-08T00:00:20.000Z");
    expect(resumed.worldTime.toISOString()).toBe("2026-09-08T00:00:20.000Z");
    expect(resumed.timeScale).toBe(100);
  });

  it("rejects production control", () => {
    expect(() =>
      applyWorldClockControl(
        base,
        { status: "PAUSED" },
        new Date("2026-09-08T00:00:02.000Z"),
        "production",
      ),
    ).toThrow("world clock control is disabled in production");
  });
});
