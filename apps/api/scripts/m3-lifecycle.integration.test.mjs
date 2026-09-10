import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  bootstrapResidentRuntimeStates,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  registerNextWorkBoundaryWakes,
} from "@mirror/db";
import {
  applyCompletedNeedEffectToNeedAnchor,
  evaluateNeeds,
} from "@mirror/life-engine";
import {
  completeResidentAction,
  advanceWorldTimeTo,
  canonicalResidentProjectionFromRows,
  createDeterministicSimulationDriver,
  createPostgresObservationQuery,
  executeResidentActionRequest,
  getTravelDurationWorldMinutes,
  projectionHash,
  replayM3ResidentProjection,
  replayM3ResidentProjectionFromCheckpoint,
} from "@mirror/world-kernel";

const START_TIME = new Date("2026-09-14T00:00:00.000Z");

function worldRecord(id) {
  return {
    id,
    name: "M3 lifecycle integration",
    timezone: "UTC",
    status: "RUNNING",
    seed: `m3-lifecycle-${id}`,
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
          ? ["EAT", "WORK"]
          : ["OFFICE", "STORE"].includes(location.kind)
            ? ["WORK"]
            : [],
  }));
}

function needProfile(resident) {
  return {
    residentId: resident.residentId,
    profile: {
      personality: { extraversion: resident.profile.personality.extraversion },
      routine: { flexibility: resident.profile.routine.flexibility },
    },
  };
}

function request({
  world,
  resident,
  actionType,
  parameters,
  key,
  expectedActorVersion = 0,
}) {
  const id = randomUUID();
  return {
    id,
    worldId: world.id,
    actorId: resident.actorRef.actorId,
    actionType,
    parameters,
    requestedBy: "RULE",
    idempotencyKey: key,
    expectedActorVersion,
    requestedAtWorldTime: world.worldTime.toISOString(),
    traceId: `m3-lifecycle-${id}`,
  };
}

function context(world, residents) {
  return {
    world: { id: world.id, status: "RUNNING", worldTime: world.worldTime },
    actors: residents.map((resident) => ({
      id: resident.actorRef.actorId,
      worldId: world.id,
      status: "ACTIVE",
      version: 0,
      locationId: resident.homeLocationId,
      allowedRequesters: ["RULE"],
      inventory: {},
      balanceCents: 0,
    })),
    locations: locationsFor(world.id),
    items: [],
  };
}

async function insertWorld(client, world) {
  await client`
    insert into worlds (id, name, timezone, status, seed, world_time, clock_anchor_at)
    values (${world.id}, ${world.name}, ${world.timezone}, ${world.status}, ${world.seed},
      ${world.worldTime.toISOString()}, ${world.clockAnchorAt.toISOString()})
  `;
}

async function setWorldTime(client, worldId, worldTime) {
  await client`update worlds set world_time = ${worldTime.toISOString()} where id = ${worldId}`;
}

async function cleanup(client, worldId) {
  await client`delete from kernel_action_outcome_events where world_id = ${worldId}`;
  await client`delete from kernel_action_outcomes where world_id = ${worldId}`;
  await client`delete from action_requests where world_id = ${worldId}`;
  await client`delete from scheduled_wake_registrations where world_id = ${worldId}`;
  await client`delete from resident_resource_states where world_id = ${worldId}`;
  await client`delete from resident_runtime_states where world_id = ${worldId}`;
}

async function readM3Events(client, worldId) {
  const rows = await client`
    select id, world_id, seq, type, actor_id, target_id, payload, occurred_at
    from world_events
    where world_id = ${worldId}
    order by seq
  `;
  return rows.map((row) => ({
    id: row.id,
    worldId: row.world_id,
    seq: BigInt(row.seq),
    type: row.type,
    actorId: row.actor_id,
    targetId: row.target_id,
    payload: row.payload,
    occurredAt: new Date(row.occurred_at),
  }));
}

