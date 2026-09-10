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
  createDeterministicSimulationDriver,
  executeResidentActionRequest,
  updateWorldClockControl,
} from "@mirror/world-kernel";

const START_TIME = new Date("2026-09-09T00:00:00.000Z");

function worldRecord(id, name) {
  return {
    id,
    name,
    timezone: "Asia/Shanghai",
    status: "RUNNING",
    seed: `pre-al-07-${id}`,
    worldTime: START_TIME,
    clockAnchorAt: START_TIME,
  };
}

function locationsFor(worldId) {
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
          ? ["EAT"]
          : location.kind === "STORE"
            ? ["SHOP"]
            : location.kind === "OFFICE"
              ? ["WORK"]
              : [],
  }));
}

function actionRequest({ worldId, actorId, actionType, parameters, key }) {
  const id = randomUUID();
  return {
    id,
    worldId,
    actorId,
    actionType,
    parameters,
    requestedBy: "RULE",
    idempotencyKey: key,
    expectedActorVersion: 0,
    requestedAtWorldTime: START_TIME.toISOString(),
    traceId: `trace-${id}`,
  };
}

function validationContext(worldId, resident) {
  return {
    world: { id: worldId, status: "RUNNING", worldTime: START_TIME },
    actors: [
      {
        id: resident.actorRef.actorId,
        worldId,
        status: "ACTIVE",
        version: 0,
        locationId: resident.homeLocationId,
        allowedRequesters: ["RULE"],
        inventory: {},
        balanceCents: 0,
      },
    ],
    locations: locationsFor(worldId),
    items: [],
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

async function removeWorldGraph(client, worldIds) {
  for (const worldId of worldIds) {
    await client`delete from kernel_action_outcome_events where world_id = ${worldId}`;
    await client`delete from kernel_action_outcomes where world_id = ${worldId}`;
    await client`delete from action_requests where world_id = ${worldId}`;
    await client`delete from scheduled_wake_registrations where world_id = ${worldId}`;
    await client`delete from resident_resource_states where world_id = ${worldId}`;
    await client`delete from resident_runtime_states where world_id = ${worldId}`;
  }
}

test("deterministic driver completes due activities and emits stable wakes", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "PRE-AL-07 scheduler");
  const otherWorld = worldRecord(randomUUID(), "PRE-AL-07 isolation");
  const worldIds = [world.id, otherWorld.id];

  try {
    await insertWorld(client, world);
    await insertWorld(client, otherWorld);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    await bootstrapResidentRuntimeStates(db, { worldId: otherWorld.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const otherResident = generateResidentSeed({
      worldId: otherWorld.id,
      seed: otherWorld.seed,
    }).residents[0];
    const fixtures = getFirstStreetLocationFixtures(world.id);
    const cafe = fixtures.find(({ kind }) => kind === "CAFE");
    const office = fixtures.find(({ kind }) => kind === "OFFICE");
    assert.ok(cafe && office);

    const driver = createDeterministicSimulationDriver(db);
    const requests = [];
    for (const [index, destination] of [
      [3, cafe],
      [1, office],
      [0, cafe],
    ]) {
      const request = actionRequest({
        worldId: world.id,
        actorId: residents[index].actorRef.actorId,
        actionType: "MOVE",
        parameters: { destinationId: destination.id },
        key: `move-${index}`,
      });
      requests.push({ request, residentId: residents[index].residentId });
    }

    for (const { request, residentId } of requests) {
      const resident = residents.find(
        (candidate) => candidate.residentId === residentId,
      );
      assert.ok(resident);
      const result = await executeResidentActionRequest(db, {
        request,
        validationContext: validationContext(world.id, resident),
      });
      assert.equal(result.outcome.status, "COMMITTED");
    }

    const otherFixtures = getFirstStreetLocationFixtures(otherWorld.id);
    const otherCafe = otherFixtures.find(({ kind }) => kind === "CAFE");
    assert.ok(otherCafe);
    const otherRequest = actionRequest({
      worldId: otherWorld.id,
      actorId: otherResident.actorRef.actorId,
      actionType: "MOVE",
      parameters: { destinationId: otherCafe.id },
      key: "other-move",
    });
    assert.equal(
      (
        await executeResidentActionRequest(db, {
          request: otherRequest,
          validationContext: validationContext(otherWorld.id, otherResident),
        })
      ).outcome.status,
      "COMMITTED",
    );

    const tenMinutes = new Date(START_TIME.getTime() + 10 * 60_000);
    const firstStep = await driver.runUntil(world.id, tenMinutes);
    assert.equal(firstStep.completedActivities, 2);
    assert.equal(firstStep.completionOutcomes.length, 2);
    assert.equal(firstStep.toWorldTime, tenMinutes.toISOString());
    assert.equal(firstStep.fromWorldSeq, "3");
    assert.equal(firstStep.toWorldSeq, "6");
    assert.equal(firstStep.wakeItems.length, 2);
    assert.equal(
      firstStep.wakeItems.every(({ workType }) => workType === "DECISION_WAKE"),
      true,
    );
    assert.equal(
      firstStep.wakeItems.some(
        ({ residentId }) => residentId === otherResident.residentId,
      ),
      false,
    );

    const completionEvents = await client`
      select payload, seq from world_events
      where world_id = ${world.id} and type = 'RESIDENT_MOVE_COMPLETED'
      order by seq
    `;
    const expectedResidents = [residents[0], residents[3]]
      .sort((left, right) => left.residentId.localeCompare(right.residentId))
      .map(({ residentId }) => residentId);
    const residentByRequest = new Map(
      requests.map(({ request, residentId }) => [request.id, residentId]),
    );
    assert.deepEqual(
      completionEvents.map(({ payload }) =>
        residentByRequest.get(payload.actionRequestId),
      ),
      expectedResidents,
    );
    assert.deepEqual(
      completionEvents.map(({ seq }) => String(seq)),
      ["5", "6"],
    );

    const repeated = await driver.processDueWork(world.id);
    assert.equal(repeated.processedWork, 0);
    assert.equal(repeated.completionOutcomes.length, 0);
    const eventCountAfterRepeat = await client`
      select count(*)::int as count from world_events where world_id = ${world.id}
    `;
    assert.equal(eventCountAfterRepeat[0].count, 6);

    const fifteenMinutes = new Date(START_TIME.getTime() + 15 * 60_000);
    const secondStep = await driver.runUntil(world.id, fifteenMinutes);
    assert.equal(secondStep.completedActivities, 1);
    assert.equal(secondStep.toWorldSeq, "8");
    assert.equal(
      secondStep.completionOutcomes[0].eventRefs.at(-1).type,
      "RESIDENT_MOVE_COMPLETED",
    );

    const otherStep = await driver.runUntil(otherWorld.id, tenMinutes);
    assert.equal(otherStep.completedActivities, 1);
    const worldTimes = await client`
      select id, world_time, world_seq from worlds where id in (${world.id}, ${otherWorld.id}) order by id
    `;
    assert.equal(worldTimes.length, 2);
    assert.equal(worldTimes.find(({ id }) => id === world.id).world_seq, "8");
    assert.equal(
      worldTimes.find(({ id }) => id === otherWorld.id).world_seq,
      "3",
    );
  } finally {
    await removeWorldGraph(client, worldIds);
    await client.end();
  }
});

test("driver advances only running worlds, preserves durable wakes, and stays bounded", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "PRE-AL-07 policy");
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const driver = createDeterministicSimulationDriver(db, {
      maxWorkItemsPerStep: 1,
    });
    const wake = {
      policyVersion: "m3-scheduler-v1",
      wakeId: randomUUID(),
      worldId: world.id,
      residentId: residents[0].residentId,
      wakeReason: "DEFERRED_REPLAN",
      dueWorldTime: new Date(START_TIME.getTime() + 5 * 60_000).toISOString(),
      sourceStateVersion: 0,
      sourceWorldSeq: "0",
      decisionEpoch: 1,
      dedupeKey: "defer:resident-0:1",
    };
    await driver.registerScheduledWake(wake);
    await driver.registerScheduledWake(wake);

    const fiveMinutes = new Date(START_TIME.getTime() + 5 * 60_000);
    const wakeStep = await driver.runUntil(world.id, fiveMinutes);
    assert.equal(wakeStep.processedWork, 1);
    assert.equal(wakeStep.wakeItems[0].wakeReason, "DEFERRED_REPLAN");
    assert.equal(wakeStep.wakeItems[0].wakeId, wake.wakeId);
    const reconstructed = createDeterministicSimulationDriver(db, {
      maxWorkItemsPerStep: 1,
    });
    const requery = await reconstructed.collectDueWork(world.id);
    assert.equal(requery.length, 1);
    assert.equal(requery[0].wakeId, wake.wakeId);

    const paused = await updateWorldClockControl(
      db,
      world.id,
      { status: "PAUSED" },
      START_TIME,
      "development",
    );
    const pausedStep = await driver.runUntil(
      world.id,
      new Date(START_TIME.getTime() + 60 * 60_000),
    );
    assert.equal(pausedStep.processedWork, 0);
    assert.equal(pausedStep.toWorldTime, paused.worldTime.toISOString());
    assert.equal(pausedStep.toWorldSeq, paused.worldSeq.toString());

    await updateWorldClockControl(
      db,
      world.id,
      { status: "MAINTENANCE" },
      START_TIME,
      "development",
    );
    const maintenanceStep = await driver.processDueWork(world.id);
    assert.equal(maintenanceStep.processedWork, 0);

    await assert.rejects(
      driver.runUntil(world.id, new Date("2026-09-08T23:59:00.000Z")),
      /World time cannot move backward/,
    );
  } finally {
    await removeWorldGraph(client, [world.id]);
    await client.end();
  }
});

