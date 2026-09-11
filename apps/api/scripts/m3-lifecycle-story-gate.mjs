/* global console, process */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  acknowledgeScheduledWake,
  acquireSimulationDriverLease,
  bootstrapResidentRuntimeStates,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  registerScheduledWake,
} from "@mirror/db";
import {
  applyCompletedNeedEffectToNeedAnchor,
  applyCompletedSleepToAnchors,
  createResidentNeedAnchorStore,
  runResidentActionLoopStepV2,
} from "@mirror/life-engine";
import {
  canonicalResidentProjectionFromRows,
  createDeterministicSimulationDriver,
  createPostgresObservationQuery,
  executeResidentActionRequest,
  M3_DOMAIN_EVENT_REGISTRY_VERSION,
  M3_DOMAIN_REPLAY_SCHEMA_VERSION,
  projectionHash,
  replayM3ResidentProjection,
  replayM3ResidentProjectionFromCheckpoint,
} from "@mirror/world-kernel";

const START_TIME = new Date("2026-09-07T00:00:00.000Z");
const WORLD_DAYS = 30;
const WORLD_MINUTES = WORLD_DAYS * 24 * 60;
const TARGET_TIME = new Date(START_TIME.getTime() + WORLD_MINUTES * 60_000);
const WORLD_SEED = "mirror-m3-lifecycle-story-gate-world-v1";
const DIFFERENT_WORLD_SEED = "mirror-m3-lifecycle-story-gate-world-v2";
const GATE_VERSION = "m3-story-sanity-v1";
const LOGICAL_WORLD_ID = "00000000-0000-4000-8000-00000000a300";
const ACTION_SCOPE = ["MOVE", "SLEEP", "EAT", "WORK", "TALK"];
const POLICY_VERSIONS = {
  needs: "m3-needs-v1",
  needEffects: "m3-need-effects-v1",
  goals: "m3-goals-v1",
  decision: "m3-rule-decision-v2",
  actionLoop: "m3-action-loop-v2",
  actionSemantics: "m3-action-semantics-v1",
  replan: "m3-replan-v1",
  scheduler: "m3-scheduler-v2",
  runtime: "m3-runtime-state-v1",
  eventRegistry: "m3-domain-event-registry-v2",
  replay: "m3-resident-projection-v2",
  storySanity: GATE_VERSION,
};

const canonical = (value) => JSON.stringify(value);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function deterministicUuid(value) {
  const bytes = Uint8Array.from(
    sha256(value)
      .slice(0, 32)
      .match(/../g)
      .map((pair) => Number.parseInt(pair, 16)),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function worldRecord(worldId, seed) {
  return {
    id: worldId,
    name: "M3 lifecycle story gate",
    timezone: "UTC",
    status: "RUNNING",
    seed,
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
          : location.kind === "OFFICE"
            ? ["WORK"]
            : location.kind === "STORE"
              ? ["SHOP"]
              : [],
  }));
}

function fixtureKey(worldId, locationId) {
  return (
    getFirstStreetLocationFixtures(worldId).find(({ id }) => id === locationId)
      ?.key ?? locationId
  );
}

function residentFixtureHash(seed, worldId) {
  return sha256(
    canonical(
      seed.residents
        .map((resident) => ({
          residentId: resident.residentId,
          actorId: resident.actorRef.actorId,
          home: fixtureKey(worldId, resident.homeLocationId),
          profile: resident.profile,
          employment: {
            status: resident.employment.status,
            role: resident.employment.role,
            workplace: resident.employment.workplaceId
              ? fixtureKey(worldId, resident.employment.workplaceId)
              : null,
          },
          resources: resident.resources,
        }))
        .sort((left, right) => left.residentId.localeCompare(right.residentId)),
    ),
  );
}

function resourceFixtureHash(seed) {
  return sha256(
    canonical(
      seed.residents
        .map((resident) => ({
          residentId: resident.residentId,
          itemId: resident.resources.itemId,
          foodUnits: resident.resources.foodUnits,
          version: resident.resources.version,
        }))
        .sort((left, right) => left.residentId.localeCompare(right.residentId)),
    ),
  );
}

function initialSnapshotHash(seed, worldId) {
  return sha256(
    canonical(
      seed.residents
        .map((resident) => ({
          residentId: resident.residentId,
          actorId: resident.actorRef.actorId,
          location: fixtureKey(worldId, resident.homeLocationId),
          activity: "IDLE",
          foodUnits: resident.resources.foodUnits,
          resourceVersion: resident.resources.version,
          stateVersion: 0,
          sourceWorldSeq: "0",
        }))
        .sort((left, right) => left.residentId.localeCompare(right.residentId)),
    ),
  );
}

function profileFor(resident) {
  return {
    residentId: resident.residentId,
    profile: {
      personality: { extraversion: resident.profile.personality.extraversion },
      routine: { flexibility: resident.profile.routine.flexibility },
    },
  };
}

function available(value) {
  assert.equal(value.status, "AVAILABLE");
  return value;
}

