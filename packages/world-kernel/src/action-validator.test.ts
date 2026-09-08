import { describe, expect, it } from "vitest";
import {
  validateActionRequest,
  type ActionValidationContext,
  type KernelActorSnapshot,
} from "./action-validator.js";

const worldId = "00000000-0000-4000-8000-000000000002";
const actorId = "00000000-0000-4000-8000-000000000003";
const participantId = "00000000-0000-4000-8000-000000000004";
const homeId = "00000000-0000-4000-8000-000000000010";
const shopId = "00000000-0000-4000-8000-000000000011";
const workplaceId = "00000000-0000-4000-8000-000000000012";
const foodId = "00000000-0000-4000-8000-000000000013";
const productId = "00000000-0000-4000-8000-000000000014";

const baseRequest = {
  id: "00000000-0000-4000-8000-000000000020",
  worldId,
  actorId,
  requestedBy: "RULE" as const,
  idempotencyKey: "validator-test-1",
  expectedActorVersion: 7,
  requestedAtWorldTime: "2026-09-08T00:00:00.000Z",
  traceId: "trace-validator-test-1",
};

const actor: KernelActorSnapshot = {
  id: actorId,
  worldId,
  status: "ACTIVE",
  version: 7,
  locationId: homeId,
  allowedRequesters: ["RULE", "HUMAN"],
  inventory: { [foodId]: 2 },
  balanceCents: 1_000,
  employmentWorkplaceId: workplaceId,
};

const context: ActionValidationContext = {
  world: {
    id: worldId,
    status: "RUNNING",
    worldTime: new Date("2026-09-08T00:01:00.000Z"),
  },
  actors: [
    actor,
    {
      ...actor,
      id: participantId,
      locationId: homeId,
      inventory: {},
      employmentWorkplaceId: undefined,
    },
  ],
  locations: [
    {
      id: homeId,
      worldId,
      reachableFrom: [shopId, workplaceId],
      capabilities: ["SLEEP", "EAT"],
    },
    {
      id: shopId,
      worldId,
      reachableFrom: [homeId],
      capabilities: ["SHOP", "EAT"],
    },
    {
      id: workplaceId,
      worldId,
      reachableFrom: [homeId],
      capabilities: ["WORK"],
    },
  ],
  items: [
    {
      id: foodId,
      worldId,
      locationId: homeId,
      isFood: true,
      priceCents: 100,
      stockQuantity: 10,
    },
    {
      id: productId,
      worldId,
      locationId: shopId,
      isFood: false,
      priceCents: 250,
      stockQuantity: 4,
    },
  ],
};

function request(action: object) {
  return { ...baseRequest, ...action };
}

function buyContext(): ActionValidationContext {
  return {
    ...context,
    actors: context.actors.map((candidate) =>
      candidate.id === actorId
        ? { ...candidate, locationId: shopId }
        : candidate,
    ),
  };
}

function workContext(): ActionValidationContext {
  return {
    ...context,
    actors: context.actors.map((candidate) =>
      candidate.id === actorId
        ? { ...candidate, locationId: workplaceId }
        : candidate,
    ),
  };
}

describe("Kernel action validator", () => {
  it("accepts each M2-T02 action when the domain snapshot permits it", () => {
    const cases = [
      [
        request({ actionType: "MOVE", parameters: { destinationId: shopId } }),
        context,
      ],
      [
        request({
          actionType: "EAT",
          parameters: { itemId: foodId, quantity: 1 },
        }),
        context,
      ],
      [request({ actionType: "SLEEP", parameters: {} }), context],
      [
        request({ actionType: "WORK", parameters: { workplaceId } }),
        workContext(),
      ],
      [
        request({
          actionType: "TALK",
          parameters: { participantId, message: "hello" },
        }),
        context,
      ],
      [
        request({
          actionType: "BUY",
          parameters: { itemId: productId, quantity: 2 },
        }),
        buyContext(),
      ],
    ] as const;

    for (const [input, currentContext] of cases) {
      expect(validateActionRequest(input, currentContext).accepted).toBe(true);
    }
  });

  it("rejects malformed requests before domain evaluation", () => {
    const result = validateActionRequest(
      { ...baseRequest, actionType: "MOVE", parameters: {} },
      context,
    );

    expect(result).toEqual({
      accepted: false,
      reasonCode: "KERNEL_INVALID_ACTION",
    });
  });

  it.each([
    ["missing actor", { actors: [] }, "KERNEL_ACTOR_NOT_FOUND"],
    [
      "unauthorized requester",
      {
        actors: context.actors.map((candidate) =>
          candidate.id === actorId
            ? { ...candidate, allowedRequesters: ["HUMAN"] as const }
            : candidate,
        ),
      },
      "KERNEL_PERMISSION_DENIED",
    ],
    [
      "paused world",
      { world: { ...context.world, status: "PAUSED" as const } },
      "WORLD_NOT_RUNNING",
    ],
    [
      "future world time",
      {
        world: {
          ...context.world,
          worldTime: new Date("2026-09-07T00:00:00.000Z"),
        },
      },
      "KERNEL_INVALID_ACTION",
    ],
    ["stale actor version", {}, "KERNEL_CONFLICT"],
  ] as const)("rejects %s", (_name, changes, reasonCode) => {
    const input =
      _name === "stale actor version"
        ? request({
            expectedActorVersion: 6,
            actionType: "SLEEP",
            parameters: {},
          })
        : request({ actionType: "SLEEP", parameters: {} });
    const result = validateActionRequest(input, { ...context, ...changes });

    expect(result).toEqual({ accepted: false, reasonCode });
  });

  it("rejects invalid location, resource, and funds conditions", () => {
    expect(
      validateActionRequest(
        request({
          actionType: "MOVE",
          parameters: { destinationId: "00000000-0000-4000-8000-000000000099" },
        }),
        context,
      ),
    ).toEqual({ accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" });

    expect(
      validateActionRequest(
        request({
          actionType: "EAT",
          parameters: { itemId: foodId, quantity: 3 },
        }),
        context,
      ),
    ).toEqual({ accepted: false, reasonCode: "KERNEL_INSUFFICIENT_RESOURCE" });

    const poorContext = {
      ...buyContext(),
      actors: buyContext().actors.map((candidate) =>
        candidate.id === actorId
          ? { ...candidate, balanceCents: 1 }
          : candidate,
      ),
    };
    expect(
      validateActionRequest(
        request({
          actionType: "BUY",
          parameters: { itemId: productId, quantity: 1 },
        }),
        poorContext,
      ),
    ).toEqual({ accepted: false, reasonCode: "KERNEL_INSUFFICIENT_FUNDS" });
  });

  it("does not mutate the supplied snapshot or use a wall-clock side effect", () => {
    const before = structuredClone(context);
    const result = validateActionRequest(
      request({ actionType: "SLEEP", parameters: {} }),
      context,
    );

    expect(result.accepted).toBe(true);
    expect(context).toEqual(before);
    if (result.accepted) {
      expect(result.worldTime.toISOString()).toBe("2026-09-08T00:01:00.000Z");
    }
  });
});
