import { describe, expect, it } from "vitest";
import {
  actionRequestSchema,
  safeParseActionRequest,
} from "./action-contract.js";

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  worldId: "00000000-0000-4000-8000-000000000002",
  actorId: "00000000-0000-4000-8000-000000000003",
  requestedBy: "RULE" as const,
  idempotencyKey: "fixture-action-1",
  requestedAtWorldTime: "2026-09-08T00:00:00.000Z",
  traceId: "trace-fixture-1",
};

describe("ActionRequest contract", () => {
  it.each([
    ["MOVE", { destinationId: base.worldId }],
    ["EAT", { itemId: base.worldId, quantity: 1 }],
    ["SLEEP", {}],
    ["WORK", { workplaceId: base.worldId }],
    ["TALK", { participantId: base.actorId, message: "Hello" }],
    ["BUY", { itemId: base.worldId, quantity: 2 }],
  ] as const)("accepts a valid %s request", (actionType, parameters) => {
    const result = safeParseActionRequest({
      ...base,
      actionType,
      parameters,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unknown action type", () => {
    const result = safeParseActionRequest({
      ...base,
      actionType: "FLY",
      parameters: {},
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["MOVE", { destinationId: "not-a-uuid" }],
    ["EAT", { itemId: base.worldId, quantity: 0 }],
    ["SLEEP", { unexpected: true }],
    ["WORK", {}],
    ["TALK", { participantId: base.actorId, message: "   " }],
    ["BUY", { itemId: base.worldId, quantity: 1.5 }],
  ] as const)("rejects malformed %s parameters", (actionType, parameters) => {
    const result = safeParseActionRequest({
      ...base,
      actionType,
      parameters,
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed envelope fields and unknown fields", () => {
    const result = safeParseActionRequest({
      ...base,
      actionType: "SLEEP",
      parameters: {},
      worldId: "not-a-uuid",
      extra: true,
    });

    expect(result.success).toBe(false);
  });

  it("keeps parsing pure and does not mutate the input", () => {
    const request = {
      ...base,
      actionType: "SLEEP" as const,
      parameters: {},
    };
    const before = structuredClone(request);

    expect(actionRequestSchema.parse(request)).toEqual(request);
    expect(request).toEqual(before);
  });
});