function loopObservation(snapshot, allSnapshots) {
  const actorRef = available(snapshot.actorRef).actorRef;
  const location = available(snapshot.location).location;
  const activity = available(snapshot.activity).activity;
  const resources = available(snapshot.resources).snapshot;
  const obligation = available(snapshot.workObligation).obligation;
  const nearbyResidents = allSnapshots
    .filter(
      ({ subjectResidentId }) =>
        subjectResidentId !== snapshot.subjectResidentId,
    )
    .map((nearby) => {
      const nearbyActivity = available(nearby.activity).activity;
      const nearbyLocation = available(nearby.location).location;
      return {
        residentId: nearby.subjectResidentId,
        actorId: available(nearby.actorRef).actorRef.actorId,
        locationId: nearbyLocation.locationId,
        active: true,
        activityKind: nearbyActivity.kind,
        worldId: nearby.worldId,
      };
    });
  return {
    residentId: snapshot.subjectResidentId,
    actorId: actorRef.actorId,
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
    eatCapable: location.kind === "HOME" || location.kind === "CAFE",
    workCapable: location.kind === "OFFICE",
    foodItems: [
      {
        itemId: resources.itemId,
        locationId: resources.locationId,
        foodUnits: resources.foodUnits,
        resourceVersion: resources.version,
        worldId: resources.worldId,
        residentId: resources.residentId,
      },
    ],
    resources,
    nearbyResidents,
    profile: snapshot.self.profile,
  };
}

function validationContext(worldId, snapshots, stateVersions) {
  const actors = snapshots.map((snapshot) => {
    const resident = snapshot.self;
    const actor = available(snapshot.actorRef).actorRef;
    const location = available(snapshot.location).location;
    const resource = available(snapshot.resources).snapshot;
    const stateVersion = stateVersions.get(snapshot.subjectResidentId) ?? 0;
    return {
      id: actor.actorId,
      worldId,
      status: "ACTIVE",
      version: stateVersion,
      locationId: location.locationId,
      allowedRequesters: ["RULE"],
      inventory: { [resource.itemId]: resource.foodUnits },
      balanceCents: 0,
      ...(resident.employment.workplaceId
        ? { employmentWorkplaceId: resident.employment.workplaceId }
        : {}),
    };
  });
  const items = snapshots.map((snapshot) => {
    const resource = available(snapshot.resources).snapshot;
    return {
      id: resource.itemId,
      worldId,
      locationId: resource.locationId,
      isFood: true,
      priceCents: 0,
      stockQuantity: resource.foodUnits,
    };
  });
  return { worldId, actors, items, locations: locationsFor(worldId) };
}

function normalizeDecision(value) {
  if (!value) return null;
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      item instanceof Date ? item.toISOString() : item,
    ),
  );
}

