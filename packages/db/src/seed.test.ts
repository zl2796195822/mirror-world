import { describe, expect, it } from "vitest";
import { M0_FIXTURE, M0_FIXTURE_IDS } from "./fixture.js";

describe("M0 fixture", () => {
  it("is deterministic and contains only foundation records", () => {
    expect(M0_FIXTURE_IDS).toEqual({
      user: "00000000-0000-4000-8000-000000000001",
      world: "00000000-0000-4000-8000-000000000002",
    });
    expect(M0_FIXTURE.world.seed).toBe("mirror-m0-foundation-v1");
    expect(M0_FIXTURE.world.status).toBe("PAUSED");
    expect(M0_FIXTURE.world.worldTime.toISOString()).toBe(
      "2026-09-06T22:00:00.000Z",
    );
    expect(M0_FIXTURE.world.clockAnchorAt).toEqual(M0_FIXTURE.world.worldTime);
  });
});
