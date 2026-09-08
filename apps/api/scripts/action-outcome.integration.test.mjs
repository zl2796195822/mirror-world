import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createDb } from "@mirror/db";
import {
  executeKernelActionRequest,
  findKernelActionOutcome,
} from "@mirror/world-kernel";

function worldRecord(id, name) {
  const worldTime = new Date("2026-09-08T00:00:00.000Z");
  return {
    id,
    name,
    timezone: "Asia/Shanghai",
    status: "RUNNING",
    seed: `pre-al-01-${id}`,
    worldTime,
    clockAnchorAt: worldTime,
  };
}

function actionRequest({
  worldId,
  actorId,
  idempotencyKey,
  id = randomUUID(),
}) {
  return {
    id,
    worldId,
    actorId,
    actionType: "SLEEP",
    parameters: {},
    requestedBy: "RULE",
    idempotencyKey,
    expectedActorVersion: 1,
    requestedAtWorldTime: "2026-09-08T00:00:00.000Z",
    traceId: `trace-${id}`,
  };
}

function validationContext(worldId, actorId, status = "RUNNING") {
  const locationId = randomUUID();
  return {
    world: {
      id: worldId,
      status,
      worldTime: new Date("2026-09-08T00:00:00.000Z"),
    },
    actors: [
      {
        id: actorId,
        worldId,
        status: "ACTIVE",
        version: 1,
        locationId,
        allowedRequesters: ["RULE"],
        inventory: {},
        balanceCents: 0,
      },
    ],
    locations: [
      {
        id: locationId,
        worldId,
        reachableFrom: [],
        capabilities: ["SLEEP"],
      },
    ],
    items: [],
  };
}

function event(worldId, requestId, id, type = "RESIDENT_MOVED") {
  return {
    id,
    worldId,
    type,
    actorId: randomUUID(),
    payload: { schemaVersion: 1, requestId },
    occurredAt: new Date("2026-09-08T00:00:00.000Z"),
    correlationId: requestId,
  };
}

async function insertWorld(client, world) {
  await client`
    insert into worlds (id, name, timezone, status, seed, world_time, clock_anchor_at)
    values (${world.id}, ${world.name}, ${world.timezone}, ${world.status},
      ${world.seed}, ${world.worldTime.toISOString()}, ${world.clockAnchorAt.toISOString()})
  `;
}

async function deleteWorldGraph(client, worldIds) {
  for (const worldId of worldIds) {
    await client`
      delete from kernel_action_outcome_events
      where world_id = ${worldId}
    `;
    await client`
      delete from kernel_action_outcomes
      where world_id = ${worldId}
    `;
    await client`
      delete from action_requests
      where world_id = ${worldId}
    `;
    await client`
      delete from worlds
      where id = ${worldId}
        and not exists (
          select 1 from world_events where world_events.world_id = worlds.id
        )
    `;
  }
}

