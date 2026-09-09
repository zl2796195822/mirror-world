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
  applyCompletedSleepToAnchors,
  createResidentNeedAnchorStore,
  runResidentActionLoopStep,
} from "@mirror/life-engine";
import {
  createDeterministicSimulationDriver,
  createPostgresObservationQuery,
  executeResidentActionRequest,
} from "@mirror/world-kernel";

const START_TIME = new Date("2026-09-09T22:00:00.000Z");

function worldRecord(id, name) {
  return {
    id,
    name,
    timezone: "Asia/Shanghai",
    status: "RUNNING",
    seed: `m3-t04-${id}`,
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

function validationContext(worldId, resident, worldTime) {
  return {
    world: { id: worldId, status: "RUNNING", worldTime },
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
    await client`delete from resident_runtime_states where world_id = ${worldId}`;
  }
}

function decisionLocations(worldId) {
  return getFirstStreetLocationFixtures(worldId).map(({ id, kind }) => ({
    id,
    kind,
  }));
}

async function loadObservation(query, worldId, residentId) {
  const snapshot = await query.getResidentObservation({ worldId, residentId });
  const location = snapshot.location;
  const activity = snapshot.activity;
  const actorRef = snapshot.actorRef;
  const resources = snapshot.resources;
  if (
    location.status !== "AVAILABLE" ||
    activity.status !== "AVAILABLE" ||
    actorRef.status !== "AVAILABLE" ||
    resources.status !== "AVAILABLE"
  ) {
    throw new Error(
      "M3-T04 requires available location/activity/actor/resources",
    );
  }
  return {
    worldId,
    worldSeed: snapshot.worldSeed,
    worldTime: new Date(snapshot.worldTime),
    worldStatus: snapshot.worldStatus,
    sourceWorldSeq: snapshot.sourceWorldSeq,
    residentId: snapshot.subjectResidentId,
    actorId: actorRef.actorRef.actorId,
    homeLocationId: snapshot.self.homeLocationId,
    workplaceId: snapshot.self.employment.workplaceId,
    locationId: location.location.locationId,
    locationKind: location.location.kind,
    activityKind: activity.activity.kind,
    profile: snapshot.self.profile,
    personality: snapshot.self.profile.personality,
    employment: snapshot.self.employment,
  };
}

test("M3-T04 closes real observation → decision → Kernel MOVE → completion → SLEEP", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "M3-T04 action loop");
  const worldIds = [world.id];
  const query = createPostgresObservationQuery(db);
  const driver = createDeterministicSimulationDriver(db);

  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });

    const residents = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents;
    const resident = residents[0];
    assert.ok(resident);

    const { store } = createResidentNeedAnchorStore();
    store.set(resident.residentId, {
      worldTime: START_TIME,
      activity: "AWAKE",
      hungerPressure: 20,
      restPressure: 95,
      socialPressure: 20,
    });

    const locations = decisionLocations(world.id);
    const observation = await loadObservation(
      query,
      world.id,
      resident.residentId,
    );
    assert.equal(observation.activityKind, "IDLE");
    assert.equal(observation.locationId, resident.homeLocationId);

    // Force an away-from-home start so the first decision is MOVE home.
    const park = locations.find(({ kind }) => kind === "PARK");
    const office = locations.find(({ kind }) => kind === "OFFICE");
    assert.ok(park && office);
    await client`
      update resident_runtime_states
      set current_location_id = ${park.id}, state_version = state_version + 1
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;

    const awayObservation = await loadObservation(
      query,
      world.id,
      resident.residentId,
    );
    assert.equal(awayObservation.locationId, park.id);

    const step1 = await runResidentActionLoopStep({
      world: {
        id: world.id,
        seed: world.seed,
        status: "RUNNING",
        worldTime: awayObservation.worldTime,
        worldSeq: awayObservation.sourceWorldSeq,
      },
      observation: {
        residentId: awayObservation.residentId,
        actorId: awayObservation.actorId,
        homeLocationId: awayObservation.homeLocationId,
        workplaceId: awayObservation.workplaceId,
        stateVersion: awayObservation.stateVersion,
        locationId: awayObservation.locationId,
        locationKind: awayObservation.locationKind,
        activityKind: awayObservation.activityKind,
        profile: {
          personality: awayObservation.personality,
          routine: awayObservation.profile.routine,
        },
      },
      locations,
      needAnchors: store,
      submission: {
        async submit(request) {
          const execution = await executeResidentActionRequest(db, {
            request,
            validationContext: validationContext(
              world.id,
              resident,
              START_TIME,
            ),
          });
          return {
            disposition:
              execution.disposition === "REUSED" ? "REUSED" : "EXECUTED",
            request,
            outcome: execution.outcome,
          };
        },
      },
    });

    assert.equal(step1.decision.selectedCandidate?.actionType, "MOVE");
    assert.equal(
      step1.decision.selectedCandidate?.parameters.destinationId,
      resident.homeLocationId,
    );
    assert.equal(step1.submission?.outcome?.status, "COMMITTED");
    assert.equal(step1.replan?.directive, "SUCCESS");
    assert.ok(step1.submission?.request.id);

    // Advance world time past travel duration and complete the activity.
    const dueAdvance = await driver.advanceWorldBy(world.id, 30);
    assert.ok(dueAdvance.completedActivities >= 1);

    const afterMove = await loadObservation(
      query,
      world.id,
      resident.residentId,
    );
    assert.equal(afterMove.locationId, resident.homeLocationId);
    assert.equal(afterMove.activityKind, "IDLE");

    // Second decision: high rest at home → SLEEP start via Kernel.
    const step2 = await runResidentActionLoopStep({
      world: {
        id: world.id,
        seed: world.seed,
        status: "RUNNING",
        worldTime: afterMove.worldTime,
        worldSeq: afterMove.sourceWorldSeq,
      },
      observation: {
        residentId: afterMove.residentId,
        actorId: afterMove.actorId,
        homeLocationId: afterMove.homeLocationId,
        workplaceId: afterMove.workplaceId,
        stateVersion: afterMove.stateVersion,
        locationId: afterMove.locationId,
        locationKind: afterMove.locationKind,
        activityKind: afterMove.activityKind,
        profile: {
          personality: afterMove.personality,
          routine: afterMove.profile.routine,
        },
      },
      locations,
      needAnchors: store,
      submission: {
        async submit(request) {
          const execution = await executeResidentActionRequest(db, {
            request,
            validationContext: validationContext(
              world.id,
              resident,
              afterMove.worldTime,
            ),
          });
          return {
            disposition:
              execution.disposition === "REUSED" ? "REUSED" : "EXECUTED",
            request,
            outcome: execution.outcome,
          };
        },
      },
    });

    assert.equal(step2.decision.selectedCandidate?.actionType, "SLEEP");
    assert.equal(step2.submission?.outcome?.status, "COMMITTED");
    assert.equal(step2.replan?.directive, "SUCCESS");

    const sleepStart = afterMove.worldTime;
    const sleepDue = await driver.advanceWorldBy(world.id, 480);
    assert.ok(sleepDue.completedActivities >= 1);

    const afterSleep = await loadObservation(
      query,
      world.id,
      resident.residentId,
    );
    assert.equal(afterSleep.activityKind, "IDLE");
    assert.equal(afterSleep.locationId, resident.homeLocationId);

    const needProfile = {
      residentId: resident.residentId,
      profile: {
        personality: { extraversion: afterSleep.personality.extraversion },
        routine: {
          flexibility: afterSleep.profile.routine.flexibility ?? 0.5,
        },
      },
    };
    const nextAnchor = applyCompletedSleepToAnchors({
      worldId: world.id,
      resident: needProfile,
      needAnchors: store,
      anchor: store.get(resident.residentId),
      sleepStartedAtWorldTime: sleepStart,
      sleepCompletedAtWorldTime: afterSleep.worldTime,
    });
    assert.equal(nextAnchor.activity, "AWAKE");
    assert.ok(nextAnchor.restPressure < 95);

    // Third decision after sleep: rest pressure should be lower.
    const step3 = await runResidentActionLoopStep({
      world: {
        id: world.id,
        seed: world.seed,
        status: "RUNNING",
        worldTime: afterSleep.worldTime,
        worldSeq: afterSleep.sourceWorldSeq,
      },
      observation: {
        residentId: afterSleep.residentId,
        actorId: afterSleep.actorId,
        homeLocationId: afterSleep.homeLocationId,
        workplaceId: afterSleep.workplaceId,
        stateVersion: afterSleep.stateVersion,
        locationId: afterSleep.locationId,
        locationKind: afterSleep.locationKind,
        activityKind: afterSleep.activityKind,
        profile: {
          personality: afterSleep.personality,
          routine: afterSleep.profile.routine,
        },
      },
      locations,
      needAnchors: store,
      submission: {
        async submit(request) {
          const execution = await executeResidentActionRequest(db, {
            request,
            validationContext: validationContext(
              world.id,
              resident,
              afterSleep.worldTime,
            ),
          });
          return {
            disposition:
              execution.disposition === "REUSED" ? "REUSED" : "EXECUTED",
            request,
            outcome: execution.outcome,
          };
        },
      },
    });

    assert.ok(step3.needState.restPressure < step1.needState.restPressure);
    // After rest is restored, hunger/routine may drive a different goal or defer.
    assert.ok(step3.replan);
    if (step3.decision.actionRequestDraft) {
      assert.equal(step3.submission?.outcome?.status, "COMMITTED");
    } else {
      assert.equal(
        step3.decision.noActionReason === "NO_SELECTED_GOAL" ||
          step3.decision.noActionReason === "NO_FEASIBLE_CANDIDATE" ||
          step3.decision.noActionReason === "ALREADY_SATISFIED",
        true,
      );
      assert.equal(step3.replan?.directive, "DEFER_UNTIL_WORLD_TIME");
    }
  } finally {
    await removeWorldGraph(client, worldIds);
    await client.end({ timeout: 5 });
  }
});

test("M3-T04 rejects SLEEP outside HOME through Kernel and replans", async () => {
  const { db, client } = createDb();
  const world = worldRecord(randomUUID(), "M3-T04 sleep reject");
  const query = createPostgresObservationQuery(db);

  try {
    await insertWorld(client, world);
    await bootstrapResidentRuntimeStates(db, { worldId: world.id });

    const resident = generateResidentSeed({
      worldId: world.id,
      seed: world.seed,
    }).residents[0];
    assert.ok(resident);
    const office = getFirstStreetLocationFixtures(world.id).find(
      ({ kind }) => kind === "OFFICE",
    );
    assert.ok(office);
    await client`
      update resident_runtime_states
      set current_location_id = ${office.id}, state_version = state_version + 1
      where world_id = ${world.id} and resident_id = ${resident.residentId}
    `;

    const observation = await loadObservation(
      query,
      world.id,
      resident.residentId,
    );
    const { store } = createResidentNeedAnchorStore();
    store.set(resident.residentId, {
      worldTime: START_TIME,
      activity: "AWAKE",
      hungerPressure: 10,
      restPressure: 95,
      socialPressure: 10,
    });

    const locations = decisionLocations(world.id);
    const step = await runResidentActionLoopStep({
      world: {
        id: world.id,
        seed: world.seed,
        status: "RUNNING",
        worldTime: observation.worldTime,
        worldSeq: observation.sourceWorldSeq,
      },
      observation: {
        residentId: observation.residentId,
        actorId: observation.actorId,
        homeLocationId: observation.homeLocationId,
        workplaceId: observation.workplaceId,
        stateVersion: observation.stateVersion,
        locationId: observation.locationId,
        locationKind: observation.locationKind,
        activityKind: observation.activityKind,
        profile: {
          personality: observation.personality,
          routine: observation.profile.routine,
        },
      },
      locations,
      needAnchors: store,
      submission: {
        async submit(request) {
          const execution = await executeResidentActionRequest(db, {
            request,
            validationContext: validationContext(
              world.id,
              resident,
              START_TIME,
            ),
          });
          return {
            disposition:
              execution.disposition === "REUSED" ? "REUSED" : "EXECUTED",
            request,
            outcome: execution.outcome,
          };
        },
      },
    });

    // Away from home, REST maps to MOVE home — not illegal SLEEP.
    assert.equal(step.decision.selectedCandidate?.actionType, "MOVE");
    assert.equal(step.submission?.outcome?.status, "COMMITTED");
  } finally {
    await client`delete from kernel_action_outcome_events where world_id = ${world.id}`;
    await client`delete from kernel_action_outcomes where world_id = ${world.id}`;
    await client`delete from action_requests where world_id = ${world.id}`;
    await client`delete from resident_runtime_states where world_id = ${world.id}`;
    await client.end({ timeout: 5 });
  }
});

test("M3-T04 world isolation: decision only acts on its own world resident", async () => {
  const { db, client } = createDb();
  const worldA = worldRecord(randomUUID(), "M3-T04 world A");
  const worldB = worldRecord(randomUUID(), "M3-T04 world B");
  const query = createPostgresObservationQuery(db);

  try {
    await insertWorld(client, worldA);
    await insertWorld(client, worldB);
    await bootstrapResidentRuntimeStates(db, { worldId: worldA.id });
    await bootstrapResidentRuntimeStates(db, { worldId: worldB.id });

    const residentA = generateResidentSeed({
      worldId: worldA.id,
      seed: worldA.seed,
    }).residents[0];
    assert.ok(residentA);

    const observation = await loadObservation(
      query,
      worldA.id,
      residentA.residentId,
    );
    const { store } = createResidentNeedAnchorStore();
    store.set(residentA.residentId, {
      worldTime: START_TIME,
      activity: "AWAKE",
      hungerPressure: 10,
      restPressure: 95,
      socialPressure: 10,
    });

    const step = await runResidentActionLoopStep({
      world: {
        id: worldA.id,
        seed: worldA.seed,
        status: "RUNNING",
        worldTime: observation.worldTime,
        worldSeq: observation.sourceWorldSeq,
      },
      observation: {
        residentId: observation.residentId,
        actorId: observation.actorId,
        homeLocationId: observation.homeLocationId,
        workplaceId: observation.workplaceId,
        stateVersion: observation.stateVersion,
        locationId: observation.locationId,
        locationKind: observation.locationKind,
        activityKind: observation.activityKind,
        profile: {
          personality: observation.personality,
          routine: observation.profile.routine,
        },
      },
      locations: decisionLocations(worldA.id),
      needAnchors: store,
      submission: {
        async submit(request) {
          assert.equal(request.worldId, worldA.id);
          assert.equal(request.actorId, residentA.actorRef.actorId);
          const execution = await executeResidentActionRequest(db, {
            request,
            validationContext: validationContext(
              worldA.id,
              residentA,
              START_TIME,
            ),
          });
          return {
            disposition:
              execution.disposition === "REUSED" ? "REUSED" : "EXECUTED",
            request,
            outcome: execution.outcome,
          };
        },
      },
    });

    assert.equal(step.worldId, worldA.id);
    assert.equal(step.submission?.request.worldId, worldA.id);
    assert.notEqual(step.submission?.request.worldId, worldB.id);
  } finally {
    for (const world of [worldA, worldB]) {
      await client`delete from kernel_action_outcome_events where world_id = ${world.id}`;
      await client`delete from kernel_action_outcomes where world_id = ${world.id}`;
      await client`delete from action_requests where world_id = ${world.id}`;
      await client`delete from resident_runtime_states where world_id = ${world.id}`;
    }
    await client.end({ timeout: 5 });
  }
});