test("driver completes SLEEP exactly at its World-Time due boundary", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "PRE-AL-07 sleep");
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents[0];
    const driver = createDeterministicSimulationDriver(db);
    const sleep = actionRequest({
      worldId: world.id,
      actorId: resident.actorRef.actorId,
      actionType: "SLEEP",
      parameters: {},
      key: "sleep-driver",
    });
    const start = await executeResidentActionRequest(db, {
      request: sleep,
      validationContext: validationContext(world.id, resident),
    });
    assert.equal(start.outcome.status, "COMMITTED");

    const beforeDue = new Date(START_TIME.getTime() + (480 - 1) * 60_000);
    const early = await driver.runUntil(world.id, beforeDue);
    assert.equal(early.completedActivities, 0);
    assert.equal(early.processedWork, 0);
    assert.equal(early.nextDueWorldTime, "2026-09-09T08:00:00.000Z");

    const due = new Date(START_TIME.getTime() + 480 * 60_000);
    const completed = await driver.runUntil(world.id, due);
    assert.equal(completed.completedActivities, 1);
    assert.equal(completed.completionOutcomes[0].eventRefs.length, 2);
    const completionEvent = await client`
      select payload, occurred_at from world_events
      where world_id = ${world.id} and type = 'RESIDENT_SLEEP_COMPLETED'
    `;
    assert.equal(completionEvent.length, 1);
    assert.equal(
      new Date(completionEvent[0].occurred_at).toISOString(),
      due.toISOString(),
    );
    assert.equal(
      completionEvent[0].payload.restAnchorTransition.worldTime,
      due.toISOString(),
    );
    assert.equal((await driver.processDueWork(world.id)).processedWork, 0);
  } finally {
    await removeWorldGraph(client, [world.id]);
    await client.end();
  }
});

