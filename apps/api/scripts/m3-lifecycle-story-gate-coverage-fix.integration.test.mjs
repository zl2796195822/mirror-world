import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  acknowledgeScheduledWake,
  acquireSimulationDriverLease,
  bootstrapResidentRuntimeStates,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  getResidentFoodItemId,
  readDueScheduledWakes,
} from "@mirror/db";
import {
  createResidentNeedAnchorStore,
  runResidentActionLoopStepV2,
} from "@mirror/life-engine";
import {
  advanceWorldTimeTo,
  createDeterministicSimulationDriver,
  createPostgresObservationQuery,
  deriveWorkPreparationBoundary,
  executeResidentActionRequest,
  getTravelDurationWorldMinutes,
  registerNextWorkPreparationWakes,
} from "@mirror/world-kernel";

const START_TIME = new Date("2026-09-07T00:00:00.000Z");
const PREPARATION_TIME = new Date("2026-09-07T08:45:00.000Z");
const SHIFT_START = new Date("2026-09-07T09:00:00.000Z");
const SHIFT_END = new Date("2026-09-07T17:00:00.000Z");

function worldRecord(id, worldTime = START_TIME, status = "RUNNING") {
  return {
    id,
    name: "M3 coverage-fix integration",
    timezone: "UTC",
    status,
    seed: `m3-coverage-fix-${id}`,
    worldTime,
    clockAnchorAt: worldTime,
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
          : location.kind === "OFFICE"
            ? ["WORK"]
            : location.kind === "STORE"
              ? ["SHOP"]
              : [],
  }));
}

function validationContext(world, residents) {
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
      balanceCents: resident.resources.cashCents,
      ...(resident.employment.workplaceId
        ? { employmentWorkplaceId: resident.employment.workplaceId }
        : {}),
    })),
    locations: locationsFor(world.id),
    items: [],
  };
}

