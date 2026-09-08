import assert from "node:assert/strict";
import { test } from "node:test";
import { createDb, M0_FIXTURE_IDS } from "@mirror/db";
import {
  persistValidatedActionRequest,
  validateActionRequest,
} from "@mirror/world-kernel";

const worldId = M0_FIXTURE_IDS.world;
const actorId = "00000000-0000-4000-8000-000000000003";
const homeId = "00000000-0000-4000-8000-000000000010";
const shopId = "00000000-0000-4000-8000-000000000011";
const productId = "00000000-0000-4000-8000-000000000014";
const requestId = "00000000-0000-4000-8000-000000000020";
const conflictRequestId = "00000000-0000-4000-8000-000000000021";

const actionContext = {
  world: {
    id: worldId,
    status: "RUNNING",
    worldTime: new Date("2026-09-08T00:01:00.000Z"),
  },
  actors: [
    {
      id: actorId,
      worldId,
      status: "ACTIVE",
      version: 1,
      locationId: shopId,
      allowedRequesters: ["RULE"],
      inventory: {},
      balanceCents: 1_000,
    },
  ],
  locations: [
    {
      id: homeId,
      worldId,
      reachableFrom: [shopId],
      capabilities: ["SLEEP"],
    },
    {
      id: shopId,
      worldId,
      reachableFrom: [homeId],
      capabilities: ["SHOP"],
    },
  ],
  items: [
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

const request = {
  id: requestId,
  worldId,
  actorId,
  actionType: "BUY",
  parameters: { itemId: productId, quantity: 2 },
  requestedBy: "RULE",
  idempotencyKey: "integration-action-1",
  expectedActorVersion: 1,
  requestedAtWorldTime: "2026-09-08T00:00:00.000Z",
  traceId: "trace-integration-action-1",
};

test("action request persistence is atomic and idempotent", async () => {
  const { db, client } = createDb();

  try {
    await client`
      delete from action_requests
      where id in (${requestId}, ${conflictRequestId})
    `;

    const [before] = await client`
      select status, time_scale, world_time, clock_anchor_at
      from worlds
      where id = ${worldId}
    `;

    const validation = validateActionRequest(request, actionContext);
    assert.equal(validation.accepted, true);
    if (!validation.accepted) return;

    const [first, second] = await Promise.all([
      persistValidatedActionRequest(db, validation),
      persistValidatedActionRequest(db, validation),
    ]);
    assert.deepEqual([first.status, second.status].sort(), [
      "accepted",
      "duplicate",
    ]);
    assert.equal(first.requestId, second.requestId);

    const conflictingValidation = validateActionRequest(
      {
        ...request,
        id: conflictRequestId,
        traceId: "trace-integration-action-conflict",
      },
      actionContext,
    );
    assert.equal(conflictingValidation.accepted, true);
    if (!conflictingValidation.accepted) return;

    const conflict = await persistValidatedActionRequest(
      db,
      conflictingValidation,
    );
    assert.equal(conflict.status, "conflict");
    assert.equal(conflict.reasonCode, "KERNEL_CONFLICT");

    const rows = await client`
      select id
      from action_requests
      where idempotency_key = ${request.idempotencyKey}
    `;
    assert.equal(rows.length, 1);

    const [after] = await client`
      select status, time_scale, world_time, clock_anchor_at
      from worlds
      where id = ${worldId}
    `;
    assert.deepEqual(after, before);
  } finally {
    await client`
      delete from action_requests
      where id in (${requestId}, ${conflictRequestId})
    `;
    await client.end();
  }
});