test("driver processes a 30-resident mixed due batch in stable serial order", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "PRE-AL-07 thirty residents");
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    assert.equal(residents.length, 30);
    const fixtures = getFirstStreetLocationFixtures(world.id);
    const cafe = fixtures.find(({ kind }) => kind === "CAFE");
    assert.ok(cafe);
    const requests = [];

    for (const [index, resident] of residents.entries()) {
      const actionType = index < 15 ? "MOVE" : "SLEEP";
      const request = actionRequest({
        worldId: world.id,
        actorId: resident.actorRef.actorId,
        actionType,
        parameters: actionType === "MOVE" ? { destinationId: cafe.id } : {},
        key: `mixed-${index}`,
      });
      requests.push({ request, residentId: resident.residentId });
      const result = await executeResidentActionRequest(db, {
        request,
        validationContext: validationContext(world.id, resident),
      });
      assert.equal(result.outcome.status, "COMMITTED");
    }

    const driver = createDeterministicSimulationDriver(db);
    const tenMinutes = new Date(START_TIME.getTime() + 10 * 60_000);
    const moveStep = await driver.runUntil(world.id, tenMinutes);
    assert.equal(moveStep.completedActivities, 15);
    assert.equal(moveStep.processedWork, 15);
    assert.equal(moveStep.wakeItems.length, 15);

    const due = new Date(START_TIME.getTime() + 480 * 60_000);
    const sleepStep = await driver.runUntil(world.id, due);
    assert.equal(sleepStep.completedActivities, 15);
    assert.equal(sleepStep.processedWork, 15);
    assert.equal(sleepStep.wakeItems.length, 15);
    assert.equal(sleepStep.failureItems.length, 0);

    const completionEvents = await client`
      select payload, seq from world_events
      where world_id = ${world.id}
        and type in ('RESIDENT_MOVE_COMPLETED', 'RESIDENT_SLEEP_COMPLETED')
      order by seq
    `;
    assert.equal(completionEvents.length, 30);
    const residentByRequest = new Map(
      requests.map(({ request, residentId }) => [request.id, residentId]),
    );
    const expectedOrder = [
      ...residents
        .slice(0, 15)
        .map(({ residentId }) => residentId)
        .sort((left, right) => left.localeCompare(right)),
      ...residents
        .slice(15)
        .map(({ residentId }) => residentId)
        .sort((left, right) => left.localeCompare(right)),
    ];
    assert.deepEqual(
      completionEvents.map(({ payload }) =>
        residentByRequest.get(payload.actionRequestId),
      ),
      expectedOrder,
    );
    assert.deepEqual(
      completionEvents.map(({ seq }) => String(seq)),
      [
        ...Array.from({ length: 15 }, (_, index) => String(32 + index)),
        ...Array.from({ length: 15 }, (_, index) => String(48 + index)),
      ],
    );

    const runtimeRows = await client`
      select current_activity, count(*)::int as count
      from resident_runtime_states where world_id = ${world.id}
      group by current_activity
    `;
    assert.deepEqual(Array.from(runtimeRows), [
      { current_activity: "IDLE", count: 30 },
    ]);
  } finally {
    await removeWorldGraph(client, [world.id]);
    await client.end();
  }
});
