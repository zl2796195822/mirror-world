import { describe, expect, it } from "vitest";
import {
  RUNTIME_STATE_POLICY_VERSION,
  parseResidentRuntimeObservation,
} from "./runtime-state-contract.js";

const worldId = "00000000-0000-4000-8000-000000000001";
const residentId = "00000000-0000-4000-8000-000000000010";
const homeId = "00000000-0000-4000-8000-000000000020";

describe("resident runtime state contract", () => {
  it("accepts a deterministic bootstrap state and a no-obligation result", () => {
    const observation = parseResidentRuntimeObservation({
      runtimeState: {
        policyVersion: RUNTIME_STATE_POLICY_VERSION,
        worldId,
        residentId,
        currentLocation: {
          worldId,
          locationId: homeId,
          key: "home-unit-01",
          kind: "HOME",
        },
        activity: { kind: "IDLE" },
        stateVersion: 0,
        sourceWorldSeq: "0",
      },
      workObligation: {
        policyVersion: RUNTIME_STATE_POLICY_VERSION,
        worldId,
        residentId,
        status: "NO_CURRENT_OBLIGATION",
        workplaceId: null,
        startsAtWorldTime: null,
        endsAtWorldTime: null,
      },
    });

    expect(Object.isFrozen(observation)).toBe(true);
    expect(observation.runtimeState.activity.kind).toBe("IDLE");
    expect(observation.workObligation.status).toBe("NO_CURRENT_OBLIGATION");
  });
});
