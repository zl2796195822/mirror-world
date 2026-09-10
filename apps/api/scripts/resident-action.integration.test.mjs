import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  bootstrapResidentRuntimeStates,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
} from "@mirror/db";
import {
  completeResidentAction,
  createPostgresObservationQuery,
  executeResidentActionRequest,
} from "@mirror/world-kernel";

const START_TIME = new Date("2026-09-09T00:00:00.000Z");

function worldRecord(id, name) {
  return {
    id,
    name,
    timezone: "Asia/Shanghai",
    status: "RUNNING",
    seed: `pre-al-05-${id}`,
    worldTime: START_TIME,
    clockAnchorAt: START_TIME,
  };
}

function locationsFor(worldId, allowSleepEverywhere = false) {
  const fixtures = getFirstStreetLocationFixtures(worldId);
  return fixtures.map((location) => ({
    id: location.id,
    worldId,
    reachableFrom: fixtures
      .filter(({ id }) => id !== location.id)
      .map(({ id }) => id),
    capabilities:
      location.kind === "HOME"
        ? ["SLEEP", "EAT"]
        : location.kind === "CAFE"
          ? allowSleepEverywhere
            ? ["SLEEP", "EAT"]
            : ["EAT"]
          : location.kind === "STORE"
            ? ["SHOP"]
            : location.kind === "OFFICE"
              ? ["WORK"]
              : [],
  }));
}

function validationContext({
  worldId,
  actorId,
  resident,
  allowSleepEverywhere = false,
}) {
  return {
    world: {
      id: worldId,
      status: "RUNNING",
      worldTime: START_TIME,
    },
    actors: [
      {
        id: actorId,
        worldId,
        status: "ACTIVE",
        version: 0,
        locationId: resident.homeLocationId,
        allowedRequesters: ["RULE"],
        inventory: {},
        balanceCents: 0,
      },
    ],
    locations: locationsFor(worldId, allowSleepEverywhere),
    items: [],
  };
}

function actionRequest({
  worldId,
  actorId,
  actionType,
  parameters,
  idempotencyKey,
  expectedActorVersion = 0,
}) {
  const id = randomUUID();
  return {
    id,
    worldId,
    actorId,
    actionType,
    parameters,
    requestedBy: "RULE",
    idempotencyKey,
    expectedActorVersion,
    requestedAtWorldTime: START_TIME.toISOString(),
    traceId: `trace-${id}`,
  };
}

async function insertWorld(client, world) {
  await client`
    insert into worlds
      (id, name, timezone, status, seed, world_time, clock_anchor_at)
    values
      (${world.id}, ${world.name}, ${world.timezone}, ${world.status},
       ${world.seed}, ${world.worldTime.toISOString()},
       ${world.clockAnchorAt.toISOString()})
  `;
}

async function setWorldTime(client, worldId, worldTime, status = "RUNNING") {
  await client`
    update worlds
    set world_time = ${worldTime.toISOString()}, status = ${status}
    where id = ${worldId}
  `;
}

async function deleteWorldGraph(client, worldIds) {
  for (const worldId of worldIds) {
    await client`delete from kernel_action_outcome_events where world_id = ${worldId}`;
    await client`delete from kernel_action_outcomes where world_id = ${worldId}`;
    await client`delete from action_requests where world_id = ${worldId}`;
    await client`delete from resident_resource_states where world_id = ${worldId}`;
    await client`delete from resident_runtime_states where world_id = ${worldId}`;
    await client`
      delete from worlds
      where id = ${worldId}
        and not exists (
          select 1 from world_events where world_events.world_id = worlds.id
        )
    `;
  }
}

function residentContext(worldId, resident, allowSleepEverywhere = false) {
  return validationContext({
    worldId,
    actorId: resident.actorRef.actorId,
    resident,
    allowSleepEverywhere,
  });
}