async function readLiveM3Projection(client, world, seed) {
  const [worldRow] = await client`
    select world_time, world_seq
    from worlds
    where id = ${world.id}
  `;
  const runtimeRows = await client`
    select resident_id, current_location_id, current_activity,
      activity_instance_id, activity_target_location_id,
      activity_target_resident_id, activity_started_at_world_time,
      activity_due_at_world_time, last_ate_at_world_time,
      last_social_contact_at_world_time, completed_work_shift_keys,
      state_version, source_world_seq
    from resident_runtime_states
    where world_id = ${world.id}
    order by resident_id
  `;
  const resourceRows = await client`
    select resident_id, food_units, resource_version
    from resident_resource_states
    where world_id = ${world.id}
  `;
  return canonicalResidentProjectionFromRows({
    worldId: world.id,
    worldTime: new Date(worldRow.world_time),
    worldSeq: BigInt(worldRow.world_seq),
    seed,
    rows: runtimeRows.map((row) => ({
      residentId: row.resident_id,
      currentLocationId: row.current_location_id,
      currentActivity: row.current_activity,
      activityInstanceId: row.activity_instance_id,
      activityTargetLocationId: row.activity_target_location_id,
      activityTargetResidentId: row.activity_target_resident_id,
      activityStartedAtWorldTime: row.activity_started_at_world_time,
      activityDueAtWorldTime: row.activity_due_at_world_time,
      lastAteAtWorldTime: row.last_ate_at_world_time,
      lastSocialContactAtWorldTime: row.last_social_contact_at_world_time,
      completedWorkShiftKeys: row.completed_work_shift_keys,
      stateVersion: row.state_version,
      sourceWorldSeq: BigInt(row.source_world_seq),
    })),
    resourceRows: resourceRows.map((row) => ({
      residentId: row.resident_id,
      foodUnits: row.food_units,
      resourceVersion: row.resource_version,
    })),
  });
}