function request(world, resident, actionType, parameters, key, version = 0) {
  const id = randomUUID();
  return {
    id,
    worldId: world.id,
    actorId: resident.actorRef.actorId,
    actionType,
    parameters,
    requestedBy: "RULE",
    idempotencyKey: `m3-coverage-fix|${key}`,
    expectedActorVersion: version,
    requestedAtWorldTime: world.worldTime.toISOString(),
    traceId: `m3-coverage-fix|${id}`,
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

async function cleanup(client, worldId) {
  await client`delete from simulation_checkpoints where world_id = ${worldId}`;
  await client`delete from kernel_action_outcome_events where world_id = ${worldId}`;
  await client`delete from kernel_action_outcomes where world_id = ${worldId}`;
  await client`delete from action_requests where world_id = ${worldId}`;
  await client`delete from scheduled_wake_registrations where world_id = ${worldId}`;
  await client`delete from resident_resource_states where world_id = ${worldId}`;
  await client`delete from resident_runtime_states where world_id = ${worldId}`;
}

async function readRuntime(client, worldId, residentId) {
  const [row] = await client`
    select current_location_id, current_activity, state_version,
      activity_due_at_world_time
    from resident_runtime_states
    where world_id = ${worldId} and resident_id = ${residentId}
  `;
  assert.ok(row);
  return row;
}

async function readEvents(client, worldId) {
  return client`
    select type, actor_id, payload, occurred_at
    from world_events
    where world_id = ${worldId}
    order by seq
  `;
}

function loopObservation(snapshot) {
  assert.equal(snapshot.actorRef.status, "AVAILABLE");
  assert.equal(snapshot.location.status, "AVAILABLE");
  assert.equal(snapshot.activity.status, "AVAILABLE");
  assert.equal(snapshot.workObligation.status, "AVAILABLE");
  assert.equal(snapshot.resources.status, "AVAILABLE");
  const location = snapshot.location.location;
  const activity = snapshot.activity.activity;
  const obligation = snapshot.workObligation.obligation;
  const workplace = getFirstStreetLocationFixtures(snapshot.worldId).find(
    ({ id }) => id === snapshot.self.employment.workplaceId,
  );
  const workPreparation =
    snapshot.self.employment.status === "EMPLOYED" &&
    obligation.status === "NOT_DUE" &&
    workplace &&
    workplace.id !== location.locationId
      ? deriveWorkPreparationBoundary({
          currentWorldTime: new Date(snapshot.worldTime),
          currentLocationKind: location.kind,
          workplaceKind: workplace.kind,
        })
      : undefined;
  return {
    residentId: snapshot.subjectResidentId,
    actorId: snapshot.actorRef.actorRef.actorId,
    homeLocationId: snapshot.self.homeLocationId,
    workplaceId: snapshot.self.employment.workplaceId,
    locationId: location.locationId,
    locationKind: location.kind,
    activityKind: activity.kind,
    obligation: {
      status: obligation.status,
      workplaceId: obligation.workplaceId,
      startsAtWorldTime: obligation.startsAtWorldTime
        ? new Date(obligation.startsAtWorldTime)
        : null,
      endsAtWorldTime: obligation.endsAtWorldTime
        ? new Date(obligation.endsAtWorldTime)
        : null,
      completedWorkShiftKeys: obligation.completedWorkShiftKeys ?? [],
    },
    ...(workPreparation
      ? {
          workPreparation: {
            boundaryWorldTime: workPreparation.preparationWorldTime,
            travelDurationWorldMinutes:
              workPreparation.travelDurationWorldMinutes,
          },
        }
      : {}),
    eatCapable: location.kind === "HOME" || location.kind === "CAFE",
    workCapable: location.kind === "OFFICE",
    resources: snapshot.resources.snapshot,
    foodItems: [
      {
        itemId: snapshot.resources.snapshot.itemId,
        locationId: snapshot.resources.snapshot.locationId,
        foodUnits: snapshot.resources.snapshot.foodUnits,
        resourceVersion: snapshot.resources.snapshot.version,
        worldId: snapshot.resources.snapshot.worldId,
        residentId: snapshot.resources.snapshot.residentId,
      },
    ],
    nearbyResidents: [],
    profile: snapshot.self.profile,
  };
}

function actionLoopObservation(snapshot, stateVersion) {
  return { ...loopObservation(snapshot), stateVersion };
}

test("bootstrap preparation wakes are wide, durable, restart-safe, and deduped", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const first = await registerNextWorkPreparationWakes(db, {
      worldId: world.id,
    });
    const second = await registerNextWorkPreparationWakes(db, {
      worldId: world.id,
    });
    const fixture = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    });
    const fixtures = getFirstStreetLocationFixtures(world.id);
    const preparation = first.filter(({ dedupeKey }) =>
      dedupeKey.includes("|WORK_PREPARATION|"),
    );
    assert.equal(preparation.length, 26);
    assert.equal(first.length, 52);
    assert.deepEqual(second, first);
    assert.ok(
      preparation.every(({ dueWorldTime, residentId, wakeReason }) => {
        const resident = fixture.residents.find(
          ({ residentId: id }) => id === residentId,
        );
        const workplace = fixtures.find(
          ({ id }) => id === resident?.employment.workplaceId,
        );
        assert.ok(resident && workplace);
        const expected = deriveWorkPreparationBoundary({
          currentWorldTime: START_TIME,
          currentLocationKind: "HOME",
          workplaceKind: workplace.kind,
        });
        return (
          dueWorldTime === expected.preparationWorldTime.toISOString() &&
          wakeReason === "WORK_BOUNDARY"
        );
      }),
    );

    const due = await readDueScheduledWakes(db, {
      worldId: world.id,
      targetWorldTime: PREPARATION_TIME,
      limit: 30,
    });
    assert.ok(due.length > 0 && due.length < preparation.length);
    assert.equal(
      await acknowledgeScheduledWake(db, {
        worldId: world.id,
        wakeId: due[0].wakeId,
      }),
      true,
    );

    const restarted = createDb();
    try {
      const afterRestart = await readDueScheduledWakes(restarted.db, {
        worldId: world.id,
        targetWorldTime: PREPARATION_TIME,
        limit: 30,
      });
      assert.equal(afterRestart.length, due.length - 1);
      assert.equal(
        new Set(afterRestart.map(({ wakeId }) => wakeId)).size,
        afterRestart.length,
      );
    } finally {
      await restarted.client.end({ timeout: 5 });
    }
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("real preparation wake drives MOVE, arrival, exact WORK, and completion", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  const query = createPostgresObservationQuery(db);
  const driver = createDeterministicSimulationDriver(db);
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const fixtures = getFirstStreetLocationFixtures(world.id);
    const resident = residents.find(
      ({ employment }) =>
        employment.status === "EMPLOYED" &&
        fixtures.find(({ id }) => id === employment.workplaceId)?.kind ===
          "OFFICE",
    );
    assert.ok(resident);
    const anchors = createResidentNeedAnchorStore();
    anchors.seed(resident.residentId, {
      worldTime: START_TIME,
      activity: "AWAKE",
      hungerPressure: 20,
      restPressure: 20,
      socialPressure: 20,
    });
    await registerNextWorkPreparationWakes(db, { worldId: world.id });
    const prepStep = await driver.runUntil(world.id, PREPARATION_TIME);
    const prepWake = prepStep.wakeItems.find(
      ({ residentId, wakeReason }) =>
        residentId === resident.residentId && wakeReason === "WORK_BOUNDARY",
    );
    assert.ok(prepWake);
    assert.equal(prepWake.dueWorldTime, PREPARATION_TIME.toISOString());
    for (const wake of prepStep.wakeItems) {
      if (wake.wakeId) {
        await acknowledgeScheduledWake(db, {
          worldId: world.id,
          wakeId: wake.wakeId,
        });
      }
    }
    const snapshot = await query.getResidentObservation({
      worldId: world.id,
      residentId: resident.residentId,
    });
    const observation = actionLoopObservation(snapshot, 0);
    const move = await runResidentActionLoopStepV2({
      world: {
        id: world.id,
        seed: world.seed,
        status: "RUNNING",
        worldTime: PREPARATION_TIME,
        worldSeq: snapshot.sourceWorldSeq,
      },
      observation,
      locations: locationsFor(world.id),
      needAnchors: anchors.store,
      submission: {
        async submit(actionRequest) {
          const execution = await executeResidentActionRequest(db, {
            request: actionRequest,
            validationContext: validationContext(world, residents),
          });
          return {
            disposition: execution.disposition,
            request: actionRequest,
            outcome: execution.outcome,
          };
        },
      },
      decisionEpoch: prepWake.decisionEpoch,
      seed: world.seed,
    });
    assert.equal(
      move.goalEvaluation.selectedGoal?.reasonCode,
      "WORK_PREPARATION",
    );
    assert.equal(move.decision.selectedCandidate?.actionType, "MOVE");
    assert.equal(move.submission?.outcome?.status, "COMMITTED");
    assert.equal(
      move.submission?.outcome?.eventRefs[0]?.type,
      "RESIDENT_MOVE_STARTED",
    );

    const arrivalStep = await driver.runUntil(world.id, SHIFT_START);
    assert.equal(arrivalStep.completedActivities, 1);
    assert.ok(
      arrivalStep.completionOutcomes.some(
        (outcome) => outcome.requestId === move.submission?.request.id,
      ),
    );
    const arrived = await readRuntime(client, world.id, resident.residentId);
    assert.equal(arrived.current_location_id, resident.employment.workplaceId);
    assert.equal(arrived.current_activity, "IDLE");

    for (const wake of arrivalStep.wakeItems) {
      if (wake.wakeId) {
        await acknowledgeScheduledWake(db, {
          worldId: world.id,
          wakeId: wake.wakeId,
        });
      }
    }
    const workSnapshot = await query.getResidentObservation({
      worldId: world.id,
      residentId: resident.residentId,
    });
    const workObservation = actionLoopObservation(
      workSnapshot,
      arrived.state_version,
    );
    const work = await runResidentActionLoopStepV2({
      world: {
        id: world.id,
        seed: world.seed,
        status: "RUNNING",
        worldTime: SHIFT_START,
        worldSeq: workSnapshot.sourceWorldSeq,
      },
      observation: workObservation,
      locations: locationsFor(world.id),
      needAnchors: anchors.store,
      submission: {
        async submit(actionRequest) {
          const execution = await executeResidentActionRequest(db, {
            request: actionRequest,
            validationContext: validationContext(world, residents),
          });
          return {
            disposition: execution.disposition,
            request: actionRequest,
            outcome: execution.outcome,
          };
        },
      },
      decisionEpoch: prepWake.decisionEpoch + 1,
      seed: world.seed,
    });
    assert.equal(work.decision.selectedCandidate?.actionType, "WORK");
    assert.equal(work.submission?.outcome?.status, "COMMITTED");

    await driver.runUntil(world.id, SHIFT_END);
    const events = await readEvents(client, world.id);
    const workStarted = events.find(
      ({ type, payload }) =>
        type === "RESIDENT_WORK_STARTED" &&
        payload.actionRequestId === work.submission?.request.id,
    );
    const workCompleted = events.find(
      ({ type, payload }) =>
        type === "RESIDENT_WORK_COMPLETED" &&
        payload.actionRequestId === work.submission?.request.id,
    );
    assert.ok(workStarted && workCompleted);
    assert.equal(
      workStarted.payload.startedAtWorldTime,
      SHIFT_START.toISOString(),
    );
    assert.equal(
      workCompleted.payload.completedAtWorldTime,
      SHIFT_END.toISOString(),
    );
    assert.equal(workCompleted.payload.attendanceMinutes, 480);
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("10/15-minute routes meet the same exact shift boundary", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), new Date("2026-09-07T08:45:00.000Z"));
  const driver = createDeterministicSimulationDriver(db);
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents.filter(({ employment }) => employment.status === "EMPLOYED");
    const office = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "OFFICE",
    );
    const cafe = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "CAFE",
    );
    assert.ok(office && cafe);
    assert.equal(getTravelDurationWorldMinutes("HOME", "OFFICE"), 15);
    assert.equal(getTravelDurationWorldMinutes("HOME", "CAFE"), 10);
    const officeResident = residents[0];
    const cafeResident = residents[1];
    const officeMove = request(
      world,
      officeResident,
      "MOVE",
      { destinationId: office.id },
      "move-15",
    );
    const officeStarted = await executeResidentActionRequest(db, {
      request: officeMove,
      validationContext: validationContext(world, residents),
    });
    assert.equal(officeStarted.outcome.status, "COMMITTED");
    assert.equal(
      officeStarted.outcome.eventRefs[0].type,
      "RESIDENT_MOVE_STARTED",
    );
    await advanceWorldTimeTo(
      db,
      world.id,
      new Date("2026-09-07T08:50:00.000Z"),
    );
    const cafeMove = request(
      { ...world, worldTime: new Date("2026-09-07T08:50:00.000Z") },
      cafeResident,
      "MOVE",
      { destinationId: cafe.id },
      "move-10",
    );
    const cafeStarted = await executeResidentActionRequest(db, {
      request: cafeMove,
      validationContext: validationContext(world, residents),
    });
    assert.equal(cafeStarted.outcome.status, "COMMITTED");
    await driver.runUntil(world.id, SHIFT_START);
    const events = await readEvents(client, world.id);
    const starts = events.filter(
      ({ type }) => type === "RESIDENT_MOVE_STARTED",
    );
    const completions = events.filter(
      ({ type }) => type === "RESIDENT_MOVE_COMPLETED",
    );
    assert.equal(starts.length, 2);
    assert.equal(completions.length, 2);
    assert.ok(
      starts.some(
        ({ payload }) =>
          payload.durationWorldMinutes === 15 &&
          payload.dueAtWorldTime === SHIFT_START.toISOString(),
      ),
    );
    assert.ok(
      starts.some(
        ({ payload }) =>
          payload.durationWorldMinutes === 10 &&
          payload.dueAtWorldTime === SHIFT_START.toISOString(),
      ),
    );
    assert.ok(
      completions.every(
        ({ payload }) =>
          payload.completedAtWorldTime === SHIFT_START.toISOString(),
      ),
    );
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("09:01 is LATE and cannot start WORK", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), new Date("2026-09-07T09:01:00.000Z"));
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const resident = residents.find(
      ({ employment }) => employment.status === "EMPLOYED",
    );
    assert.ok(resident);
    await client`
      update resident_runtime_states
      set current_location_id = ${resident.employment.workplaceId},
          state_version = 1
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;
    const work = request(
      world,
      resident,
      "WORK",
      { workplaceId: resident.employment.workplaceId },
      "late-work",
      1,
    );
    const result = await executeResidentActionRequest(db, {
      request: work,
      validationContext: validationContext(world, residents),
    });
    assert.equal(result.outcome.status, "REJECTED");
    assert.equal(result.outcome.reasonCode, "KERNEL_INVALID_ACTION");
    const events = await readEvents(client, world.id);
    assert.equal(events.length, 0);
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("EAT keeps positive-resource completion and zero-resource infeasibility truthful", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID());
  const driver = createDeterministicSimulationDriver(db);
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const positive = residents.find(({ resources }) => resources.foodUnits > 0);
    const zero = residents.find(({ resources }) => resources.foodUnits === 0);
    assert.ok(positive && zero);
    const zeroEat = request(
      world,
      zero,
      "EAT",
      { itemId: getResidentFoodItemId(world.id, zero.residentId), quantity: 1 },
      "zero-food",
    );
    const zeroResult = await executeResidentActionRequest(db, {
      request: zeroEat,
      validationContext: validationContext(world, residents),
      expectedResourceVersion: 0,
    });
    assert.equal(zeroResult.outcome.status, "REJECTED");
    assert.equal(zeroResult.outcome.reasonCode, "KERNEL_INSUFFICIENT_RESOURCE");

    const positiveEat = request(
      world,
      positive,
      "EAT",
      {
        itemId: getResidentFoodItemId(world.id, positive.residentId),
        quantity: 1,
      },
      "positive-food",
    );
    const positiveResult = await executeResidentActionRequest(db, {
      request: positiveEat,
      validationContext: validationContext(world, residents),
      expectedResourceVersion: 0,
    });
    assert.equal(positiveResult.outcome.status, "COMMITTED");
    await driver.runUntil(world.id, new Date("2026-09-07T00:30:00.000Z"));

    const events = await readEvents(client, world.id);
    assert.equal(
      events.filter(({ type }) => type === "RESIDENT_EAT_COMPLETED").length,
      1,
    );
    const [zeroResource] = await client`
      select food_units, resource_version
      from resident_resource_states
      where world_id = ${world.id} and resident_id = ${zero.residentId}
    `;
    assert.deepEqual(zeroResource, { food_units: 0, resource_version: 0 });
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("weekend, unemployed, workplace, busy, pause, and maintenance stay bounded", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), new Date("2026-09-12T08:00:00.000Z"));
  const driver = createDeterministicSimulationDriver(db);
  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });
    const fixture = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    });
    const employed = fixture.residents.find(
      ({ employment }) => employment.status === "EMPLOYED",
    );
    const unemployed = fixture.residents.find(
      ({ employment }) => employment.status === "UNEMPLOYED",
    );
    assert.ok(employed && unemployed);
    await client`
      update resident_runtime_states
      set current_location_id = ${employed.employment.workplaceId},
          state_version = state_version + 1
      where world_id = ${world.id} and resident_id = ${employed.residentId}
    `;
    const weekendWakes = await registerNextWorkPreparationWakes(db, {
      worldId: world.id,
    });
    assert.equal(
      weekendWakes.some(
        ({ residentId, dedupeKey }) =>
          residentId === employed.residentId &&
          dedupeKey.includes("|WORK_PREPARATION|"),
      ),
      false,
    );
    const fixtures = getFirstStreetLocationFixtures(world.id);
    assert.ok(
      weekendWakes
        .filter(({ dedupeKey }) => dedupeKey.includes("|WORK_PREPARATION|"))
        .every(({ dueWorldTime, residentId }) => {
          const resident = fixture.residents.find(
            ({ residentId: id }) => id === residentId,
          );
          const workplace = fixtures.find(
            ({ id }) => id === resident?.employment.workplaceId,
          );
          assert.ok(resident && workplace);
          return (
            dueWorldTime ===
            deriveWorkPreparationBoundary({
              currentWorldTime: world.worldTime,
              currentLocationKind: "HOME",
              workplaceKind: workplace.kind,
            }).preparationWorldTime.toISOString()
          );
        }),
    );
    assert.equal(
      weekendWakes.some(
        ({ residentId }) => residentId === unemployed.residentId,
      ),
      false,
    );

    const busyResident = fixture.residents.find(
      ({ residentId }) =>
        residentId !== employed.residentId &&
        residentId !== unemployed.residentId &&
        residentId !== undefined,
    );
    assert.ok(busyResident);
    const sleep = request(world, busyResident, "SLEEP", {}, "busy-sleep");
    const sleepStarted = await executeResidentActionRequest(db, {
      request: sleep,
      validationContext: validationContext(world, fixture.residents),
    });
    assert.equal(sleepStarted.outcome.status, "COMMITTED");
    const busySnapshot = await createPostgresObservationQuery(
      db,
    ).getResidentObservation({
      worldId: world.id,
      residentId: busyResident.residentId,
    });
    const busyAnchors = createResidentNeedAnchorStore();
    busyAnchors.seed(busyResident.residentId, {
      worldTime: world.worldTime,
      activity: "AWAKE",
      hungerPressure: 20,
      restPressure: 20,
      socialPressure: 20,
    });
    let busySubmissionCount = 0;
    const busyDecision = await runResidentActionLoopStepV2({
      world: {
        id: world.id,
        seed: world.seed,
        status: "RUNNING",
        worldTime: world.worldTime,
        worldSeq: busySnapshot.sourceWorldSeq,
      },
      observation: actionLoopObservation(busySnapshot, 1),
      locations: locationsFor(world.id),
      needAnchors: busyAnchors.store,
      submission: {
        async submit() {
          busySubmissionCount += 1;
          throw new Error("busy resident must not submit an action");
        },
      },
    });
    assert.equal(busyDecision.decision.noActionReason, "RESIDENT_BUSY");
    assert.equal(busySubmissionCount, 0);

    const paused = await client`
      update worlds set status = 'PAUSED' where id = ${world.id}
      returning status
    `;
    assert.equal(paused[0].status, "PAUSED");
    const pausedStep = await driver.runUntil(
      world.id,
      new Date("2026-09-14T08:45:00.000Z"),
    );
    assert.equal(pausedStep.processedWork, 0);
    const [wakeBeforeResume] = await client`
      select count(*)::int as count from scheduled_wake_registrations
      where world_id = ${world.id}
        and dedupe_key like '%|WORK_PREPARATION|%'
    `;
    assert.ok(wakeBeforeResume.count > 0);

    await client`update worlds set status = 'MAINTENANCE' where id = ${world.id}`;
    const maintenanceStep = await driver.runUntil(
      world.id,
      new Date("2026-09-14T08:45:00.000Z"),
    );
    assert.equal(maintenanceStep.processedWork, 0);
  } finally {
    await cleanup(client, world.id);
    await client.end({ timeout: 5 });
  }
});

test("stale driver fencing and world isolation remain enforced", async () => {
  const { db, client } = createDb();
  const worldA = worldRecord(randomUUID());
  const worldB = worldRecord(randomUUID());
  try {
    await insertWorld(client, worldA);
    await insertWorld(client, worldB);
    await bootstrapResidentRuntimeStates(db, { worldId: worldA.id });
    await bootstrapResidentRuntimeStates(db, { worldId: worldB.id });
    await registerNextWorkPreparationWakes(db, { worldId: worldA.id });
    await registerNextWorkPreparationWakes(db, { worldId: worldB.id });
    const [aCount, bCount] = await Promise.all([
      client`
        select count(*)::int as count from scheduled_wake_registrations
        where world_id = ${worldA.id}
      `,
      client`
        select count(*)::int as count from scheduled_wake_registrations
        where world_id = ${worldB.id}
      `,
    ]);
    assert.equal(aCount[0].count, 52);
    assert.equal(bCount[0].count, 52);
    const oldLease = await acquireSimulationDriverLease(db, {
      worldId: worldA.id,
      ownerId: "coverage-fix-old-driver",
    });
    await acquireSimulationDriverLease(db, {
      worldId: worldA.id,
      ownerId: "coverage-fix-new-driver",
    });
    const staleDriver = createDeterministicSimulationDriver(db, {
      lease: oldLease,
    });
    await assert.rejects(
      staleDriver.runUntil(worldA.id, PREPARATION_TIME),
      (error) => error?.code === "STALE_FENCE",
    );
    await assert.rejects(
      staleDriver.runUntil(worldB.id, PREPARATION_TIME),
      (error) => error?.code === "WORLD_NOT_FOUND",
    );
  } finally {
    await cleanup(client, worldA.id);
    await cleanup(client, worldB.id);
    await client.end({ timeout: 5 });
  }
});