test("KernelActionOutcome is durable, idempotent, world-scoped, and supports 0/1/N events", async () => {
  const { db, client } = createDb();
  const committedWorldId = randomUUID();
  const rejectedWorldId = randomUUID();
  const conflictWorldId = randomUUID();
  const isolatedWorldId = randomUUID();
  const rollbackWorldId = randomUUID();
  const committedActorId = randomUUID();
  const rejectedActorId = randomUUID();
  const conflictActorId = randomUUID();
  const isolatedActorId = randomUUID();
  const rollbackActorId = randomUUID();
  const worlds = [
    worldRecord(committedWorldId, "PRE-AL-01 committed"),
    worldRecord(rejectedWorldId, "PRE-AL-01 rejected"),
    worldRecord(conflictWorldId, "PRE-AL-01 conflict"),
    worldRecord(isolatedWorldId, "PRE-AL-01 isolated"),
    worldRecord(rollbackWorldId, "PRE-AL-01 rollback"),
  ];

  try {
    for (const world of worlds) await insertWorld(client, world);

    const committedRequest = actionRequest({
      worldId: committedWorldId,
      actorId: committedActorId,
      idempotencyKey: "same-key",
    });
    let executions = 0;
    const committedResult = await executeKernelActionRequest(db, {
      request: committedRequest,
      validationContext: validationContext(committedWorldId, committedActorId),
      execute: () => {
        executions += 1;
        return {
          status: "COMMITTED",
          state: {},
          events: [
            event(committedWorldId, committedRequest.id, randomUUID()),
            event(
              committedWorldId,
              committedRequest.id,
              randomUUID(),
              "PURCHASE_COMPLETED",
            ),
          ],
        };
      },
    });
    assert.equal(committedResult.disposition, "EXECUTED");
    assert.equal(committedResult.outcome.status, "COMMITTED");
    assert.equal(committedResult.outcome.eventCount, 2);
    assert.deepEqual(
      committedResult.outcome.eventRefs.map(
        (reference) => reference.eventIndex,
      ),
      [0, 1],
    );
    assert.equal(executions, 1);

    const queriedCommitted = await findKernelActionOutcome(db, {
      requestId: committedRequest.id,
      worldId: committedWorldId,
    });
    assert.equal(queriedCommitted?.eventCount, 2);
    assert.deepEqual(
      queriedCommitted?.eventRefs.map((reference) => reference.seq),
      ["1", "2"],
    );
    assert.equal(
      await findKernelActionOutcome(db, {
        requestId: committedRequest.id,
        worldId: isolatedWorldId,
      }),
      null,
    );

    const duplicateResults = await Promise.all([
      executeKernelActionRequest(db, {
        request: committedRequest,
        validationContext: validationContext(
          committedWorldId,
          committedActorId,
        ),
        execute: () => {
          executions += 1;
          throw new Error("duplicate must not execute");
        },
      }),
      executeKernelActionRequest(db, {
        request: { ...committedRequest, id: randomUUID() },
        validationContext: validationContext(
          committedWorldId,
          committedActorId,
        ),
        execute: () => {
          executions += 1;
          throw new Error("duplicate must not execute");
        },
      }),
    ]);
    assert.deepEqual(
      duplicateResults.map((result) => result.disposition).sort(),
      ["IDEMPOTENCY_CONFLICT", "REUSED"],
    );
    assert.equal(executions, 1);

    const rejectedRequest = actionRequest({
      worldId: rejectedWorldId,
      actorId: rejectedActorId,
      idempotencyKey: "rejected",
    });
    const rejectedResult = await executeKernelActionRequest(db, {
      request: rejectedRequest,
      validationContext: validationContext(
        rejectedWorldId,
        rejectedActorId,
        "PAUSED",
      ),
      execute: () => {
        throw new Error("rejected request must not execute");
      },
    });
    assert.equal(rejectedResult.disposition, "EXECUTED");
    assert.deepEqual(
      {
        status: rejectedResult.outcome.status,
        reasonCode: rejectedResult.outcome.reasonCode,
        eventCount: rejectedResult.outcome.eventCount,
      },
      {
        status: "REJECTED",
        reasonCode: "WORLD_NOT_RUNNING",
        eventCount: 0,
      },
    );

    const conflictRequest = actionRequest({
      worldId: conflictWorldId,
      actorId: conflictActorId,
      idempotencyKey: "stale-version",
    });
    const conflictResult = await executeKernelActionRequest(db, {
      request: { ...conflictRequest, expectedActorVersion: 0 },
      validationContext: validationContext(conflictWorldId, conflictActorId),
      execute: () => {
        throw new Error("conflict request must not execute");
      },
    });
    assert.deepEqual(
      {
        status: conflictResult.outcome.status,
        reasonCode: conflictResult.outcome.reasonCode,
        eventCount: conflictResult.outcome.eventCount,
      },
      {
        status: "CONFLICT",
        reasonCode: "KERNEL_CONFLICT",
        eventCount: 0,
      },
    );

    const isolatedRequest = actionRequest({
      worldId: isolatedWorldId,
      actorId: isolatedActorId,
      idempotencyKey: "same-key",
    });
    const isolatedResult = await executeKernelActionRequest(db, {
      request: isolatedRequest,
      validationContext: validationContext(isolatedWorldId, isolatedActorId),
      execute: () => ({
        status: "COMMITTED",
        state: {},
        events: [event(isolatedWorldId, isolatedRequest.id, randomUUID())],
      }),
    });
    assert.equal(isolatedResult.outcome.status, "COMMITTED");
    assert.equal(isolatedResult.outcome.eventRefs[0].seq, "1");

    const rollbackRequest = actionRequest({
      worldId: rollbackWorldId,
      actorId: rollbackActorId,
      idempotencyKey: "transport-retry",
    });
    await assert.rejects(
      executeKernelActionRequest(db, {
        request: rollbackRequest,
        validationContext: validationContext(rollbackWorldId, rollbackActorId),
        execute: () => {
          throw new Error("transport failure is not a kernel outcome");
        },
      }),
      /transport failure is not a kernel outcome/,
    );
    const [rollbackRequestCount] = await client`
      select count(*)::int as count
      from action_requests
      where id = ${rollbackRequest.id}
    `;
    const [rollbackOutcomeCount] = await client`
      select count(*)::int as count
      from kernel_action_outcomes
      where action_request_id = ${rollbackRequest.id}
    `;
    const [rollbackWorld] = await client`
      select world_seq from worlds where id = ${rollbackWorldId}
    `;
    assert.equal(rollbackRequestCount.count, 0);
    assert.equal(rollbackOutcomeCount.count, 0);
    assert.equal(BigInt(rollbackWorld.world_seq), 0n);

    const [committedWorld] = await client`
      select world_seq from worlds where id = ${committedWorldId}
    `;
    const [rejectedWorld] = await client`
      select world_seq from worlds where id = ${rejectedWorldId}
    `;
    const [conflictWorld] = await client`
      select world_seq from worlds where id = ${conflictWorldId}
    `;
    assert.equal(BigInt(committedWorld.world_seq), 2n);
    assert.equal(BigInt(rejectedWorld.world_seq), 0n);
    assert.equal(BigInt(conflictWorld.world_seq), 0n);
  } finally {
    await deleteWorldGraph(
      client,
      worlds.map((world) => world.id),
    );
    await client.end();
  }
});