test("M3 EAT consumes once and completes at the exact 30-minute boundary", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ resources }) => resources.foodUnits > 0);
    assert.ok(resident);
    const eat = request({
      world,
      resident,
      actionType: "EAT",
      parameters: {
        itemId: (
          await client`select item_id from resident_resource_states where world_id = ${world.id} and resident_id = ${resident.residentId}`
        )[0].item_id,
        quantity: 1,
      },
      key: "eat-once",
    });
    const started = await executeResidentActionRequest(db, {
      request: eat,
      validationContext: context(world, [resident]),
      expectedResourceVersion: 0,
    });
    assert.equal(
      started.outcome.status,
      "COMMITTED",
      JSON.stringify(started.outcome),
    );
    assert.deepEqual(
      started.outcome.eventRefs.map(({ type }) => type),
      ["RESIDENT_EAT_STARTED"],
    );
    const [resourceAfterStart] =
      await client`select food_units, resource_version from resident_resource_states where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    assert.deepEqual(resourceAfterStart, {
      food_units: resident.resources.foodUnits - 1,
      resource_version: 1,
    });
    assert.equal(
      (
        await completeResidentAction(db, {
          worldId: world.id,
          actionRequestId: eat.id,
        })
      ).disposition,
      "NOT_DUE",
    );
    await setWorldTime(client, world.id, new Date("2026-09-14T00:30:00.000Z"));
    const completed = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: eat.id,
    });
    assert.equal(completed.disposition, "EXECUTED");
    assert.deepEqual(
      completed.outcome.eventRefs.map(({ type }) => type),
      ["RESIDENT_EAT_STARTED", "RESIDENT_EAT_COMPLETED"],
    );
    assert.equal(completed.outcome.eventCount, 2);
    assert.equal(
      (
        await completeResidentAction(db, {
          worldId: world.id,
          actionRequestId: eat.id,
        })
      ).disposition,
      "REUSED",
    );
    const [runtime] =
      await client`select current_activity, last_ate_at_world_time from resident_runtime_states where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    assert.equal(runtime.current_activity, "IDLE");
    assert.equal(
      new Date(runtime.last_ate_at_world_time).toISOString(),
      "2026-09-14T00:30:00.000Z",
    );
    const events =
      await client`select type, payload from world_events where world_id = ${world.id} order by seq`;
    assert.equal(events.length, 2);
    assert.equal(events[1].payload.needEffect.reliefPoints, 55);
    const needAnchor = {
      worldTime: START_TIME,
      activity: "AWAKE",
      hungerPressure: 80,
      restPressure: 10,
      socialPressure: 10,
    };
    const beforeNeed = evaluateNeeds({
      worldId: world.id,
      currentWorldTime: new Date("2026-09-14T00:30:00.000Z"),
      status: "RUNNING",
      resident: needProfile(resident),
      anchor: needAnchor,
    });
    const nextAnchor = applyCompletedNeedEffectToNeedAnchor({
      worldId: world.id,
      resident: needProfile(resident),
      anchor: needAnchor,
      completedAtWorldTime: new Date("2026-09-14T00:30:00.000Z"),
      effect: events[1].payload.needEffect,
    });
    const afterNeed = evaluateNeeds({
      worldId: world.id,
      currentWorldTime: new Date("2026-09-14T00:30:00.000Z"),
      status: "RUNNING",
      resident: needProfile(resident),
      anchor: nextAnchor,
    });
    assert.equal(afterNeed.hungerPressure, nextAnchor.hungerPressure);
    assert.ok(
      Math.abs(
        afterNeed.hungerPressure - Math.max(0, beforeNeed.hungerPressure - 55),
      ) < 1e-6,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 EAT rejects corrupted due metadata without releasing or appending", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ resources }) => resources.foodUnits > 0);
    assert.ok(resident);
    const [resource] =
      await client`select item_id from resident_resource_states where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    const eat = request({
      world,
      resident,
      actionType: "EAT",
      parameters: { itemId: resource.item_id, quantity: 1 },
      key: "eat-corrupt-due",
    });
    await executeResidentActionRequest(db, {
      request: eat,
      validationContext: context(world, [resident]),
      expectedResourceVersion: 0,
    });
    await client`
      update resident_runtime_states
      set activity_due_at_world_time = ${"2026-09-14T00:29:00.000Z"}
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    await setWorldTime(client, world.id, new Date("2026-09-14T00:30:00.000Z"));
    await assert.rejects(
      completeResidentAction(db, {
        worldId: world.id,
        actionRequestId: eat.id,
      }),
      (error) => error?.code === "INVALID_COMPLETION",
    );
    const [runtime] =
      await client`select current_activity, state_version from resident_runtime_states where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    assert.equal(runtime.current_activity, "EATING");
    assert.equal(runtime.state_version, 1);
    assert.equal(
      (
        await client`select count(*)::int as count from world_events where world_id = ${world.id}`
      )[0].count,
      1,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 EAT uses canonical Kernel facts instead of caller validation context", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ resources }) => resources.foodUnits > 0);
    assert.ok(resident);
    const park = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "PARK",
    );
    assert.ok(park);
    const dishonestContext = context(world, [resident]);
    dishonestContext.actors[0].worldId = randomUUID();
    dishonestContext.actors[0].status = "INACTIVE";
    dishonestContext.actors[0].allowedRequesters = [];
    dishonestContext.actors[0].locationId = park.id;
    dishonestContext.locations = dishonestContext.locations.map((location) => ({
      ...location,
      capabilities: [],
    }));
    const eat = request({
      world,
      resident,
      actionType: "EAT",
      parameters: {
        itemId: (
          await client`select item_id from resident_resource_states where world_id = ${world.id} and resident_id = ${resident.residentId}`
        )[0].item_id,
        quantity: 1,
      },
      key: "eat-authoritative-context",
    });
    const started = await executeResidentActionRequest(db, {
      request: eat,
      validationContext: dishonestContext,
      expectedResourceVersion: 0,
    });
    assert.equal(started.outcome.status, "COMMITTED");
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 EAT requires an immutable resource observation version", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ resources }) => resources.foodUnits > 0);
    assert.ok(resident);
    const [resourceBefore] =
      await client`select item_id, food_units, resource_version from resident_resource_states where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    const eat = request({
      world,
      resident,
      actionType: "EAT",
      parameters: { itemId: resourceBefore.item_id, quantity: 1 },
      key: "eat-missing-resource-version",
    });
    const started = await executeResidentActionRequest(db, {
      request: eat,
      validationContext: context(world, [resident]),
    });
    assert.equal(started.outcome.status, "CONFLICT");
    assert.equal(started.outcome.reasonCode, "KERNEL_CONFLICT");
    assert.deepEqual(
      (
        await client`select food_units, resource_version from resident_resource_states where world_id = ${world.id} and resident_id = ${resident.residentId}`
      )[0],
      {
        food_units: resourceBefore.food_units,
        resource_version: resourceBefore.resource_version,
      },
    );
    assert.equal(
      (
        await client`select count(*)::int as count from world_events where world_id = ${world.id}`
      )[0].count,
      0,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 registers one deterministic WORK boundary per employed resident", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const first = await registerNextWorkBoundaryWakes(db, {
      worldId: world.id,
    });
    const second = await registerNextWorkBoundaryWakes(db, {
      worldId: world.id,
    });
    assert.equal(first.length, 26);
    assert.deepEqual(second, first);
    assert.ok(
      first.every(
        ({ wakeReason, dueWorldTime }) =>
          wakeReason === "WORK_BOUNDARY" &&
          dueWorldTime === "2026-09-14T09:00:00.000Z",
      ),
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 EAT rejects a resident resource row with a non-canonical item", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ resources }) => resources.foodUnits > 0);
    assert.ok(resident);
    const fakeItemId = randomUUID();
    await client`
      insert into resident_resource_states
        (world_id, resident_id, item_id, location_id, food_units, resource_version)
      values
        (${world.id}, ${resident.residentId}, ${fakeItemId}, ${resident.homeLocationId}, 1, 0)
    `;
    const eat = request({
      world,
      resident,
      actionType: "EAT",
      parameters: { itemId: fakeItemId, quantity: 1 },
      key: "eat-non-canonical-item",
    });
    const started = await executeResidentActionRequest(db, {
      request: eat,
      validationContext: context(world, [resident]),
      expectedResourceVersion: 0,
    });
    assert.equal(started.outcome.status, "REJECTED");
    assert.equal(started.outcome.reasonCode, "KERNEL_INVALID_LOCATION");
    assert.equal(
      (
        await client`select food_units from resident_resource_states where world_id = ${world.id} and item_id = ${fakeItemId}`
      )[0].food_units,
      1,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 WORK requires the exact UTC shift boundary and records attendance only", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  world.worldTime = new Date("2026-09-14T09:00:00.000Z");
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ employment }) => employment.status === "EMPLOYED");
    assert.ok(resident && resident.employment.status === "EMPLOYED");
    await client`update resident_runtime_states set current_location_id = ${resident.employment.workplaceId}, state_version = 1 where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    const work = request({
      world,
      resident,
      actionType: "WORK",
      parameters: { workplaceId: resident.employment.workplaceId },
      key: "work-boundary",
      expectedActorVersion: 1,
    });
    const started = await executeResidentActionRequest(db, {
      request: work,
      validationContext: context(world, [resident]),
    });
    assert.equal(
      started.outcome.status,
      "COMMITTED",
      JSON.stringify(started.outcome),
    );
    await setWorldTime(client, world.id, new Date("2026-09-14T17:00:00.000Z"));
    const completed = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: work.id,
      expectedStateVersion: 2,
    });
    assert.equal(completed.disposition, "EXECUTED");
    const [runtime] =
      await client`select current_activity, completed_work_shift_keys from resident_runtime_states where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    assert.equal(runtime.current_activity, "IDLE");
    assert.equal(runtime.completed_work_shift_keys.length, 1);
    const [workCompleted] =
      await client`select target_id, payload from world_events where world_id = ${world.id} and type = 'RESIDENT_WORK_COMPLETED'`;
    assert.equal(workCompleted.target_id, resident.employment.workplaceId);
    assert.equal(
      workCompleted.payload.shiftStartsAtWorldTime,
      "2026-09-14T09:00:00.000Z",
    );
    assert.equal(
      workCompleted.payload.shiftEndsAtWorldTime,
      "2026-09-14T17:00:00.000Z",
    );
    const observation = await createPostgresObservationQuery(
      db,
    ).getResidentObservation({
      worldId: world.id,
      residentId: resident.residentId,
    });
    assert.equal(observation.workObligation.status, "AVAILABLE");
    assert.equal(observation.workObligation.obligation.status, "LATE");
    assert.deepEqual(
      observation.workObligation.obligation.completedWorkShiftKeys,
      [`${resident.residentId}|2026-09-14T09:00:00.000Z`],
    );
    assert.equal(
      (
        await client`select count(*)::int as count from world_events where world_id = ${world.id} and type like 'WAGE%'`
      )[0].count,
      0,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 completion rejects a WORK activity moved away from its workplace", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  world.worldTime = new Date("2026-09-14T09:00:00.000Z");
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ employment }) => employment.status === "EMPLOYED");
    assert.ok(resident && resident.employment.status === "EMPLOYED");
    await client`update resident_runtime_states set current_location_id = ${resident.employment.workplaceId}, state_version = 1 where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    const work = request({
      world,
      resident,
      actionType: "WORK",
      parameters: { workplaceId: resident.employment.workplaceId },
      key: "work-location-integrity",
      expectedActorVersion: 1,
    });
    await executeResidentActionRequest(db, {
      request: work,
      validationContext: context(world, [resident]),
    });
    const park = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "PARK",
    );
    assert.ok(park);
    await client`update resident_runtime_states set current_location_id = ${park.id} where world_id = ${world.id} and resident_id = ${resident.residentId}`;
    await setWorldTime(client, world.id, new Date("2026-09-14T17:00:00.000Z"));
    await assert.rejects(
      completeResidentAction(db, {
        worldId: world.id,
        actionRequestId: work.id,
      }),
      (error) => error?.code === "INVALID_COMPLETION",
    );
    assert.equal(
      (
        await client`select count(*)::int as count from world_events where world_id = ${world.id}`
      )[0].count,
      1,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 TALK completion rejects a pair that is no longer co-located", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.slice(0, 2);
    await client`update resident_runtime_states set current_location_id = ${residents[0].homeLocationId}, state_version = 1 where world_id = ${world.id} and resident_id = ${residents[1].residentId}`;
    const talk = request({
      world,
      resident: residents[0],
      actionType: "TALK",
      parameters: { participantId: residents[1].actorRef.actorId },
      key: "talk-location-integrity",
    });
    await executeResidentActionRequest(db, {
      request: talk,
      validationContext: context(world, residents),
    });
    const park = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "PARK",
    );
    assert.ok(park);
    await client`update resident_runtime_states set current_location_id = ${park.id} where world_id = ${world.id} and resident_id = ${residents[1].residentId}`;
    await setWorldTime(client, world.id, new Date("2026-09-14T00:15:00.000Z"));
    await assert.rejects(
      completeResidentAction(db, {
        worldId: world.id,
        actionRequestId: talk.id,
      }),
      (error) => error?.code === "INVALID_COMPLETION",
    );
    assert.equal(
      (
        await client`select count(*)::int as count from world_events where world_id = ${world.id} and type = 'RESIDENT_TALK_COMPLETED'`
      )[0].count,
      0,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 TALK atomically occupies and releases both residents", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.slice(0, 2);
    await client`update resident_runtime_states set current_location_id = ${residents[0].homeLocationId}, state_version = 1 where world_id = ${world.id} and resident_id = ${residents[1].residentId}`;
    const talk = request({
      world,
      resident: residents[0],
      actionType: "TALK",
      parameters: { participantId: residents[1].actorRef.actorId },
      key: "talk-pair",
      expectedActorVersion: 0,
    });
    const started = await executeResidentActionRequest(db, {
      request: talk,
      validationContext: context(world, residents),
    });
    assert.equal(started.outcome.status, "COMMITTED");
    const activities =
      await client`select resident_id, current_activity, activity_instance_id, activity_target_resident_id from resident_runtime_states where world_id = ${world.id} and resident_id in (${residents[0].residentId}, ${residents[1].residentId}) order by resident_id`;
    assert.equal(activities.length, 2);
    assert.equal(activities[0].current_activity, "TALKING");
    assert.equal(activities[1].current_activity, "TALKING");
    assert.equal(activities[0].activity_instance_id, talk.id);
    assert.equal(activities[1].activity_instance_id, talk.id);
    await setWorldTime(client, world.id, new Date("2026-09-14T00:15:00.000Z"));
    const completed = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: talk.id,
      expectedStateVersion: 1,
    });
    assert.equal(completed.disposition, "EXECUTED");
    assert.deepEqual(
      completed.outcome.eventRefs.map(({ type }) => type),
      ["RESIDENT_TALK_STARTED", "RESIDENT_TALK_COMPLETED"],
    );
    const [idleCount] =
      await client`select count(*)::int as count from resident_runtime_states where world_id = ${world.id} and current_activity = 'IDLE'`;
    assert.equal(idleCount.count, 30);
    const [contactCount] =
      await client`select count(*)::int as count from resident_runtime_states where world_id = ${world.id} and last_social_contact_at_world_time is not null`;
    assert.equal(contactCount.count, 2);
    const [talkCompleted] = await client`
      select payload from world_events
      where world_id = ${world.id} and type = 'RESIDENT_TALK_COMPLETED'
    `;
    for (const participant of residents) {
      const anchor = {
        worldTime: START_TIME,
        activity: "AWAKE",
        hungerPressure: 10,
        restPressure: 10,
        socialPressure: 80,
      };
      const beforeNeed = evaluateNeeds({
        worldId: world.id,
        currentWorldTime: new Date("2026-09-14T00:15:00.000Z"),
        status: "RUNNING",
        resident: needProfile(participant),
        anchor,
      });
      const nextAnchor = applyCompletedNeedEffectToNeedAnchor({
        worldId: world.id,
        resident: needProfile(participant),
        anchor,
        completedAtWorldTime: new Date("2026-09-14T00:15:00.000Z"),
        effect: talkCompleted.payload.needEffect,
      });
      const afterNeed = evaluateNeeds({
        worldId: world.id,
        currentWorldTime: new Date("2026-09-14T00:15:00.000Z"),
        status: "RUNNING",
        resident: needProfile(participant),
        anchor: nextAnchor,
      });
      assert.equal(afterNeed.socialPressure, nextAnchor.socialPressure);
      assert.ok(
        Math.abs(
          afterNeed.socialPressure -
            Math.max(0, beforeNeed.socialPressure - 35),
        ) < 1e-6,
      );
    }
    const driver = createDeterministicSimulationDriver(db);
    assert.equal((await driver.processDueWork(world.id)).processedWork, 0);
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 TALK rejects a corrupted participant due without partial release", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.slice(0, 2);
    await client`
      update resident_runtime_states
      set current_location_id = ${residents[0].homeLocationId}, state_version = 1
      where world_id = ${world.id} and resident_id = ${residents[1].residentId}
    `;
    const talk = request({
      world,
      resident: residents[0],
      actionType: "TALK",
      parameters: { participantId: residents[1].actorRef.actorId },
      key: "talk-corrupt-due",
    });
    await executeResidentActionRequest(db, {
      request: talk,
      validationContext: context(world, residents),
    });
    await client`
      update resident_runtime_states
      set activity_due_at_world_time = ${"2026-09-14T00:14:00.000Z"}
      where world_id = ${world.id} and resident_id = ${residents[1].residentId}
    `;
    await setWorldTime(client, world.id, new Date("2026-09-14T00:15:00.000Z"));
    await assert.rejects(
      completeResidentAction(db, {
        worldId: world.id,
        actionRequestId: talk.id,
      }),
      (error) => error?.code === "INVALID_COMPLETION",
    );
    const rows = await client`
      select current_activity from resident_runtime_states
      where world_id = ${world.id} and resident_id in (${residents[0].residentId}, ${residents[1].residentId})
      order by resident_id
    `;
    assert.deepEqual(
      rows.map(({ current_activity }) => current_activity),
      ["TALKING", "TALKING"],
    );
    assert.equal(
      (
        await client`select count(*)::int as count from world_events where world_id = ${world.id}`
      )[0].count,
      1,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 EAT CAS rejects a concurrent spend and completes after a client restart", async () => {
  let handle = createDb();
  let { db, client } = handle;
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ resources }) => resources.foodUnits > 0);
    assert.ok(resident);
    const [resource] = await client`
      select item_id from resident_resource_states
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    const first = request({
      world,
      resident,
      actionType: "EAT",
      parameters: { itemId: resource.item_id, quantity: 1 },
      key: "eat-race-first",
    });
    const second = request({
      world,
      resident,
      actionType: "EAT",
      parameters: { itemId: resource.item_id, quantity: 1 },
      key: "eat-race-second",
    });
    const results = await Promise.all(
      [first, second].map((eat) =>
        executeResidentActionRequest(db, {
          request: eat,
          validationContext: context(world, [resident]),
          expectedResourceVersion: 0,
        }),
      ),
    );
    assert.equal(
      results.filter(({ outcome }) => outcome.status === "COMMITTED").length,
      1,
    );
    const [resourceAfterRace] = await client`
      select food_units, resource_version from resident_resource_states
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    assert.equal(
      resourceAfterRace.food_units,
      resident.resources.foodUnits - 1,
    );
    assert.equal(resourceAfterRace.resource_version, 1);

    const winner = results.find(
      ({ outcome }) => outcome.status === "COMMITTED",
    );
    assert.ok(winner);
    const winnerRequest = first.id === winner.requestId ? first : second;
    assert.equal(
      (
        await executeResidentActionRequest(db, {
          request: winnerRequest,
          validationContext: context(world, [resident]),
          expectedResourceVersion: 0,
        })
      ).disposition,
      "REUSED",
    );

    await client.end({ timeout: 5 });
    handle = createDb();
    ({ db, client } = handle);
    world.worldTime = new Date("2026-09-14T00:30:00.000Z");
    await setWorldTime(client, world.id, world.worldTime);
    const completed = await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: winner.requestId,
    });
    assert.equal(completed.disposition, "EXECUTED");
    assert.equal(
      (
        await completeResidentAction(db, {
          worldId: world.id,
          actionRequestId: winner.requestId,
        })
      ).disposition,
      "REUSED",
    );
    assert.equal(
      (
        await client`select count(*)::int as count from world_events where world_id = ${world.id}`
      )[0].count,
      2,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 WORK due completion is re-queried after restart and is idempotent", async () => {
  let handle = createDb();
  let { db, client } = handle;
  const world = worldRecord(randomUUID());
  world.worldTime = new Date("2026-09-14T09:00:00.000Z");
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.find(({ employment }) => employment.status === "EMPLOYED");
    assert.ok(resident && resident.employment.status === "EMPLOYED");
    await client`
      update resident_runtime_states
      set current_location_id = ${resident.employment.workplaceId}
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    const work = request({
      world,
      resident,
      actionType: "WORK",
      parameters: { workplaceId: resident.employment.workplaceId },
      key: "work-restart",
    });
    const started = await executeResidentActionRequest(db, {
      request: work,
      validationContext: context(world, [resident]),
    });
    assert.equal(started.outcome.status, "COMMITTED");

    await client.end({ timeout: 5 });
    handle = createDb();
    ({ db, client } = handle);
    world.worldTime = new Date("2026-09-14T17:00:00.000Z");
    await setWorldTime(client, world.id, world.worldTime);
    const step = await createDeterministicSimulationDriver(db).processDueWork(
      world.id,
    );
    assert.equal(step.completedActivities, 1);
    assert.equal(
      (
        await completeResidentAction(db, {
          worldId: world.id,
          actionRequestId: work.id,
        })
      ).disposition,
      "REUSED",
    );
    const [attendance] = await client`
      select completed_work_shift_keys
      from resident_runtime_states
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    assert.equal(attendance.completed_work_shift_keys.length, 1);
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 TALK reciprocal race has one winner and restart-safe paired completion", async () => {
  let handle = createDb();
  let { db, client } = handle;
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const first = residents[0];
    const second = residents
      .slice(1)
      .find((resident) => resident.homeLocationId === first.homeLocationId);
    assert.ok(second && second.residentId !== first.residentId);
    const left = request({
      world,
      resident: first,
      actionType: "TALK",
      parameters: { participantId: second.actorRef.actorId },
      key: "talk-race-left",
    });
    const right = request({
      world,
      resident: second,
      actionType: "TALK",
      parameters: { participantId: first.actorRef.actorId },
      key: "talk-race-right",
    });
    const results = await Promise.all(
      [left, right].map((talk) =>
        executeResidentActionRequest(db, {
          request: talk,
          validationContext: context(world, [first, second]),
        }),
      ),
    );
    const winners = results.filter(
      ({ outcome }) => outcome.status === "COMMITTED",
    );
    assert.equal(winners.length, 1);
    const winner = winners[0];
    assert.ok(winner);
    const [busyCount] = await client`
      select count(*)::int as count from resident_runtime_states
      where world_id = ${world.id} and current_activity = 'TALKING'
    `;
    assert.equal(busyCount.count, 2);

    await client.end({ timeout: 5 });
    handle = createDb();
    ({ db, client } = handle);
    world.worldTime = new Date("2026-09-14T00:15:00.000Z");
    await setWorldTime(client, world.id, world.worldTime);
    const driver = createDeterministicSimulationDriver(db);
    const step = await driver.processDueWork(world.id);
    assert.equal(step.completedActivities, 1);
    assert.equal(
      (
        await completeResidentAction(db, {
          worldId: world.id,
          actionRequestId: winner.requestId,
        })
      ).disposition,
      "REUSED",
    );
    const [remainingTalkers] = await client`
      select count(*)::int as count from resident_runtime_states
      where world_id = ${world.id} and current_activity = 'TALKING'
    `;
    assert.equal(remainingTalkers.count, 0);
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("M3 live EAT/WORK/TALK projection equals full, suffix, and genesis replay", async () => {
  let handle = createDb();
  let { db, client } = handle;
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const seed = generateResidentSeed({ worldId: world.id, seed: world.seed });
    const eatResident = seed.residents.find(
      ({ resources }) => resources.foodUnits > 0,
    );
    assert.ok(eatResident);
    const talkParticipant = seed.residents
      .slice(1)
      .find(
        (resident) =>
          resident.residentId !== eatResident.residentId &&
          resident.homeLocationId === eatResident.homeLocationId,
      );
    const worker = seed.residents.find(
      ({ employment, residentId }) =>
        residentId !== eatResident.residentId &&
        residentId !== talkParticipant?.residentId &&
        employment.status === "EMPLOYED",
    );
    assert.ok(
      talkParticipant && worker && worker.employment.status === "EMPLOYED",
    );

    const [resource] = await client`
      select item_id from resident_resource_states
      where world_id = ${world.id} and resident_id = ${eatResident.residentId}
    `;
    const eat = request({
      world,
      resident: eatResident,
      actionType: "EAT",
      parameters: { itemId: resource.item_id, quantity: 1 },
      key: "replay-eat",
    });
    const eatStarted = await executeResidentActionRequest(db, {
      request: eat,
      validationContext: context(world, [eatResident]),
      expectedResourceVersion: 0,
    });
    assert.equal(
      eatStarted.outcome.status,
      "COMMITTED",
      JSON.stringify(eatStarted.outcome),
    );
    world.worldTime = new Date("2026-09-14T00:30:00.000Z");
    await advanceWorldTimeTo(db, world.id, world.worldTime);
    await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: eat.id,
    });

    const talk = request({
      world,
      resident: eatResident,
      actionType: "TALK",
      parameters: { participantId: talkParticipant.actorRef.actorId },
      key: "replay-talk",
      expectedActorVersion: 2,
    });
    await executeResidentActionRequest(db, {
      request: talk,
      validationContext: context(world, [eatResident, talkParticipant]),
    });
    world.worldTime = new Date("2026-09-14T00:45:00.000Z");
    await advanceWorldTimeTo(db, world.id, world.worldTime);
    await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: talk.id,
    });

    const move = request({
      world,
      resident: worker,
      actionType: "MOVE",
      parameters: { destinationId: worker.employment.workplaceId },
      key: "replay-work-commute",
    });
    await executeResidentActionRequest(db, {
      request: move,
      validationContext: context(world, [worker]),
    });
    const workplace = getFirstStreetLocationFixtures(world.id).find(
      ({ id }) => id === worker.employment.workplaceId,
    );
    assert.ok(workplace);
    const commuteMinutes = getTravelDurationWorldMinutes(
      "HOME",
      workplace.kind,
    );
    world.worldTime = new Date(
      world.worldTime.getTime() + commuteMinutes * 60_000,
    );
    await advanceWorldTimeTo(db, world.id, world.worldTime);
    await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: move.id,
    });
    world.worldTime = new Date("2026-09-14T09:00:00.000Z");
    await advanceWorldTimeTo(db, world.id, world.worldTime);
    const work = request({
      world,
      resident: worker,
      actionType: "WORK",
      parameters: { workplaceId: worker.employment.workplaceId },
      key: "replay-work",
      expectedActorVersion: 2,
    });
    await executeResidentActionRequest(db, {
      request: work,
      validationContext: context(world, [worker]),
    });
    world.worldTime = new Date("2026-09-14T17:00:00.000Z");
    await advanceWorldTimeTo(db, world.id, world.worldTime);
    await completeResidentAction(db, {
      worldId: world.id,
      actionRequestId: work.id,
      expectedStateVersion: 3,
    });

    const events = await readM3Events(client, world.id);
    const live = await readLiveM3Projection(client, world, seed);
    const full = replayM3ResidentProjection({
      worldId: world.id,
      initialWorldTime: START_TIME,
      seed,
      events,
    });
    const prefixLength =
      events.findIndex((event) => event.type === "RESIDENT_TALK_COMPLETED") + 1;
    assert.ok(prefixLength > 0);
    const prefix = replayM3ResidentProjection({
      worldId: world.id,
      initialWorldTime: START_TIME,
      seed,
      events: events.slice(0, prefixLength),
    });
    const suffix = replayM3ResidentProjectionFromCheckpoint({
      checkpoint: {
        worldId: world.id,
        worldSeq: BigInt(prefix.worldSeq),
        checksum: projectionHash(prefix),
        snapshot: prefix,
      },
      events: events.slice(prefixLength),
    });
    const genesis = replayM3ResidentProjection({
      worldId: world.id,
      initialWorldTime: START_TIME,
      seed,
      events,
    });
    assert.deepEqual(projectionHash(live), projectionHash(full));
    assert.deepEqual(projectionHash(live), projectionHash(suffix));
    assert.deepEqual(projectionHash(live), projectionHash(genesis));
    assert.equal(
      live.residents.find(
        ({ residentId }) => residentId === eatResident.residentId,
      )?.foodUnits,
      eatResident.resources.foodUnits - 1,
    );
    assert.equal(
      live.residents.find(({ residentId }) => residentId === worker.residentId)
        ?.completedWorkShiftKeys.length,
      1,
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});