test("Kernel owns deterministic MOVE/SLEEP lifecycle and completion", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "PRE-AL-05 lifecycle");
  const otherWorld = worldRecord(randomUUID(), "PRE-AL-05 isolation");
  const fixtureWorldIds = [world.id, otherWorld.id];

  try {
    await insertWorld(client, world);
    await insertWorld(client, otherWorld);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    await bootstrapResidentRuntimeStates(db, { worldId: otherWorld.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const otherResidents = generateResidentSeed({
      worldId: otherWorld.id,
      seed: otherWorld.seed,
    }).residents;
    const cafe = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "CAFE",
    );
    const office = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "OFFICE",
    );
    const otherCafe = getFirstStreetLocationFixtures(otherWorld.id).find(
      ({ kind }) => kind === "CAFE",
    );
    assert.ok(cafe && office && otherCafe);

    const move = actionRequest({
      worldId: world.id,
      actorId: residents[0].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: cafe.id },
      idempotencyKey: "move-lifecycle",
    });
    const moveStart = await executeResidentActionRequest(db, {
      request: move,
      validationContext: await residentContext(world.id, residents[0]),
    });
    assert.equal(moveStart.outcome.status, "COMMITTED");
    assert.deepEqual(
      moveStart.outcome.eventRefs.map(({ type }) => type),
      ["RESIDENT_MOVE_STARTED"],
    );
    assert.equal(moveStart.outcome.worldSeqStart, "1");
    const duplicateStart = await executeResidentActionRequest(db, {
      request: move,
      validationContext: await residentContext(world.id, residents[0]),
    });
    assert.equal(duplicateStart.disposition, "REUSED");
    assert.equal(duplicateStart.outcome.eventCount, 1);

    const query = createPostgresObservationQuery(db);
    const travelingObservation = await query.getResidentObservation({
      worldId: world.id,
      residentId: residents[0].residentId,
    });
    assert.equal(
      travelingObservation.location.location.locationId,
      residents[0].homeLocationId,
    );
    assert.equal(travelingObservation.activity.activity.kind, "TRAVELING");
    assert.equal(
      travelingObservation.activity.activity.targetLocationId,
      cafe.id,
    );

    await setWorldTime(client, world.id, new Date("2026-09-09T00:09:59.000Z"));
    const earlyCompletion = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: move.id,
    });
    assert.equal(earlyCompletion.disposition, "NOT_DUE");
    assert.equal(earlyCompletion.outcome.eventCount, 1);
    await setWorldTime(client, world.id, new Date("2026-09-09T00:10:00.000Z"));
    const completedMove = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: move.id,
    });
    assert.equal(completedMove.disposition, "EXECUTED");
    assert.deepEqual(
      completedMove.outcome.eventRefs.map(({ type }) => type),
      ["RESIDENT_MOVE_STARTED", "RESIDENT_MOVE_COMPLETED"],
    );
    assert.deepEqual(
      completedMove.outcome.eventRefs.map(({ seq }) => seq),
      ["1", "2"],
    );
    const duplicateCompletion = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: move.id,
    });
    assert.equal(duplicateCompletion.disposition, "REUSED");
    const movedObservation = await query.getResidentObservation({
      worldId: world.id,
      residentId: residents[0].residentId,
    });
    assert.equal(movedObservation.location.location.locationId, cafe.id);
    assert.equal(movedObservation.activity.activity.kind, "IDLE");

    const invalidDestination = actionRequest({
      worldId: world.id,
      actorId: residents[1].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: randomUUID() },
      idempotencyKey: "move-invalid-destination",
    });
    const invalidResult = await executeResidentActionRequest(db, {
      request: invalidDestination,
      validationContext: await residentContext(world.id, residents[1]),
    });
    assert.equal(invalidResult.outcome.status, "REJECTED");
    assert.equal(invalidResult.outcome.reasonCode, "KERNEL_INVALID_LOCATION");
    assert.equal(invalidResult.outcome.eventCount, 0);

    const crossWorldDestination = actionRequest({
      worldId: world.id,
      actorId: residents[2].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: otherCafe.id },
      idempotencyKey: "move-cross-world",
    });
    const crossWorldResult = await executeResidentActionRequest(db, {
      request: crossWorldDestination,
      validationContext: await residentContext(world.id, residents[2]),
    });
    assert.equal(
      crossWorldResult.outcome.reasonCode,
      "KERNEL_INVALID_LOCATION",
    );

    const sameLocation = actionRequest({
      worldId: world.id,
      actorId: residents[3].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: residents[3].homeLocationId },
      idempotencyKey: "move-same-location",
    });
    const sameLocationResult = await executeResidentActionRequest(db, {
      request: sameLocation,
      validationContext: await residentContext(world.id, residents[3]),
    });
    assert.equal(
      sameLocationResult.outcome.reasonCode,
      "KERNEL_INVALID_LOCATION",
    );

    const busyMove = actionRequest({
      worldId: world.id,
      actorId: residents[4].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: office.id },
      idempotencyKey: "move-busy-start",
    });
    await executeResidentActionRequest(db, {
      request: busyMove,
      validationContext: await residentContext(world.id, residents[4]),
    });
    const secondBusyMove = actionRequest({
      worldId: world.id,
      actorId: residents[4].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: cafe.id },
      idempotencyKey: "move-busy-second",
      expectedActorVersion: 1,
    });
    const busyResult = await executeResidentActionRequest(db, {
      request: secondBusyMove,
      validationContext: await residentContext(world.id, residents[4]),
    });
    assert.equal(busyResult.outcome.status, "REJECTED");
    assert.equal(busyResult.outcome.reasonCode, "KERNEL_INVALID_ACTION");

    const sleep = actionRequest({
      worldId: world.id,
      actorId: residents[5].actorRef.actorId,
      actionType: "SLEEP",
      parameters: {},
      idempotencyKey: "sleep-lifecycle",
    });
    const sleepStart = await executeResidentActionRequest(db, {
      request: sleep,
      validationContext: await residentContext(world.id, residents[5]),
    });
    assert.equal(sleepStart.outcome.status, "COMMITTED");
    const sleepingObservation = await query.getResidentObservation({
      worldId: world.id,
      residentId: residents[5].residentId,
    });
    assert.equal(sleepingObservation.activity.activity.kind, "SLEEPING");
    const moveWhileSleeping = actionRequest({
      worldId: world.id,
      actorId: residents[5].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: cafe.id },
      idempotencyKey: "move-while-sleeping",
      expectedActorVersion: 1,
    });
    const sleepingMoveResult = await executeResidentActionRequest(db, {
      request: moveWhileSleeping,
      validationContext: await residentContext(world.id, residents[5]),
    });
    assert.equal(
      sleepingMoveResult.outcome.reasonCode,
      "KERNEL_INVALID_ACTION",
    );
    const sleepAgain = actionRequest({
      worldId: world.id,
      actorId: residents[5].actorRef.actorId,
      actionType: "SLEEP",
      parameters: {},
      idempotencyKey: "sleep-while-sleeping",
      expectedActorVersion: 1,
    });
    const sleepAgainResult = await executeResidentActionRequest(db, {
      request: sleepAgain,
      validationContext: await residentContext(world.id, residents[5]),
    });
    assert.equal(sleepAgainResult.outcome.reasonCode, "KERNEL_INVALID_ACTION");
    const earlySleepCompletion = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: sleep.id,
    });
    assert.equal(earlySleepCompletion.disposition, "NOT_DUE");
    await setWorldTime(client, world.id, new Date("2026-09-09T08:10:00.000Z"));
    const completedSleep = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: sleep.id,
    });
    assert.equal(completedSleep.disposition, "EXECUTED");
    const sleepEvent = await client`
      select payload from world_events
      where id = ${completedSleep.outcome.eventRefs[1].eventId}
    `;
    assert.equal(
      sleepEvent[0].payload.restAnchorTransition.toActivity,
      "AWAKE",
    );
    assert.equal(
      sleepEvent[0].payload.restAnchorTransition.worldTime,
      "2026-09-09T08:10:00.000Z",
    );

    const pausedSleep = actionRequest({
      worldId: world.id,
      actorId: residents[6].actorRef.actorId,
      actionType: "SLEEP",
      parameters: {},
      idempotencyKey: "sleep-paused",
    });
    await executeResidentActionRequest(db, {
      request: pausedSleep,
      validationContext: await residentContext(world.id, residents[6]),
    });
    await setWorldTime(
      client,
      world.id,
      new Date("2026-09-09T16:10:00.000Z"),
      "PAUSED",
    );
    const pausedCompletion = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: pausedSleep.id,
    });
    assert.equal(pausedCompletion.disposition, "REJECTED");
    assert.equal(pausedCompletion.reasonCode, "WORLD_NOT_RUNNING");
    await setWorldTime(client, world.id, new Date("2026-09-09T16:10:00.000Z"));
    const resumedCompletion = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: pausedSleep.id,
    });
    assert.equal(resumedCompletion.disposition, "EXECUTED");

    const nonHomeMove = actionRequest({
      worldId: world.id,
      actorId: residents[9].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: cafe.id },
      idempotencyKey: "move-to-non-home-for-sleep-policy",
    });
    await executeResidentActionRequest(db, {
      request: nonHomeMove,
      validationContext: await residentContext(world.id, residents[9]),
    });
    await setWorldTime(client, world.id, new Date("2026-09-09T16:20:00.000Z"));
    assert.equal(
      (
        await completeResidentAction(db, {
          worldId: world.id,
          actionRequestId: nonHomeMove.id,
        })
      ).disposition,
      "EXECUTED",
    );
    const nonHomeSleep = actionRequest({
      worldId: world.id,
      actorId: residents[9].actorRef.actorId,
      actionType: "SLEEP",
      parameters: {},
      idempotencyKey: "sleep-non-home",
      expectedActorVersion: 2,
    });
    const nonHomeSleepResult = await executeResidentActionRequest(db, {
      request: nonHomeSleep,
      validationContext: await residentContext(world.id, residents[9], true),
    });
    assert.equal(
      nonHomeSleepResult.outcome.reasonCode,
      "KERNEL_INVALID_LOCATION",
    );

    const maintenanceSleep = actionRequest({
      worldId: world.id,
      actorId: residents[10].actorRef.actorId,
      actionType: "SLEEP",
      parameters: {},
      idempotencyKey: "sleep-maintenance",
    });
    await executeResidentActionRequest(db, {
      request: maintenanceSleep,
      validationContext: await residentContext(world.id, residents[10]),
    });
    await setWorldTime(
      client,
      world.id,
      new Date("2026-09-10T00:20:00.000Z"),
      "MAINTENANCE",
    );
    const maintenanceCompletion = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: maintenanceSleep.id,
    });
    assert.equal(maintenanceCompletion.disposition, "REJECTED");
    assert.equal(maintenanceCompletion.reasonCode, "WORLD_NOT_RUNNING");
    await setWorldTime(
      client,
      world.id,
      new Date("2026-09-10T00:20:00.000Z"),
      "RUNNING",
    );

    const conflictStart = actionRequest({
      worldId: world.id,
      actorId: residents[7].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: cafe.id },
      idempotencyKey: "move-version-first",
    });
    await executeResidentActionRequest(db, {
      request: conflictStart,
      validationContext: await residentContext(world.id, residents[7]),
    });
    const staleMove = actionRequest({
      worldId: world.id,
      actorId: residents[7].actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: office.id },
      idempotencyKey: "move-version-stale",
      expectedActorVersion: 0,
    });
    const conflictResult = await executeResidentActionRequest(db, {
      request: staleMove,
      validationContext: await residentContext(world.id, residents[7]),
    });
    assert.equal(conflictResult.outcome.status, "CONFLICT");
    assert.equal(conflictResult.outcome.reasonCode, "KERNEL_CONFLICT");

    const otherResident = otherResidents[0];
    const isolatedMove = actionRequest({
      worldId: otherWorld.id,
      actorId: otherResident.actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: otherCafe.id },
      idempotencyKey: "move-lifecycle",
    });
    const isolatedResult = await executeResidentActionRequest(db, {
      request: isolatedMove,
      validationContext: await residentContext(otherWorld.id, otherResident),
    });
    assert.equal(isolatedResult.outcome.status, "COMMITTED");
    assert.equal(isolatedResult.outcome.eventRefs[0].seq, "1");
  } finally {
    await deleteWorldGraph(client, fixtureWorldIds);
    await client.end();
  }
});

