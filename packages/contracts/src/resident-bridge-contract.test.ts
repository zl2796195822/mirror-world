import { describe, expect, it } from "vitest";
import {
  parseActorRef,
  parseResidentResourceSnapshot,
} from "./resident-bridge-contract.js";

const worldId = "00000000-0000-4000-8000-000000000001";
const residentId = "00000000-0000-4000-8000-000000000010";
const actorId = "00000000-0000-4000-8000-000000000011";

describe("resident bridge contracts", () => {
  it("keeps ActorRef distinct from auth and digital identity", () => {
    const actorRef = parseActorRef({
      worldId,
      residentId,
      actorId,
      kind: "NATIVE_RESIDENT",
    });

    expect(actorRef).toEqual({
      worldId,
      residentId,
      actorId,
      kind: "NATIVE_RESIDENT",
    });
    expect(Object.isFrozen(actorRef)).toBe(true);
    expect(actorRef).not.toHaveProperty("userId");
    expect(actorRef).not.toHaveProperty("digitalIdentityId");
  });

  it("validates and freezes the read-only resource snapshot", () => {
    const snapshot = parseResidentResourceSnapshot({
      worldId,
      residentId,
      cashCents: 200_000,
      foodUnits: 2,
      version: 0,
    });

    expect(snapshot).toEqual({
      worldId,
      residentId,
      cashCents: 200_000,
      foodUnits: 2,
      version: 0,
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() =>
      parseResidentResourceSnapshot({
        worldId,
        residentId,
        cashCents: -1,
        foodUnits: 0,
        version: 0,
      }),
    ).toThrow();
  });

  it("carries the canonical food item location when available", () => {
    const snapshot = parseResidentResourceSnapshot({
      worldId,
      residentId,
      cashCents: 200_000,
      foodUnits: 2,
      version: 3,
      itemId: "00000000-0000-4000-8000-000000000012",
      locationId: "00000000-0000-4000-8000-000000000013",
    });

    expect(snapshot.itemId).toBe("00000000-0000-4000-8000-000000000012");
    expect(snapshot.locationId).toBe("00000000-0000-4000-8000-000000000013");
  });
});