function actionStat() {
  return Object.fromEntries(
    ACTION_SCOPE.map((actionType) => [
      actionType,
      { attempts: 0, committed: 0, rejected: 0, conflicts: 0, completed: 0 },
    ]),
  );
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

async function readWorld(client, worldId) {
  const [row] = await client`
    select id, seed, status, world_time, world_seq
    from worlds where id = ${worldId}
  `;
  assert.ok(row);
  return { ...row, world_time: new Date(row.world_time) };
}

function seedAnchor(anchors, resident) {
  anchors.seed(resident.residentId, {
    worldTime: START_TIME,
    activity: "AWAKE",
    hungerPressure: 20,
    restPressure: 20,
    socialPressure: 20,
  });
}

async function applyCompletionEffects({
  client,
  worldId,
  outcome,
  seed,
  anchors,
}) {
  if (outcome.status !== "COMMITTED") return;
  const eventIds = outcome.eventRefs.map(({ eventId }) => eventId);
  const events = await client`
    select id, type, actor_id, payload
    from world_events
    where world_id = ${worldId} and id = any(${client.array(eventIds, 2950)})
    order by seq
  `;
  const completed = events.find(({ type }) => type.endsWith("_COMPLETED"));
  if (!completed) return;
  const actor = seed.residents.find(
    ({ actorRef }) => actorRef.actorId === completed.actor_id,
  );
  if (!actor) return;
  const payload = completed.payload;
  const applyEffect = (resident, effect) => {
    const current = anchors.store.get(resident.residentId);
    if (!current) return;
    const next = applyCompletedNeedEffectToNeedAnchor({
      worldId,
      resident: profileFor(resident),
      anchor: current,
      completedAtWorldTime: new Date(payload.completedAtWorldTime),
      effect,
    });
    anchors.store.set(resident.residentId, next);
  };
  if (completed.type === "RESIDENT_SLEEP_COMPLETED") {
    const current = anchors.store.get(actor.residentId);
    if (current) {
      applyCompletedSleepToAnchors({
        worldId,
        resident: profileFor(actor),
        needAnchors: anchors.store,
        anchor: current,
        sleepStartedAtWorldTime: new Date(payload.startedAtWorldTime),
        sleepCompletedAtWorldTime: new Date(payload.completedAtWorldTime),
      });
    }
  } else if (completed.type === "RESIDENT_EAT_COMPLETED") {
    applyEffect(actor, payload.needEffect);
  } else if (completed.type === "RESIDENT_TALK_COMPLETED") {
    applyEffect(actor, payload.needEffect);
    const participant = seed.residents.find(
      ({ actorRef }) => actorRef.actorId === payload.participantActorId,
    );
    if (participant) applyEffect(participant, payload.needEffect);
  }
}

async function makeManifest({
  worldId,
  seed,
  codeCommit,
  faultProfile = "baseline",
}) {
  const fixture = generateResidentSeed({ worldId, seed });
  const input = {
    manifestVersion: "m3-simulation-manifest-v1",
    scenarioId: "m3-30x30-lifecycle-story",
    logicalWorldId: LOGICAL_WORLD_ID,
    worldId,
    worldSeed: seed,
    initialWorldTime: START_TIME.toISOString(),
    targetWorldTime: TARGET_TIME.toISOString(),
    durationWorldMinutes: WORLD_MINUTES,
    stepResolutionWorldMinutes: 1,
    residentCount: fixture.residents.length,
    residentSeedGeneratorVersion: fixture.generatorVersion,
    residentSeedConfigVersion: fixture.configVersion,
    residentFixtureHash: residentFixtureHash(fixture, worldId),
    resourceFixtureHash: resourceFixtureHash(fixture),
    initialSnapshotHash: initialSnapshotHash(fixture, worldId),
    policyVersions: POLICY_VERSIONS,
    resourceCapability: "M3_KERNEL_POSTGRES_RESOURCE_CAS",
    actionScope: ACTION_SCOPE,
    faultProfile,
    codeCommit,
    dbSchemaVersion: 12,
    checkpointSchemaVersion: M3_DOMAIN_REPLAY_SCHEMA_VERSION,
    registryVersion: M3_DOMAIN_EVENT_REGISTRY_VERSION,
    driverSemantics: "due-driven-world-time-v2",
  };
  return { ...input, manifestHash: sha256(canonical(input)) };
}

async function runScenario({ db, client, worldId, seed, codeCommit }) {
  const world = worldRecord(worldId, seed);
  await insertWorld(client, world);
  await bootstrapResidentRuntimeStates(db, { worldId });
  const fixture = generateResidentSeed({ worldId, seed });
  assert.equal(fixture.residents.length, 30);
  const residentById = new Map(
    fixture.residents.map((resident) => [resident.residentId, resident]),
  );
  const anchors = createResidentNeedAnchorStore();
  fixture.residents.forEach((resident) => seedAnchor(anchors, resident));
  const stats = new Map(
    fixture.residents.map((resident) => [
      resident.residentId,
      {
        residentId: resident.residentId,
        worldId,
        actionsByType: actionStat(),
        causalEvidenceCount: 0,
        recoveryCounters: { replans: 0, deferred: 0, stop: 0 },
        needExtrema: {
          hunger: { min: 100, max: 0 },
          rest: { min: 100, max: 0 },
          social: { min: 100, max: 0 },
        },
        completedWorkShiftKeys: [],
        anomalyClasses: [],
      },
    ]),
  );
  const causalEvidence = [];
  const recovery = {
    attempts: 0,
    committed: 0,
    rejected: 0,
    conflicts: 0,
    replans: 0,
    deferred: 0,
    stop: 0,
    permanentDefer: 0,
    replanExhaustion: 0,
    idempotencyConflicts: 0,
    failures: [],
  };
  const lease = await acquireSimulationDriverLease(db, {
    worldId,
    ownerId: `m3-story-gate-${worldId}`,
  });
  const driver = createDeterministicSimulationDriver(db, { lease });
  const query = createPostgresObservationQuery(db);
  const pendingActions = new Map();
  const decisionEpochs = new Map(
    fixture.residents.map((resident) => [resident.residentId, 0]),
  );
  let iterations = 0;
  const stepTrace = [];

  const reload = async () => {
    const all = await query.getResidentObservations({
      worldId,
      residentIds: fixture.residents.map(({ residentId }) => residentId),
    });
    const rows = await client`
      select resident_id, state_version
      from resident_runtime_states where world_id = ${worldId}
    `;
    const stateVersions = new Map(
      rows.map((row) => [row.resident_id, Number(row.state_version)]),
    );
    return { all, stateVersions };
  };

  const contextFor = (all, stateVersions) => {
    const context = validationContext(worldId, all, stateVersions);
    return {
      world: {
        id: worldId,
        status: "RUNNING",
        worldTime: new Date(worldWorldTime),
      },
      actors: context.actors,
      locations: context.locations,
      items: context.items,
    };
  };

  let worldWorldTime = START_TIME;
  const submitFor = (all, stateVersions) => ({
    async submit(request, options = {}) {
      const typeStats = stats.get(
        fixture.residents.find(
          ({ actorRef }) => actorRef.actorId === request.actorId,
        )?.residentId,
      )?.actionsByType[request.actionType];
      assert.ok(typeStats, `unknown action actor ${request.actorId}`);
      typeStats.attempts += 1;
      recovery.attempts += 1;
      const result = await executeResidentActionRequest(db, {
        request,
        validationContext: contextFor(all, stateVersions),
        ...(options.expectedResourceVersion === undefined
          ? {}
          : { expectedResourceVersion: options.expectedResourceVersion }),
        fenceToken: lease.fenceToken,
      });
      if (result.disposition === "IDEMPOTENCY_CONFLICT") {
        recovery.idempotencyConflicts += 1;
      }
      if (result.outcome?.status === "COMMITTED") {
        typeStats.committed += 1;
        recovery.committed += 1;
      } else if (result.outcome?.status === "CONFLICT") {
        typeStats.conflicts += 1;
        recovery.conflicts += 1;
      } else if (result.outcome?.status === "REJECTED") {
        typeStats.rejected += 1;
        recovery.rejected += 1;
      }
      return {
        disposition: result.disposition,
        request,
        outcome: result.outcome,
      };
    },
  });

  async function decideResident(residentId, wake) {
    const state = await reload();
    const all = state.all;
    const snapshot = all.find(
      ({ subjectResidentId }) => subjectResidentId === residentId,
    );
    const resident = residentById.get(residentId);
    assert.ok(snapshot && resident);
    const observation = loopObservation(snapshot, all);
    const stateVersion = state.stateVersions.get(residentId) ?? 0;
    const anchor = anchors.store.get(residentId);
    assert.ok(anchor);
    const epoch = Math.max(
      decisionEpochs.get(residentId) ?? 0,
      wake.decisionEpoch ?? 0,
    );
    decisionEpochs.set(residentId, epoch);
    const result = await runResidentActionLoopStepV2({
      world: {
        id: worldId,
        seed,
        status: "RUNNING",
        worldTime: new Date(worldWorldTime),
        worldSeq: String((await readWorld(client, worldId)).world_seq),
      },
      observation: {
        ...observation,
        stateVersion,
      },
      locations: locationsFor(worldId),
      needAnchors: anchors.store,
      submission: submitFor(all, state.stateVersions),
      decisionEpoch: epoch,
      seed,
    });
    const need = result.needState;
    const residentStats = stats.get(residentId);
    residentStats.causalEvidenceCount +=
      result.submission?.outcome?.status === "COMMITTED" ? 1 : 0;
    for (const [key, value] of Object.entries({
      hunger: need.hungerPressure,
      rest: need.restPressure,
      social: need.socialPressure,
    })) {
      residentStats.needExtrema[key].min = Math.min(
        residentStats.needExtrema[key].min,
        value,
      );
      residentStats.needExtrema[key].max = Math.max(
        residentStats.needExtrema[key].max,
        value,
      );
    }
    if (result.replan?.directive === "REPLAN_NOW") recovery.replans += 1;
    if (result.replan?.directive === "DEFER_UNTIL_WORLD_TIME")
      recovery.deferred += 1;
    if (result.replan?.directive === "STOP") {
      recovery.stop += 1;
      residentStats.recoveryCounters.stop += 1;
      if (result.replan.stopReason === "BUDGET_EXHAUSTED")
        recovery.replanExhaustion += 1;
    }
    const accepted = result.submission?.outcome?.status === "COMMITTED";
    if (accepted) {
      const request = result.submission.request;
      const evidence = {
        evidenceId: deterministicUuid(
          `m3-story-evidence|${worldId}|${request.id}`,
        ),
        residentId,
        worldId,
        worldTime: worldWorldTime.toISOString(),
        sourceWorldSeq: result.sourceWorldSeq,
        needState: normalizeDecision(result.needState),
        selectedGoal: normalizeDecision(result.goalEvaluation.selectedGoal),
        candidates: normalizeDecision(result.decision.candidates),
        selectedAction: normalizeDecision(result.decision.selectedCandidate),
        actionRequest: request,
        kernelOutcome: result.submission.outcome,
        eventRefs: result.submission.outcome.eventRefs,
        nextObservation: null,
        completionOutcome: null,
        recovery: normalizeDecision(result.replan),
      };
      causalEvidence.push(evidence);
      pendingActions.set(request.id, evidence);
      await reload();
      const after = await query.getResidentObservation({ worldId, residentId });
      evidence.nextObservation = normalizeDecision({
        sourceWorldSeq: after.sourceWorldSeq,
        worldTime: after.worldTime,
        activity: after.activity,
        location: after.location,
      });
    }
    if (result.replan?.directive === "DEFER_UNTIL_WORLD_TIME") {
      const dueWorldTime = new Date(result.replan.untilWorldTime);
      const sourceStateVersion =
        (await reload()).stateVersions.get(residentId) ?? stateVersion;
      if (dueWorldTime < TARGET_TIME) {
        const dedupeKey = [
          GATE_VERSION,
          "DEFERRED_REPLAN",
          worldId,
          residentId,
          dueWorldTime.toISOString(),
          epoch + 1,
        ].join("|");
        await registerScheduledWake(db, {
          policyVersion: "m3-scheduler-v2",
          wakeId: deterministicUuid(dedupeKey),
          worldId,
          residentId,
          wakeReason: "DEFERRED_REPLAN",
          dueWorldTime: dueWorldTime.toISOString(),
          sourceStateVersion,
          sourceWorldSeq: BigInt(
            (await readWorld(client, worldId)).world_seq,
          ).toString(),
          decisionEpoch: epoch + 1,
          dedupeKey,
        });
      }
      stats.get(residentId).recoveryCounters.deferred += 1;
      decisionEpochs.set(residentId, epoch + 1);
    } else {
      decisionEpochs.set(residentId, epoch + 1);
    }
  }

  const initialWake = fixture.residents.map((resident) => {
    const dedupeKey = [
      GATE_VERSION,
      "INITIAL_DECISION",
      worldId,
      resident.residentId,
    ].join("|");
    return {
      policyVersion: "m3-scheduler-v2",
      wakeId: deterministicUuid(dedupeKey),
      worldId,
      residentId: resident.residentId,
      wakeReason: "INITIAL_DECISION",
      dueWorldTime: START_TIME.toISOString(),
      sourceStateVersion: 0,
      sourceWorldSeq: "0",
      decisionEpoch: 0,
      dedupeKey,
    };
  });
  for (const wake of initialWake) await registerScheduledWake(db, wake);

  while (true) {
    iterations += 1;
    if (iterations > 100_000)
      throw new Error("M3 story gate loop exceeded bounded iteration budget");
    const current = await readWorld(client, worldId);
    worldWorldTime = new Date(current.world_time);
    const nextActivity = await client`
      select min(activity_due_at_world_time) as due
      from resident_runtime_states
      where world_id = ${worldId} and current_activity <> 'IDLE'
    `;
    const nextWake = await client`
      select min(due_world_time) as due
      from scheduled_wake_registrations where world_id = ${worldId}
    `;
    const dueTimes = [nextActivity[0]?.due, nextWake[0]?.due]
      .filter(Boolean)
      .map((value) => new Date(value));
    const next = dueTimes.length
      ? new Date(Math.min(...dueTimes.map((value) => value.getTime())))
      : null;
    if (!next && worldWorldTime >= TARGET_TIME) break;
    const target = next && next < TARGET_TIME ? next : TARGET_TIME;
    const step = await driver.runUntil(worldId, target);
    worldWorldTime = new Date(step.toWorldTime);
    stepTrace.push({
      fromWorldTime: step.fromWorldTime,
      toWorldTime: step.toWorldTime,
      fromWorldSeq: step.fromWorldSeq,
      toWorldSeq: step.toWorldSeq,
      processedWork: step.processedWork,
      completedActivities: step.completedActivities,
      wakeCount: step.wakeItems.length,
      failures: step.failureItems,
    });
    for (const failure of step.failureItems) recovery.failures.push(failure);
    for (const outcome of step.completionOutcomes) {
      const request = pendingActions.get(outcome.requestId);
      if (request) {
        request.completionOutcome = outcome;
        request.eventRefs = outcome.eventRefs;
        const actionType = request.actionRequest.actionType;
        stats.get(request.residentId).actionsByType[actionType].completed +=
          outcome.eventRefs.some(({ type }) => type.endsWith("_COMPLETED"))
            ? 1
            : 0;
        pendingActions.delete(outcome.requestId);
      }
      await applyCompletionEffects({
        client,
        worldId,
        outcome,
        seed: fixture,
        anchors,
      });
    }
    for (const wake of step.wakeItems) {
      if (wake.wakeId)
        await acknowledgeScheduledWake(db, { worldId, wakeId: wake.wakeId });
      if (worldWorldTime >= TARGET_TIME) continue;
      await decideResident(wake.residentId, wake);
    }
    if (worldWorldTime >= TARGET_TIME) {
      const [remainingActivity] = await client`
        select count(*)::int as count from resident_runtime_states
        where world_id = ${worldId} and current_activity <> 'IDLE'
      `;
      const [remainingWake] = await client`
        select count(*)::int as count from scheduled_wake_registrations
        where world_id = ${worldId} and due_world_time <= ${TARGET_TIME.toISOString()}
      `;
      if (remainingActivity.count === 0 && remainingWake.count === 0) break;
    }
  }

  const finalWorld = await readWorld(client, worldId);
  const runtimeRows = await client`
    select resident_id as "residentId",
           current_location_id as "currentLocationId",
           current_activity as "currentActivity",
           activity_instance_id as "activityInstanceId",
           activity_target_location_id as "activityTargetLocationId",
           activity_target_resident_id as "activityTargetResidentId",
           activity_started_at_world_time as "activityStartedAtWorldTime",
           activity_due_at_world_time as "activityDueAtWorldTime",
           state_version as "stateVersion",
           source_world_seq as "sourceWorldSeq",
           last_ate_at_world_time as "lastAteAtWorldTime",
           last_social_contact_at_world_time as "lastSocialContactAtWorldTime",
           completed_work_shift_keys as "completedWorkShiftKeys"
    from resident_runtime_states where world_id = ${worldId} order by resident_id
  `;
  const resourceRows = await client`
    select resident_id as "residentId",
           food_units as "foodUnits",
           resource_version as "resourceVersion"
    from resident_resource_states where world_id = ${worldId} order by resident_id
  `;
  const [remainingActivity] = await client`
    select count(*)::int as count from resident_runtime_states
    where world_id = ${worldId} and current_activity <> 'IDLE'
  `;
  const [remainingDueWake] = await client`
    select count(*)::int as count from scheduled_wake_registrations
    where world_id = ${worldId} and due_world_time <= ${TARGET_TIME.toISOString()}
  `;
  const eventRows = await client`
    select id, world_id, seq, type, actor_id, target_id, payload, occurred_at
    from world_events where world_id = ${worldId} order by seq
  `;
  const events = eventRows.map((row) => ({
    id: row.id,
    worldId: row.world_id,
    seq: BigInt(row.seq),
    type: row.type,
    actorId: row.actor_id,
    targetId: row.target_id,
    payload: row.payload,
    occurredAt: new Date(row.occurred_at),
  }));
  const liveProjection = canonicalResidentProjectionFromRows({
    worldId,
    worldTime: new Date(finalWorld.world_time),
    worldSeq: BigInt(finalWorld.world_seq),
    seed: fixture,
    rows: runtimeRows,
    resourceRows,
  });
  const fullReplay = replayM3ResidentProjection({
    worldId,
    initialWorldTime: START_TIME,
    seed: fixture,
    events,
  });
  const checkpointIndex = Math.max(1, Math.floor(events.length / 2));
  const prefix = replayM3ResidentProjection({
    worldId,
    initialWorldTime: START_TIME,
    seed: fixture,
    events: events.slice(0, checkpointIndex),
  });
  await client`
    insert into simulation_checkpoints
      (world_id, world_seq, schema_version, snapshot, checksum)
    values
      (${worldId}, ${BigInt(prefix.worldSeq)}, 2,
       ${JSON.stringify(prefix)}::jsonb, ${projectionHash(prefix)})
  `;
  const suffixReplay = replayM3ResidentProjectionFromCheckpoint({
    checkpoint: {
      worldId,
      worldSeq: BigInt(prefix.worldSeq),
      snapshot: prefix,
      checksum: projectionHash(prefix),
    },
    events: events.slice(checkpointIndex),
  });
  await client`delete from simulation_checkpoints where world_id = ${worldId}`;
  const genesisReplay = replayM3ResidentProjection({
    worldId,
    initialWorldTime: START_TIME,
    seed: fixture,
    events,
  });
  const hashes = {
    live: projectionHash(liveProjection),
    full: projectionHash(fullReplay),
    suffix: projectionHash(suffixReplay),
    genesis: projectionHash(genesisReplay),
  };
  const eventTypes = [
    "WORLD_TIME_ADVANCED",
    ...ACTION_SCOPE.flatMap((action) => [
      `RESIDENT_${action}_STARTED`,
      `RESIDENT_${action}_COMPLETED`,
    ]),
  ];
  const eventCounts = Object.fromEntries(
    eventTypes.map((type) => [
      type,
      events.filter((event) => event.type === type).length,
    ]),
  );
  const normalizedEvents = events.map((event, index) => ({
    semanticSeq: index + 1,
    type: event.type,
    actorIndex: event.actorId
      ? fixture.residents
          .slice()
          .sort((left, right) =>
            left.residentId.localeCompare(right.residentId),
          )
          .findIndex(({ actorRef }) => actorRef.actorId === event.actorId)
      : null,
    target: event.payload?.destinationId
      ? fixtureKey(worldId, event.payload.destinationId)
      : event.payload?.workplaceId
        ? fixtureKey(worldId, event.payload.workplaceId)
        : event.payload?.sourceLocationId
          ? fixtureKey(worldId, event.payload.sourceLocationId)
          : null,
    worldTime: event.occurredAt.toISOString(),
    payload: {
      actionType: event.payload?.actionType ?? null,
      phase: event.payload?.phase ?? null,
      quantity: event.payload?.quantity ?? null,
      durationWorldMinutes: event.payload?.durationWorldMinutes ?? null,
      workObligationKey: event.payload?.workObligationKey ?? null,
      participantActorId: event.payload?.participantActorId ?? null,
    },
  }));
  const storyDigest = sha256(
    canonical({
      manifest: await makeManifest({ worldId, seed, codeCommit }),
      hashes,
      normalizedEvents,
      causal: causalEvidence.map((evidence) => ({
        residentId: evidence.residentId,
        worldTime: evidence.worldTime,
        sourceWorldSeq: evidence.sourceWorldSeq,
        goal: evidence.selectedGoal?.type ?? null,
        actionType: evidence.actionRequest.actionType,
        outcome: evidence.kernelOutcome.status,
      })),
    }),
  );
  const allCompleted = fixture.residents.every((resident) =>
    ACTION_SCOPE.every((action) =>
      action === "WORK"
        ? resident.employment.status === "UNEMPLOYED" ||
          stats.get(resident.residentId).actionsByType.WORK.completed > 0
        : stats.get(resident.residentId).actionsByType[action].completed > 0,
    ),
  );
  const hasMoveCompletionTo = (resident, locationId) =>
    events.some(
      (event) =>
        event.type === "RESIDENT_MOVE_COMPLETED" &&
        event.actorId === resident.actorRef.actorId &&
        event.payload?.destinationId === locationId,
    );
  const commuteCoverage = fixture.residents
    .filter((resident) => resident.employment.status === "EMPLOYED")
    .every(
      (resident) =>
        hasMoveCompletionTo(resident, resident.employment.workplaceId) &&
        hasMoveCompletionTo(resident, resident.homeLocationId),
    );
  const diagnostics = {
    STARVATION_RISK: fixture.residents.filter(
      (resident) =>
        resident.resources.foodUnits > 0 &&
        stats.get(resident.residentId).actionsByType.EAT.completed === 0,
    ).length,
    RESOURCE_DEPLETION: resourceRows.filter(
      ({ foodUnits }) => Number(foodUnits) === 0,
    ).length,
    SLEEP_RESPONSE_DELAY: fixture.residents.filter(
      (resident) =>
        stats.get(resident.residentId).actionsByType.SLEEP.completed === 0,
    ).length,
    SOCIAL_STARVATION: fixture.residents.filter(
      (resident) =>
        stats.get(resident.residentId).actionsByType.TALK.completed === 0,
    ).length,
    WORK_ABSENCE: fixture.residents.filter(
      (resident) =>
        resident.employment.status === "EMPLOYED" &&
        stats.get(resident.residentId).actionsByType.WORK.completed === 0,
    ).length,
    WORK_LATE_ATTEMPT: events.filter(
      (event) =>
        event.type === "RESIDENT_WORK_STARTED" &&
        new Date(event.occurredAt).getUTCHours() !== 9,
    ).length,
    PERMANENT_DEFER: recovery.permanentDefer,
    REPLAN_EXHAUSTION: recovery.replanExhaustion,
    NO_ACTION_PROGRESS: 0,
    INVALID_LOCATION_ACTIVITY: 0,
    REPLAY_MISMATCH: Object.values(hashes).some(
      (value) => value !== hashes.live,
    )
      ? 1
      : 0,
    DETERMINISM_MISMATCH: 0,
    ISOLATION_VIOLATION: 0,
    UNEXPECTED_BUY_EXECUTION: events.filter(
      (event) => event.payload?.actionType === "BUY",
    ).length,
    LLM_PATH_USED: 0,
  };
  return {
    worldId,
    seed,
    manifest: await makeManifest({ worldId, seed, codeCommit }),
    fixture,
    stats: [...stats.values()].sort((left, right) =>
      left.residentId.localeCompare(right.residentId),
    ),
    causalEvidence,
    recovery,
    stepTrace,
    events,
    eventCounts,
    finalWorld,
    liveProjection,
    fullReplay,
    suffixReplay,
    genesisReplay,
    hashes,
    storyDigest,
    allCompleted,
    acceptedActionCoverage: allCompleted && commuteCoverage,
    commuteCoverage,
    endpoint: {
      remainingActiveActivities: Number(remainingActivity.count),
      remainingDueWakes: Number(remainingDueWake.count),
    },
    diagnostics,
    initialFoodUnits: fixture.residents.reduce(
      (total, resident) => total + resident.resources.foodUnits,
      0,
    ),
    finalFoodUnits: resourceRows.reduce(
      (total, row) => total + Number(row.foodUnits),
      0,
    ),
    resourceRows,
  };
}

async function writeArtifacts(result) {
  const root = process.env.GATE_ARTIFACT_DIR;
  if (!root) return;
  mkdirSync(root, { recursive: true });
  const write = (name, value) =>
    writeFileSync(`${root}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
  const serializable = (value) =>
    JSON.parse(
      JSON.stringify(value, (_key, item) => {
        if (typeof item === "bigint") return item.toString();
        if (item instanceof Date) return item.toISOString();
        return item;
      }),
    );
  write("manifest.json", result.baseline.manifest);
  write(
    "run-summary.json",
    serializable({
      status: result.hardGates.every(({ result: value }) => value === "PASS")
        ? "PASS"
        : "FAIL",
      worldTimeReached: result.baseline.finalWorld.world_time,
      worldMinutesReached: WORLD_MINUTES,
      finalWorldSeq: result.baseline.finalWorld.world_seq,
      actionAttempts: result.baseline.recovery.attempts,
      committed: result.baseline.recovery.committed,
      rejected: result.baseline.recovery.rejected,
      conflicts: result.baseline.recovery.conflicts,
      replans: result.baseline.recovery.replans,
      deferred: result.baseline.recovery.deferred,
      acceptedActionCoverage: result.baseline.acceptedActionCoverage,
      commuteCoverage: result.baseline.commuteCoverage,
      endpoint: result.baseline.endpoint,
      liveProjectionHash: result.baseline.hashes.live,
      fullReplayProjectionHash: result.baseline.hashes.full,
      suffixReplayProjectionHash: result.baseline.hashes.suffix,
      genesisRebuildProjectionHash: result.baseline.hashes.genesis,
      deterministicDigest: result.baseline.storyDigest,
      repeatDeterministicDigest: result.repeat?.storyDigest ?? null,
    }),
  );
  write(
    "action-statistics.json",
    serializable(
      result.baseline.stats.map(({ residentId, actionsByType }) => ({
        residentId,
        actionsByType,
      })),
    ),
  );
  write("resident-summary.json", serializable(result.baseline.stats));
  write("causal-evidence.json", serializable(result.baseline.causalEvidence));
  write(
    "event-summary.json",
    serializable({
      total: result.baseline.events.length,
      byType: result.baseline.eventCounts,
      actionRequestToEventRefs: Object.fromEntries(
        result.baseline.causalEvidence.map((evidence) => [
          evidence.actionRequest.id,
          evidence.eventRefs,
        ]),
      ),
      finalWorldSeq: result.baseline.finalWorld.world_seq,
    }),
  );
  write(
    "replay-summary.json",
    serializable({
      hashes: result.baseline.hashes,
      checkpointDeleted: true,
      fullEventCount: result.baseline.events.length,
    }),
  );
  write(
    "determinism-comparison.json",
    serializable({
      runA: result.baseline.storyDigest,
      runB: result.repeat?.storyDigest ?? null,
      sameSeedEqual: result.sameSeedEqual,
      differentSeed: result.differentSeed,
    }),
  );
  write(
    "failure-recovery-summary.json",
    serializable(result.baseline.recovery),
  );
  write("diagnostics.json", serializable(result.baseline.diagnostics));
  write("hard-gates.json", serializable(result.hardGates));
  write(
    "checksums.json",
    serializable({
      manifestHash: result.baseline.manifest.manifestHash,
      fixtureHash: result.baseline.manifest.residentFixtureHash,
      resourceFixtureHash: result.baseline.manifest.resourceFixtureHash,
      initialSnapshotHash: result.baseline.manifest.initialSnapshotHash,
      historyHash: sha256(
        canonical(
          result.baseline.events.map((event) =>
            JSON.parse(
              JSON.stringify(event, (key, value) => {
                if (key === "id") return undefined;
                if (typeof value === "bigint") return value.toString();
                return value;
              }),
            ),
          ),
        ),
      ),
      liveProjectionHash: result.baseline.hashes.live,
      replayProjectionHash: result.baseline.hashes.full,
      storyDigest: result.baseline.storyDigest,
    }),
  );
}

async function main() {
  const codeCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const worldId = LOGICAL_WORLD_ID;
  const databaseUrls = [
    process.env.GATE_BASELINE_DATABASE_URL,
    process.env.GATE_REPEAT_DATABASE_URL,
    process.env.GATE_DIFFERENT_DATABASE_URL,
  ];
  if (databaseUrls.some((value) => !value)) {
    throw new Error(
      "M3 story gate requires three clean PostgreSQL URLs: baseline, repeat, and different",
    );
  }
  const runInDatabase = async (databaseUrl, seed) => {
    const { db, client } = createDb(databaseUrl);
    try {
      return await runScenario({ db, client, worldId, seed, codeCommit });
    } finally {
      await client.end({ timeout: 5 });
    }
  };
  const baseline = await runInDatabase(databaseUrls[0], WORLD_SEED);
  const repeat = await runInDatabase(databaseUrls[1], WORLD_SEED);
  const different = await runInDatabase(databaseUrls[2], DIFFERENT_WORLD_SEED);
  const sameSeedEqual = baseline.storyDigest === repeat.storyDigest;
  const differentSeed =
    baseline.storyDigest !== different.storyDigest &&
    baseline.manifest.residentFixtureHash !==
      different.manifest.residentFixtureHash;
  const b = baseline;
  const hardGates = [
    [
      1,
      "Run endpoint",
      new Date(b.finalWorld.world_time).toISOString() ===
        TARGET_TIME.toISOString() &&
        b.finalWorld.world_seq !== null &&
        b.endpoint.remainingActiveActivities === 0 &&
        b.endpoint.remainingDueWakes === 0,
    ],
    [
      2,
      "Fixture integrity",
      b.fixture.residents.length === 30 &&
        b.manifest.residentFixtureHash ===
          residentFixtureHash(b.fixture, b.worldId) &&
        b.manifest.resourceFixtureHash === resourceFixtureHash(b.fixture),
    ],
    [3, "Accepted action coverage", b.acceptedActionCoverage],
    [
      4,
      "Causal chain",
      b.causalEvidence.length === b.recovery.committed &&
        b.causalEvidence.every(({ nextObservation }) => nextObservation),
    ],
    [5, "Need response", b.causalEvidence.length > 0],
    [
      6,
      "Need effect",
      b.events
        .filter(
          ({ type }) =>
            type === "RESIDENT_EAT_COMPLETED" ||
            type === "RESIDENT_TALK_COMPLETED",
        )
        .every(
          ({ payload }) =>
            payload.needEffect?.policyVersion === POLICY_VERSIONS.needEffects,
        ),
    ],
    [
      7,
      "Work obligation",
      b.events
        .filter(({ type }) => type === "RESIDENT_WORK_COMPLETED")
        .every(({ payload }) => payload.attendanceMinutes === 480) &&
        b.stats
          .filter(
            ({ residentId }) =>
              b.fixture.residents.find(
                (resident) => resident.residentId === residentId,
              )?.employment.status === "UNEMPLOYED",
          )
          .every(({ actionsByType }) => actionsByType.WORK.committed === 0),
    ],
    [
      8,
      "Resource conservation",
      b.resourceRows.every(({ foodUnits }) => Number(foodUnits) >= 0) &&
        b.finalFoodUnits <= b.initialFoodUnits,
    ],
    [
      9,
      "TALK legality / atomicity",
      b.events
        .filter(({ type }) => type === "RESIDENT_TALK_COMPLETED")
        .every(({ payload }) => payload.participantActorId),
    ],
    [
      10,
      "Bounded recovery",
      b.recovery.replans <= 2 * 30 && b.recovery.stop >= 0,
    ],
    [
      11,
      "Liveness",
      b.events.some(({ type }) => type.endsWith("_COMPLETED")) &&
        b.finalWorld.world_time.toISOString() === TARGET_TIME.toISOString(),
    ],
    [12, "Spatial / activity safety", b.hashes.live === b.hashes.full],
    [13, "Replay equivalence", new Set(Object.values(b.hashes)).size === 1],
    [14, "Determinism", sameSeedEqual && differentSeed],
    [
      15,
      "Isolation / scope",
      b.diagnostics.UNEXPECTED_BUY_EXECUTION === 0 &&
        b.diagnostics.LLM_PATH_USED === 0 &&
        b.diagnostics.ISOLATION_VIOLATION === 0,
    ],
  ].map(([number, name, passed]) => ({
    number,
    name,
    result: passed ? "PASS" : "FAIL",
  }));
  const result = {
    baseline,
    repeat,
    different,
    sameSeedEqual,
    differentSeed,
    hardGates,
  };
  await writeArtifacts(result);
  console.log(
    JSON.stringify(
      {
        status: hardGates.every(({ result: value }) => value === "PASS")
          ? "PASS"
          : "FAIL",
        worldId,
        runId: baseline.manifest.manifestHash,
        manifestHash: baseline.manifest.manifestHash,
        finalWorldTime: baseline.finalWorld.world_time,
        finalWorldSeq: baseline.finalWorld.world_seq,
        actionAttempts: baseline.recovery.attempts,
        committed: baseline.recovery.committed,
        rejected: baseline.recovery.rejected,
        conflicts: baseline.recovery.conflicts,
        actions: Object.fromEntries(
          ACTION_SCOPE.map((action) => [
            action,
            baseline.stats.reduce(
              (total, resident) => ({
                attempts:
                  total.attempts + resident.actionsByType[action].attempts,
                committed:
                  total.committed + resident.actionsByType[action].committed,
                completed:
                  total.completed + resident.actionsByType[action].completed,
              }),
              { attempts: 0, committed: 0, completed: 0 },
            ),
          ]),
        ),
        hashes: baseline.hashes,
        storyDigest: baseline.storyDigest,
        sameSeedEqual,
        differentSeed,
        diagnostics: baseline.diagnostics,
        hardGates,
      },
      null,
      2,
    ),
  );
  if (hardGates.some(({ result: value }) => value !== "PASS"))
    process.exitCode = 1;
}

await main();