test("concurrent MOVE starts are serialized by the world and runtime version", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "PRE-AL-05 concurrent start");

  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents[0];
    const fixtures = getFirstStreetLocationFixtures(world.id);
    const cafe = fixtures.find(({ kind }) => kind === "CAFE");
    const office = fixtures.find(({ kind }) => kind === "OFFICE");
    assert.ok(cafe && office);

    const requests = [
      actionRequest({
        worldId: world.id,
        actorId: resident.actorRef.actorId,
        actionType: "MOVE",
        parameters: { destinationId: cafe.id },
        idempotencyKey: "concurrent-move-cafe",
        expectedActorVersion: 0,
      }),
      actionRequest({
        worldId: world.id,
        actorId: resident.actorRef.actorId,
        actionType: "MOVE",
        parameters: { destinationId: office.id },
        idempotencyKey: "concurrent-move-office",
        expectedActorVersion: 0,
      }),
    ];
    const results = await Promise.all(
      requests.map((request) =>
        executeResidentActionRequest(db, {
          request,
          validationContext: residentContext(world.id, resident),
        }),
      ),
    );

    assert.deepEqual(results.map(({ outcome }) => outcome.status).sort(), [
      "COMMITTED",
      "CONFLICT",
    ]);
    const committed = results.find(
      ({ outcome }) => outcome.status === "COMMITTED",
    );
    const conflicted = results.find(
      ({ outcome }) => outcome.status === "CONFLICT",
    );
    assert.ok(committed && conflicted);
    assert.equal(committed.outcome.eventCount, 1);
    assert.equal(committed.outcome.eventRefs.length, 1);
    assert.equal(conflicted.outcome.eventCount, 0);
    assert.equal(conflicted.outcome.reasonCode, "KERNEL_CONFLICT");

    const [runtime] = await client`
      select current_activity, state_version, activity_instance_id
      from resident_runtime_states
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    const [eventCount] = await client`
      select count(*)::int as count
      from world_events
      where world_id = ${world.id}
    `;
    assert.equal(runtime.current_activity, "TRAVELING");
    assert.equal(runtime.state_version, 1);
    assert.equal(runtime.activity_instance_id, committed.requestId);
    assert.equal(eventCount.count, 1);
  } finally {
    await deleteWorldGraph(client, [world.id]);
    await client.end();
  }
});

test("runtime mutation failure rolls back the request, event, outcome, and state", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "PRE-AL-05 runtime rollback");

  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents[0];

    await client`
      create or replace function pre_al_05_fail_runtime_update()
      returns trigger
      language plpgsql
      as $body$
      begin
        raise exception 'PRE-AL-05 runtime mutation failure';
      end;
      $body$
    `;
    await client`
      create trigger pre_al_05_fail_runtime_update
      before update on resident_runtime_states
      for each row execute function pre_al_05_fail_runtime_update()
    `;

    const request = actionRequest({
      worldId: world.id,
      actorId: resident.actorRef.actorId,
      actionType: "MOVE",
      parameters: {
        destinationId: getFirstStreetLocationFixtures(world.id).find(
          ({ kind }) => kind === "CAFE",
        ).id,
      },
      idempotencyKey: "runtime-rollback",
    });
    await assert.rejects(
      executeResidentActionRequest(db, {
        request,
        validationContext: residentContext(world.id, resident),
      }),
      /Failed query/,
    );

    const [requestCount] = await client`
      select count(*)::int as count from action_requests where id = ${request.id}
    `;
    const [outcomeCount] = await client`
      select count(*)::int as count
      from kernel_action_outcomes
      where action_request_id = ${request.id}
    `;
    const [eventCount] = await client`
      select count(*)::int as count from world_events where world_id = ${world.id}
    `;
    const [runtime] = await client`
      select current_activity, state_version, activity_instance_id
      from resident_runtime_states
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    const [worldRow] = await client`
      select world_seq from worlds where id = ${world.id}
    `;
    assert.equal(requestCount.count, 0);
    assert.equal(outcomeCount.count, 0);
    assert.equal(eventCount.count, 0);
    assert.equal(runtime.current_activity, "IDLE");
    assert.equal(runtime.state_version, 0);
    assert.equal(runtime.activity_instance_id, null);
    assert.equal(BigInt(worldRow.world_seq), 0n);

    await client`drop trigger if exists pre_al_05_fail_runtime_update on resident_runtime_states`;
    const completionRequest = actionRequest({
      worldId: world.id,
      actorId: resident.actorRef.actorId,
      actionType: "MOVE",
      parameters: {
        destinationId: getFirstStreetLocationFixtures(world.id).find(
          ({ kind }) => kind === "CAFE",
        ).id,
      },
      idempotencyKey: "completion-rollback",
    });
    const started = await executeResidentActionRequest(db, {
      request: completionRequest,
      validationContext: residentContext(world.id, resident),
    });
    assert.equal(started.outcome.status, "COMMITTED");
    await setWorldTime(client, world.id, new Date("2026-09-09T00:10:00.000Z"));
    await client`
      create trigger pre_al_05_fail_runtime_update
      before update on resident_runtime_states
      for each row execute function pre_al_05_fail_runtime_update()
    `;
    await assert.rejects(
      completeResidentAction(db, {
        worldId: world.id,
        actionRequestId: completionRequest.id,
      }),
      /Failed query/,
    );

    const [completionOutcome] = await client`
      select event_count, world_seq_start, world_seq_end
      from kernel_action_outcomes
      where action_request_id = ${completionRequest.id}
    `;
    const [completionEventCount] = await client`
      select count(*)::int as count
      from world_events
      where world_id = ${world.id}
    `;
    const [completionRuntime] = await client`
      select current_activity, state_version, activity_instance_id
      from resident_runtime_states
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    const [completionWorld] = await client`
      select world_seq from worlds where id = ${world.id}
    `;
    assert.equal(completionOutcome.event_count, 1);
    assert.equal(BigInt(completionOutcome.world_seq_start), 1n);
    assert.equal(BigInt(completionOutcome.world_seq_end), 1n);
    assert.equal(completionEventCount.count, 1);
    assert.equal(completionRuntime.current_activity, "TRAVELING");
    assert.equal(completionRuntime.state_version, 1);
    assert.equal(completionRuntime.activity_instance_id, completionRequest.id);
    assert.equal(BigInt(completionWorld.world_seq), 1n);
  } finally {
    await client`drop trigger if exists pre_al_05_fail_runtime_update on resident_runtime_states`;
    await client`drop function if exists pre_al_05_fail_runtime_update()`;
    await deleteWorldGraph(client, [world.id]);
    await client.end();
  }
});

test("MOVE and SLEEP semantics scale across the 30-resident fixture without event ticks", async () => {
  const { db, client } = createDb();
  const moveWorld = worldRecord(randomUUID(), "PRE-AL-05 30 move");
  const sleepWorld = worldRecord(randomUUID(), "PRE-AL-05 30 sleep");
  const worldIds = [moveWorld.id, sleepWorld.id];

  try {
    for (const world of [moveWorld, sleepWorld]) {
      await insertWorld(client, world);
      await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    }
    const moveResidents = generateResidentSeed({
      worldId: moveWorld.id,
      seed: moveWorld.seed,
    }).residents;
    const sleepResidents = generateResidentSeed({
      worldId: sleepWorld.id,
      seed: sleepWorld.seed,
    }).residents;
    const moveCafe = getFirstStreetLocationFixtures(moveWorld.id).find(
      ({ kind }) => kind === "CAFE",
    );
    assert.ok(moveCafe);

    for (const resident of moveResidents) {
      const request = actionRequest({
        worldId: moveWorld.id,
        actorId: resident.actorRef.actorId,
        actionType: "MOVE",
        parameters: { destinationId: moveCafe.id },
        idempotencyKey: `synthetic-move-${resident.residentId}`,
      });
      await executeResidentActionRequest(db, {
        request,
        validationContext: await residentContext(moveWorld.id, resident),
      });
      const index = moveResidents.indexOf(resident);
      await setWorldTime(
        client,
        moveWorld.id,
        new Date(START_TIME.getTime() + (index + 1) * 10 * 60_000),
      );
      const result = await completeResidentAction(db, {
        worldId: moveWorld.id,
        actionRequestId: request.id,
      });
      assert.equal(result.disposition, "EXECUTED");
      assert.equal(result.outcome.eventCount, 2);
    }

    for (const [index, resident] of sleepResidents.entries()) {
      const request = actionRequest({
        worldId: sleepWorld.id,
        actorId: resident.actorRef.actorId,
        actionType: "SLEEP",
        parameters: {},
        idempotencyKey: `synthetic-sleep-${resident.residentId}`,
      });
      await executeResidentActionRequest(db, {
        request,
        validationContext: await residentContext(sleepWorld.id, resident),
      });
      const completionHour = (index + 1) * 8;
      const day = Math.floor(completionHour / 24) + 9;
      const hour = completionHour % 24;
      await setWorldTime(
        client,
        sleepWorld.id,
        new Date(
          `2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`,
        ),
      );
      const result = await completeResidentAction(db, {
        worldId: sleepWorld.id,
        actionRequestId: request.id,
      });
      assert.equal(result.disposition, "EXECUTED");
      assert.equal(result.outcome.eventCount, 2);
    }

    const [moveEventCount] = await client`
      select count(*)::int as count from world_events where world_id = ${moveWorld.id}
    `;
    const [sleepEventCount] = await client`
      select count(*)::int as count from world_events where world_id = ${sleepWorld.id}
    `;
    assert.equal(moveEventCount.count, 60);
    assert.equal(sleepEventCount.count, 60);
  } finally {
    await deleteWorldGraph(client, worldIds);
    await client.end();
  }
});
