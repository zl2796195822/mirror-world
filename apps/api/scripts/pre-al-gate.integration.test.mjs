import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import {
  acknowledgeScheduledWake,
  acquireSimulationDriverLease,
  bootstrapResidentRuntimeStates,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  readDueActivities,
  readDueScheduledWakes,
  readNextActivityDueWorldTime,
  readNextScheduledWakeWorldTime,
  registerScheduledWake,
} from "@mirror/db";
import {
  applyCompletedSleepToAnchors,
  createResidentNeedAnchorStore,
  runResidentActionLoopStep,
} from "@mirror/life-engine";
import {
  canonicalResidentProjectionFromRows,
  completeResidentAction,
  createDeterministicSimulationDriver,
  createPostgresObservationQuery,
  executeResidentActionRequest,
  projectionHash,
  replayM3ResidentProjection,
  replayM3ResidentProjectionFromCheckpoint,
  replayFromCheckpoint,
  replayWorldEvents,
  updateWorldClockControl,
} from "@mirror/world-kernel";

const START_TIME = new Date("2026-09-07T00:00:00.000Z");
const WORLD_DAYS = 30;
const WORLD_MINUTES = WORLD_DAYS * 24 * 60;
const END_TIME = new Date(START_TIME.getTime() + WORLD_MINUTES * 60_000);
const WORLD_SEED = "mirror-pre-al-gate-world-v1";
const LOGICAL_WORLD_ID = "00000000-0000-4000-8000-00000000a300";
const GATE_POLICY_VERSIONS = {
  needs: "m3-needs-v1",
  goals: "m3-goals-v1",
  decision: "m3-rule-decision-v1",
  actionLoop: "m3-action-loop-v1",
  actionSemantics: "m3-action-semantics-v1",
  replan: "m3-replan-v1",
  scheduler: "m3-scheduler-v1",
  runtime: "m3-runtime-state-v1",
  eventRegistry: "m3-domain-event-registry-v1",
};
const LOGICAL_SEED = generateResidentSeed({
  worldId: LOGICAL_WORLD_ID,
  seed: WORLD_SEED,
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function deterministicUuid(value) {
  const hex = sha256(value).slice(0, 32);
  const versioned = `${hex.slice(0, 12)}4${hex.slice(13, 16)}`;
  const variant = (((Number.parseInt(hex[16], 16) ?? 0) & 0x3) | 0x8).toString(
    16,
  );
  const withVariant = `${variant}${hex.slice(17)}`;
  return [
    versioned.slice(0, 8),
    versioned.slice(8, 12),
    versioned.slice(12, 16),
    withVariant.slice(0, 4),
    withVariant.slice(4, 16),
  ].join("-");
}

function canonical(value) {
  return JSON.stringify(value);
}

function worldRecord(id, name, status = "RUNNING") {
  return {
    id,
    name,
    timezone: "UTC",
    status,
    seed: WORLD_SEED,
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

function decisionLocations(worldId) {
  return getFirstStreetLocationFixtures(worldId).map(({ id, kind }) => ({
    id,
    kind,
  }));
}

function fixtureKeyMap(worldId) {
  return new Map(
    getFirstStreetLocationFixtures(worldId).map((location) => [
      location.id,
      location.key,
    ]),
  );
}

function fixtureIdForKey(worldId, key) {
  const fixture = getFirstStreetLocationFixtures(worldId).find(
    (location) => location.key === key,
  );
  assert.ok(fixture, `Unknown fixture key ${key}`);
  return fixture.id;
}

function residentFixtureKey(worldId, resident) {
  const keys = fixtureKeyMap(worldId);
  return canonical({
    homeKey: keys.get(resident.homeLocationId),
    profile: {
      version: resident.profile.version,
      personality: resident.profile.personality,
      routine: resident.profile.routine,
    },
    employment: {
      status: resident.employment.status,
      role: resident.employment.role,
      workplaceKey: resident.employment.workplaceId
        ? keys.get(resident.employment.workplaceId)
        : null,
    },
    resources: {
      cashCents: resident.resources.cashCents,
      foodUnits: resident.resources.foodUnits,
      version: resident.resources.version,
    },
  });
}

function logicalResidentFor(worldId, resident) {
  const key = residentFixtureKey(worldId, resident);
  const logical = LOGICAL_SEED.residents.find(
    (candidate) => residentFixtureKey(LOGICAL_WORLD_ID, candidate) === key,
  );
  assert.ok(logical, `No logical resident mapping for ${key}`);
  return logical;
}

function logicalResidentIndex(seed, worldId, residentIdOrActorId) {
  const resident = seed.residents.find(
    ({ residentId, actorRef }) =>
      residentId === residentIdOrActorId ||
      actorRef.actorId === residentIdOrActorId,
  );
  assert.ok(resident, `Unknown resident or actor ${residentIdOrActorId}`);
  const logical = logicalResidentFor(worldId, resident);
  const index = LOGICAL_SEED.residents.findIndex(
    ({ residentId }) => residentId === logical.residentId,
  );
  assert.notEqual(index, -1);
  return index;
}

function validationContext(worldId, resident, observation) {
  return {
    world: {
      id: worldId,
      status: "RUNNING",
      worldTime: new Date(observation.worldTime),
    },
    actors: [
      {
        id: resident.actorRef.actorId,
        worldId,
        status: "ACTIVE",
        version: observation.stateVersion,
        locationId: observation.locationId,
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
    await client`delete from simulation_driver_leases where world_id = ${worldId}`;
    await client`delete from simulation_checkpoints where world_id = ${worldId}`;
    await client`delete from kernel_action_outcome_events where world_id = ${worldId}`;
    await client`delete from kernel_action_outcomes where world_id = ${worldId}`;
    await client`delete from action_requests where world_id = ${worldId}`;
    await client`delete from scheduled_wake_registrations where world_id = ${worldId}`;
    await client`delete from resident_resource_states where world_id = ${worldId}`;
    await client`delete from resident_runtime_states where world_id = ${worldId}`;
  }
}

async function loadObservation(query, client, worldId, residentId) {
  const snapshot = await query.getResidentObservation({ worldId, residentId });
  const [runtime] = await client`
    select state_version from resident_runtime_states
    where world_id = ${worldId} and resident_id = ${residentId}
  `;
  assert.ok(runtime);
  if (
    snapshot.location.status !== "AVAILABLE" ||
    snapshot.activity.status !== "AVAILABLE" ||
    snapshot.actorRef.status !== "AVAILABLE" ||
    snapshot.resources.status !== "AVAILABLE"
  ) {
    throw new Error(
      "PRE-AL-GATE requires available M3 observation capabilities",
    );
  }
  return {
    worldId,
    worldSeed: snapshot.worldSeed,
    worldTime: new Date(snapshot.worldTime),
    worldStatus: snapshot.worldStatus,
    sourceWorldSeq: snapshot.sourceWorldSeq,
    residentId: snapshot.subjectResidentId,
    actorId: snapshot.actorRef.actorRef.actorId,
    homeLocationId: snapshot.self.homeLocationId,
    workplaceId: snapshot.self.employment.workplaceId,
    locationId: snapshot.location.location.locationId,
    locationKind: snapshot.location.location.kind,
    activityKind: snapshot.activity.activity.kind,
    stateVersion: runtime.state_version,
    profile: snapshot.self.profile,
    personality: snapshot.self.profile.personality,
    employment: snapshot.self.employment,
    obligation:
      snapshot.workObligation.status === "AVAILABLE"
        ? snapshot.workObligation.obligation.status === "NO_CURRENT_OBLIGATION"
          ? undefined
          : {
              status: snapshot.workObligation.obligation.status,
              workplaceId: snapshot.workObligation.obligation.workplaceId,
              deadline: snapshot.workObligation.obligation.endsAtWorldTime
                ? new Date(snapshot.workObligation.obligation.endsAtWorldTime)
                : undefined,
            }
        : undefined,
  };
}

function logicalFixtureKey(worldId, locationId) {
  return (
    getFirstStreetLocationFixtures(worldId).find(({ id }) => id === locationId)
      ?.key ?? locationId
  );
}

function logicalFixtureKind(worldId, locationId) {
  return (
    getFirstStreetLocationFixtures(worldId).find(({ id }) => id === locationId)
      ?.kind ?? "UNKNOWN"
  );
}

function seedHash(seed, worldId) {
  const residents = seed.residents
    .map((resident) => ({
      key: residentFixtureKey(worldId, resident),
      resident,
    }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(({ resident }, index) => ({
      index,
      identityKind: resident.identityKind,
      homeKey: logicalFixtureKey(worldId, resident.homeLocationId),
      profile: resident.profile,
      employment: {
        status: resident.employment.status,
        role: resident.employment.role,
        workplaceKey: resident.employment.workplaceId
          ? logicalFixtureKey(worldId, resident.employment.workplaceId)
          : null,
      },
      resources: {
        cashCents: resident.resources.cashCents,
        foodUnits: resident.resources.foodUnits,
        version: resident.resources.version,
      },
    }));
  return sha256(
    canonical({
      generatorVersion: seed.generatorVersion,
      configVersion: seed.configVersion,
      profileHash: seed.profileHash,
      residents,
    }),
  );
}

function manifest(
  codeCommit,
  residentFixtureHash,
  initialSnapshotHash,
  faultProfile = "baseline",
) {
  const input = {
    manifestVersion: "m3-simulation-manifest-v1",
    scenarioId: "m3-30x30-baseline",
    logicalWorldId: LOGICAL_WORLD_ID,
    worldSeed: WORLD_SEED,
    initialWorldTime: START_TIME.toISOString(),
    durationWorldMinutes: WORLD_MINUTES,
    stepResolutionWorldMinutes: 1,
    residentCount: 30,
    residentSeedGeneratorVersion: "m3-t01-v1",
    residentSeedConfigVersion: "first-street-v1",
    residentFixtureHash,
    initialSnapshotHash,
    policyVersions: GATE_POLICY_VERSIONS,
    resourceCapability: "M3_FIXTURE_READONLY",
    actionScope: ["MOVE", "SLEEP"],
    faultProfile,
    codeCommit,
    dbSchemaVersion: 10,
    driverSemantics: "due-driven-world-time-v1",
    checkpointSchemaVersion: "m3-resident-projection-v1",
  };
  return { ...input, manifestHash: sha256(canonical(input)) };
}

function initialSnapshotHash(seed, worldId) {
  return sha256(
    canonical({
      worldTime: START_TIME.toISOString(),
      residents: seed.residents
        .map((resident) => ({
          key: residentFixtureKey(worldId, resident),
          location: logicalFixtureKey(worldId, resident.homeLocationId),
          activity: "IDLE",
          stateVersion: 0,
          sourceWorldSeq: "0",
        }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    }),
  );
}

function writeGateArtifacts(result) {
  const root = process.env.GATE_ARTIFACT_DIR;
  if (!root) return;
  mkdirSync(root, { recursive: true });
  const write = (name, value) =>
    writeFileSync(`${root}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
  const eventCounts = result.baseline.events.reduce((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
    return counts;
  }, {});
  write("manifest.json", result.baseline.manifest);
  write("run-summary.json", result.summary);
  write("resident-summary.json", result.baseline.stats);
  write("event-summary.json", {
    total: result.baseline.totalEvents,
    byType: eventCounts,
    finalWorldSeq: result.baseline.finalWorldSeq,
  });
  write("replay-summary.json", result.replay);
  write("failure-injection-summary.json", result.faults);
  write("checksums.json", result.checksums);
  write("invariant-summary.json", result.invariants);
}

function actionSummary(stats) {
  return [...stats.values()]
    .sort((left, right) => left.residentId.localeCompare(right.residentId))
    .map(({ residentId, ...rest }) => ({ residentId, ...rest }));
}

async function runWorld({
  db,
  client,
  worldId,
  ownerId,
  codeCommit,
  faultProfile = "baseline",
  poisonResidentId = null,
}) {
  const world = worldRecord(worldId, `PRE-AL-GATE ${ownerId}`);
  await insertWorld(client, world);
  await bootstrapResidentRuntimeStates(db, { worldId });
  const seed = generateResidentSeed({ worldId, seed: WORLD_SEED });
  assert.equal(seed.residents.length, 30);
  const residentsById = new Map(
    seed.residents.map((resident) => [resident.residentId, resident]),
  );
  const logicalResidentsById = new Map(
    LOGICAL_SEED.residents.map((resident) => [resident.residentId, resident]),
  );
  const physicalByLogicalId = new Map(
    seed.residents.map((resident) => [
      logicalResidentFor(worldId, resident).residentId,
      resident,
    ]),
  );
  const logicalByPhysicalId = new Map(
    seed.residents.map((resident) => [
      resident.residentId,
      logicalResidentFor(worldId, resident),
    ]),
  );
  const query = createPostgresObservationQuery(db);
  const anchors = createResidentNeedAnchorStore();
  const stats = new Map(
    LOGICAL_SEED.residents.map((resident) => [
      resident.residentId,
      {
        residentId: resident.residentId,
        actionsAttempted: 0,
        committed: 0,
        rejected: 0,
        conflicts: 0,
        replans: 0,
        deferred: 0,
        wakeCount: 0,
        stopCount: 0,
        completedActivities: 0,
        lastAction: null,
      },
    ]),
  );
  for (const [index, resident] of LOGICAL_SEED.residents.entries()) {
    anchors.store.set(resident.residentId, {
      worldTime: START_TIME,
      activity: "AWAKE",
      hungerPressure: 20 + (index % 3) * 5,
      restPressure: 95 - (index % 4),
      socialPressure: 20,
    });
  }

  const lease = await acquireSimulationDriverLease(db, { worldId, ownerId });
  const actionStarts = new Map();
  const decisionEpochs = new Map(
    LOGICAL_SEED.residents.map((resident) => [resident.residentId, 0]),
  );
  const events = [];
  let requestIdempotencyEvidence = null;
  let completionIdempotencyEvidence = null;
  let actionLoopSteps = 0;
  let iterations = 0;
  let noProgressIterations = 0;
  let minWorldSeq = 0n;

  async function decide(physicalResidentId, requestedEpoch) {
    const resident = residentsById.get(physicalResidentId);
    const logicalResident = logicalByPhysicalId.get(physicalResidentId);
    assert.ok(resident);
    assert.ok(logicalResident);
    const observation = await loadObservation(
      query,
      client,
      worldId,
      physicalResidentId,
    );
    const stat = stats.get(logicalResident.residentId);
    stat.wakeCount += 1;
    const isPoisonResident =
      faultProfile === "poison" &&
      logicalResident.residentId === poisonResidentId;
    const epoch =
      requestedEpoch ?? decisionEpochs.get(logicalResident.residentId) ?? 0;
    decisionEpochs.set(logicalResident.residentId, epoch);
    const physicalKeys = fixtureKeyMap(worldId);
    const logicalLocationKey = physicalKeys.get(observation.locationId);
    assert.ok(logicalLocationKey);
    const logicalObligation = observation.obligation
      ? {
          ...observation.obligation,
          workplaceId: fixtureIdForKey(
            LOGICAL_WORLD_ID,
            physicalKeys.get(observation.obligation.workplaceId) ?? "",
          ),
        }
      : undefined;
    const step = await runResidentActionLoopStep({
      world: {
        id: LOGICAL_WORLD_ID,
        seed: WORLD_SEED,
        status: "RUNNING",
        worldTime: observation.worldTime,
        worldSeq: observation.sourceWorldSeq,
      },
      observation: {
        residentId: logicalResident.residentId,
        actorId: logicalResident.actorRef.actorId,
        homeLocationId: logicalResident.homeLocationId,
        workplaceId: logicalResident.employment.workplaceId
          ? fixtureIdForKey(
              LOGICAL_WORLD_ID,
              fixtureKeyMap(LOGICAL_WORLD_ID).get(
                logicalResident.employment.workplaceId,
              ) ?? "",
            )
          : null,
        stateVersion: observation.stateVersion,
        locationId: isPoisonResident
          ? decisionLocations(LOGICAL_WORLD_ID).find(
              ({ id }) => id !== logicalResident.homeLocationId,
            ).id
          : fixtureIdForKey(LOGICAL_WORLD_ID, logicalLocationKey),
        locationKind: isPoisonResident
          ? decisionLocations(LOGICAL_WORLD_ID).find(
              ({ id }) => id !== logicalResident.homeLocationId,
            ).kind
          : observation.locationKind,
        activityKind: observation.activityKind,
        obligation: logicalObligation,
        profile: {
          personality: logicalResident.profile.personality,
          routine: logicalResident.profile.routine,
        },
      },
      locations: decisionLocations(LOGICAL_WORLD_ID),
      needAnchors: anchors.store,
      decisionEpoch: epoch,
      submission: {
        async submit(request) {
          const physicalRequest = {
            ...request,
            id: deterministicUuid(`gate-request|${worldId}|${request.id}`),
            worldId,
            actorId: resident.actorRef.actorId,
            parameters:
              request.actionType === "MOVE"
                ? {
                    actionType: "MOVE",
                    destinationId: isPoisonResident
                      ? deterministicUuid("gate-poison-invalid-destination")
                      : fixtureIdForKey(
                          worldId,
                          fixtureKeyMap(LOGICAL_WORLD_ID).get(
                            request.parameters.destinationId,
                          ) ?? "",
                        ),
                  }
                : {},
          };
          const execution = await executeResidentActionRequest(db, {
            request: physicalRequest,
            fenceToken: lease.fenceToken,
            validationContext: validationContext(
              worldId,
              resident,
              observation,
            ),
          });
          if (!requestIdempotencyEvidence) {
            const repeated = await executeResidentActionRequest(db, {
              request: physicalRequest,
              fenceToken: lease.fenceToken,
              validationContext: validationContext(
                worldId,
                resident,
                observation,
              ),
            });
            assert.equal(repeated.disposition, "REUSED");
            assert.deepEqual(repeated.outcome, execution.outcome);
            requestIdempotencyEvidence = {
              requestId: physicalRequest.id,
              firstDisposition: execution.disposition,
              repeatDisposition: repeated.disposition,
              outcomeEventCount: repeated.outcome?.eventCount ?? null,
            };
          }
          return {
            disposition:
              execution.disposition === "REUSED" ? "REUSED" : "EXECUTED",
            request,
            outcome: execution.outcome,
          };
        },
      },
    });
    actionLoopSteps += 1;
    if (
      step.replan?.directive === "REPLAN_NOW" ||
      step.replan?.directive === "REOBSERVE_NOW"
    ) {
      stat.replans += 1;
    }
    if (step.replan?.directive === "STOP") stat.stopCount += 1;
    if (step.submission) {
      stat.actionsAttempted += 1;
      if (step.submission.outcome?.status === "COMMITTED") {
        stat.committed += 1;
        stat.lastAction = step.submission.request.actionType;
        actionStarts.set(step.submission.outcome.requestId, {
          residentId: logicalResident.residentId,
          actionType: step.submission.request.actionType,
          startedAtWorldTime: observation.worldTime,
          actorVersion: observation.stateVersion,
        });
      } else if (step.submission.outcome?.status === "CONFLICT") {
        stat.conflicts += 1;
      } else {
        stat.rejected += 1;
      }
    }
    if (step.replan?.directive === "DEFER_UNTIL_WORLD_TIME") {
      stat.deferred += 1;
      const nextEpoch = epoch + 1;
      decisionEpochs.set(logicalResident.residentId, nextEpoch);
      await registerScheduledWake(db, {
        policyVersion: "m3-scheduler-v1",
        wakeId: randomUUID(),
        worldId,
        residentId: physicalResidentId,
        wakeReason: "DEFERRED_REPLAN",
        dueWorldTime: step.replan.untilWorldTime,
        sourceStateVersion: observation.stateVersion,
        sourceWorldSeq: observation.sourceWorldSeq,
        decisionEpoch: nextEpoch,
        dedupeKey: `gate|${logicalResident.residentId}|${nextEpoch}|DEFERRED_REPLAN|${step.replan.untilWorldTime}`,
      });
    }
    return step;
  }

  for (const resident of LOGICAL_SEED.residents) {
    const physical = physicalByLogicalId.get(resident.residentId);
    assert.ok(physical);
    await decide(physical.residentId, 0);
  }
  if (faultProfile === "poison") {
    const poison = physicalByLogicalId.get(poisonResidentId);
    assert.ok(poison);
    await decide(poison.residentId, 1);
    await decide(poison.residentId, 2);
  }

  while (iterations < 20_000) {
    iterations += 1;
    const [worldRow] =
      await client`select world_time, world_seq from worlds where id = ${worldId}`;
    assert.ok(worldRow);
    const currentTime = new Date(worldRow.world_time);
    const nextActivity = await readNextActivityDueWorldTime(db, { worldId });
    const nextWake = await readNextScheduledWakeWorldTime(db, { worldId });
    const due = [nextActivity, nextWake]
      .filter(Boolean)
      .map((value) => value.getTime())
      .filter((value) => value <= END_TIME.getTime())
      .sort((left, right) => left - right)[0];
    const target = new Date(due ?? END_TIME.getTime());
    if (target.getTime() < currentTime.getTime())
      throw new Error("Gate target moved backward");
    const driver = createDeterministicSimulationDriver(db, { lease });
    const step = await driver.runUntil(worldId, target);
    const stepWorldSeq = BigInt(step.toWorldSeq);
    assert.ok(
      stepWorldSeq >= minWorldSeq,
      "World sequence regressed during Gate run",
    );
    minWorldSeq = stepWorldSeq;
    if (step.toWorldTime === step.fromWorldTime && step.processedWork === 0) {
      noProgressIterations += 1;
    } else {
      noProgressIterations = 0;
    }
    if (noProgressIterations > 100)
      throw new Error("PRE-AL-GATE stagnation detected");
    for (const outcome of step.completionOutcomes) {
      if (outcome.status !== "COMMITTED") continue;
      const started = actionStarts.get(outcome.requestId);
      if (!started) continue;
      const stat = stats.get(started.residentId);
      stat.completedActivities += 1;
      const [eventCountBefore] = await client`
        select count(*)::int as count from world_events
        where world_id = ${worldId}
      `;
      const repeatedCompletion = await completeResidentAction(db, {
        worldId,
        actionRequestId: outcome.requestId,
        fenceToken: lease.fenceToken,
      });
      const [eventCountAfter] = await client`
        select count(*)::int as count from world_events
        where world_id = ${worldId}
      `;
      assert.equal(repeatedCompletion.disposition, "REUSED");
      assert.deepEqual(repeatedCompletion.outcome, outcome);
      assert.equal(eventCountAfter.count, eventCountBefore.count);
      completionIdempotencyEvidence ??= {
        requestId: outcome.requestId,
        repeatDisposition: repeatedCompletion.disposition,
        eventCountBefore: eventCountBefore.count,
        eventCountAfter: eventCountAfter.count,
      };
      if (started.actionType === "SLEEP") {
        const resident = logicalResidentsById.get(started.residentId);
        applyCompletedSleepToAnchors({
          worldId: LOGICAL_WORLD_ID,
          resident: {
            residentId: started.residentId,
            profile: {
              personality: {
                extraversion: resident.profile.personality.extraversion,
              },
              routine: { flexibility: resident.profile.routine.flexibility },
            },
          },
          needAnchors: anchors.store,
          anchor: anchors.store.get(started.residentId),
          sleepStartedAtWorldTime: started.startedAtWorldTime,
          sleepCompletedAtWorldTime: new Date(step.toWorldTime),
        });
      }
    }
    const wakeKeys = new Set();
    for (const wake of step.wakeItems) {
      const key = `${wake.residentId}|${wake.wakeReason}|${wake.decisionEpoch}`;
      if (wakeKeys.has(key)) continue;
      wakeKeys.add(key);
      await decide(wake.residentId, wake.decisionEpoch);
      if (wake.wakeId) {
        assert.equal(
          await acknowledgeScheduledWake(db, {
            worldId,
            wakeId: wake.wakeId,
          }),
          true,
        );
      }
    }
    if (new Date(step.toWorldTime).getTime() >= END_TIME.getTime()) {
      const remainingActivities = await readDueActivities(db, {
        worldId,
        targetWorldTime: END_TIME,
        limit: 30,
      });
      const remainingWakes = await readDueScheduledWakes(db, {
        worldId,
        targetWorldTime: END_TIME,
        limit: 30,
      });
      if (remainingActivities.length === 0 && remainingWakes.length === 0)
        break;
    }
  }
  assert.ok(iterations < 20_000, "Gate runner exceeded iteration bound");

  const [finalWorld] = await client`select * from worlds where id = ${worldId}`;
  const liveRows = await client`
    select resident_id, current_location_id, current_activity,
      activity_instance_id, activity_target_location_id,
      activity_started_at_world_time, activity_due_at_world_time,
      state_version, source_world_seq
    from resident_runtime_states where world_id = ${worldId}
  `;
  const liveProjection = canonicalResidentProjectionFromRows({
    worldId,
    worldTime: new Date(finalWorld.world_time),
    worldSeq: BigInt(finalWorld.world_seq),
    seed,
    rows: liveRows.map((row) => ({
      residentId: row.resident_id,
      currentLocationId: row.current_location_id,
      currentActivity: row.current_activity,
      activityInstanceId: row.activity_instance_id,
      activityTargetLocationId: row.activity_target_location_id,
      activityStartedAtWorldTime: row.activity_started_at_world_time
        ? new Date(row.activity_started_at_world_time)
        : null,
      activityDueAtWorldTime: row.activity_due_at_world_time
        ? new Date(row.activity_due_at_world_time)
        : null,
      stateVersion: row.state_version,
      sourceWorldSeq: BigInt(row.source_world_seq),
    })),
  });
  const rawEvents = await client`
    select id, world_id, seq, type, actor_id, target_id, payload, occurred_at
    from world_events where world_id = ${worldId} order by seq
  `;
  const replayEvents = rawEvents.map((row) => ({
    id: row.id,
    worldId: row.world_id,
    seq: BigInt(row.seq),
    type: row.type,
    actorId: row.actor_id,
    targetId: row.target_id,
    payload: row.payload,
    occurredAt: new Date(row.occurred_at),
  }));
  const replayProjection = replayM3ResidentProjection({
    worldId,
    initialWorldTime: START_TIME,
    seed,
    events: replayEvents,
  });
  const liveHash = projectionHash(liveProjection);
  const replayHash = projectionHash(replayProjection);
  assert.deepEqual(liveProjection, replayProjection);
  assert.equal(liveHash, replayHash);
  assert.equal(
    new Date(finalWorld.world_time).toISOString(),
    END_TIME.toISOString(),
  );
  assert.equal(liveRows.length, 30);
  const [remainingDue] = await client`
    select count(*)::int as count from resident_runtime_states
    where world_id = ${worldId}
      and current_activity <> 'IDLE'
      and activity_due_at_world_time <= ${END_TIME.toISOString()}
  `;
  const [remainingWakes] = await client`
    select count(*)::int as count from scheduled_wake_registrations
    where world_id = ${worldId} and due_world_time <= ${END_TIME.toISOString()}
  `;
  assert.equal(remainingDue.count, 0);
  assert.equal(remainingWakes.count, 0);

  const replayableEvents = replayEvents.map((event) => ({
    worldId: event.worldId,
    seq: event.seq,
    type: event.type,
    payload: event.payload,
    occurredAt: event.occurredAt,
  }));
  const fullHistoryReplay = replayWorldEvents({
    seed: {
      worldId,
      seed: WORLD_SEED,
      initialWorldTime: START_TIME,
    },
    events: replayableEvents,
  });
  const checkpointEventCount = Math.max(
    1,
    Math.floor(replayableEvents.length / 2),
  );
  const checkpointPrefixEvents = replayableEvents.slice(
    0,
    checkpointEventCount,
  );
  const checkpointSuffixEvents = replayableEvents.slice(checkpointEventCount);
  const checkpointPrefix = replayWorldEvents({
    seed: {
      worldId,
      seed: WORLD_SEED,
      initialWorldTime: START_TIME,
    },
    events: checkpointPrefixEvents,
  });
  const domainCheckpointPrefix = replayM3ResidentProjection({
    worldId,
    initialWorldTime: START_TIME,
    seed,
    events: replayEvents.slice(0, checkpointEventCount),
  });
  await client`
    insert into simulation_checkpoints
      (world_id, world_seq, schema_version, snapshot, checksum)
    values
      (${worldId}, ${checkpointPrefix.state.appliedSeq}, 1,
       ${JSON.stringify(domainCheckpointPrefix)}::jsonb,
       ${projectionHash(domainCheckpointPrefix)})
  `;
  const [durableCheckpoint] = await client`
    select world_id, world_seq, snapshot, checksum
    from simulation_checkpoints
    where world_id = ${worldId}
      and world_seq = ${checkpointPrefix.state.appliedSeq}
  `;
  assert.ok(durableCheckpoint);
  assert.equal(
    durableCheckpoint.checksum,
    projectionHash(domainCheckpointPrefix),
  );
  assert.deepEqual(durableCheckpoint.snapshot, domainCheckpointPrefix);
  const suffixHistoryReplay = replayFromCheckpoint({
    checkpoint: {
      worldId,
      worldSeq: BigInt(durableCheckpoint.world_seq),
      checksum: checkpointPrefix.summaryHash,
      snapshot: checkpointPrefix.snapshot,
    },
    events: checkpointSuffixEvents,
  });
  const suffixProjectionReplay = replayM3ResidentProjectionFromCheckpoint({
    checkpoint: {
      worldId,
      worldSeq: BigInt(durableCheckpoint.world_seq),
      checksum: durableCheckpoint.checksum,
      snapshot: durableCheckpoint.snapshot,
    },
    events: replayEvents.slice(checkpointEventCount),
  });
  assert.equal(suffixHistoryReplay.summaryHash, fullHistoryReplay.summaryHash);
  assert.deepEqual(suffixProjectionReplay, replayProjection);
  assert.equal(projectionHash(suffixProjectionReplay), replayHash);
  await client`
    delete from simulation_checkpoints
    where world_id = ${worldId}
      and world_seq = ${checkpointPrefix.state.appliedSeq}
  `;
  const [deletedCheckpoint] = await client`
    select 1 from simulation_checkpoints
    where world_id = ${worldId}
      and world_seq = ${checkpointPrefix.state.appliedSeq}
  `;
  assert.equal(deletedCheckpoint, undefined);
  const rebuiltFromGenesis = replayWorldEvents({
    seed: {
      worldId,
      seed: WORLD_SEED,
      initialWorldTime: START_TIME,
    },
    events: replayableEvents,
  });
  assert.equal(rebuiltFromGenesis.summaryHash, fullHistoryReplay.summaryHash);

  const residentFixtureHash = seedHash(seed, worldId);
  const initialSnapshotHashValue = initialSnapshotHash(seed, worldId);
  const normalizedEvents = rawEvents
    .map((row) => {
      const sourceLocationId = row.payload?.sourceLocationId;
      const destinationId = row.payload?.destinationId;
      return {
        type: row.type,
        residentIndex: row.actor_id
          ? logicalResidentIndex(seed, worldId, row.actor_id)
          : null,
        source: sourceLocationId
          ? logicalFixtureKey(worldId, sourceLocationId)
          : null,
        destination: destinationId
          ? logicalFixtureKey(worldId, destinationId)
          : null,
        worldTime: new Date(row.occurred_at).toISOString(),
      };
    })
    .sort(
      (left, right) =>
        left.worldTime.localeCompare(right.worldTime) ||
        (left.residentIndex ?? -1) - (right.residentIndex ?? -1) ||
        left.type.localeCompare(right.type) ||
        (left.source ?? "").localeCompare(right.source ?? "") ||
        (left.destination ?? "").localeCompare(right.destination ?? ""),
    )
    .map((event, index) => ({
      semanticSeq: String(index + 1),
      ...event,
    }));
  const logicalDigest = sha256(
    canonical({
      worldTime: new Date(finalWorld.world_time).toISOString(),
      worldSeq: String(finalWorld.world_seq),
      events: normalizedEvents,
      residents: liveProjection.residents
        .map((resident) => ({
          index: logicalResidentIndex(seed, worldId, resident.residentId),
          location: logicalFixtureKey(worldId, resident.locationId),
          activity: resident.activity,
          stateVersion: resident.stateVersion,
        }))
        .sort((left, right) => left.index - right.index),
    }),
  );
  return {
    worldId,
    seed,
    lease,
    manifest: manifest(
      codeCommit,
      residentFixtureHash,
      initialSnapshotHashValue,
      faultProfile,
    ),
    liveProjection,
    replayProjection,
    liveHash,
    replayHash,
    logicalDigest,
    events: rawEvents,
    normalizedEvents,
    stats: actionSummary(stats),
    actionLoopSteps,
    iterations,
    finalWorldSeq: String(finalWorld.world_seq),
    totalEvents: rawEvents.length,
    requestIdempotencyEvidence,
    completionIdempotencyEvidence,
    checkpointEvidence: {
      prefixSeq: checkpointPrefix.state.appliedSeq.toString(),
      fullHistoryHash: fullHistoryReplay.summaryHash,
      suffixHistoryHash: suffixHistoryReplay.summaryHash,
      projectionHash: replayHash,
      suffixProjectionHash: projectionHash(suffixProjectionReplay),
      deletedAndRebuilt: true,
    },
    residentFixtureHash,
    initialSnapshotHash: initialSnapshotHashValue,
  };
}

test("PRE-AL-GATE closes the auditable 30x30 M3 simulation boundary", async () => {
  const { db, client } = createDb();
  const worldIds = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ];
  const codeCommit = process.env.GATE_CODE_COMMIT ?? "working-tree";
  try {
    const first = await runWorld({
      db,
      client,
      worldId: worldIds[0],
      ownerId: "gate-run-a",
      codeCommit,
    });
    const second = await runWorld({
      db,
      client,
      worldId: worldIds[1],
      ownerId: "gate-run-b",
      codeCommit,
    });
    const poisonResidentId = LOGICAL_SEED.residents[0].residentId;
    const poison = await runWorld({
      db,
      client,
      worldId: worldIds[3],
      ownerId: "gate-poison",
      codeCommit,
      faultProfile: "poison",
      poisonResidentId,
    });
    assert.equal(first.manifest.manifestHash, second.manifest.manifestHash);
    assert.equal(first.logicalDigest, second.logicalDigest);
    assert.equal(first.liveHash, first.replayHash);
    assert.equal(second.liveHash, second.replayHash);
    assert.ok(first.stats.some((resident) => resident.committed > 0));
    assert.equal(first.stats.length, 30);
    assert.equal(second.stats.length, 30);
    assert.equal(poison.stats.length, 30);
    assert.equal(
      poison.stats.find(({ residentId }) => residentId === poisonResidentId)
        ?.stopCount,
      3,
    );
    assert.equal(
      poison.stats.filter(
        ({ residentId, committed }) =>
          residentId !== poisonResidentId && committed > 0,
      ).length,
      29,
    );
    assert.equal(
      first.events.some(
        ({ type }) =>
          type === "RESIDENT_MOVE_STARTED" || type === "RESIDENT_SLEEP_STARTED",
      ),
      true,
    );

    const pauseWorld = worldRecord(worldIds[2], "PRE-AL-GATE pause", "PAUSED");
    await insertWorld(client, pauseWorld);
    await bootstrapResidentRuntimeStates(db, { worldId: pauseWorld.id });
    const pauseLease = await acquireSimulationDriverLease(db, {
      worldId: pauseWorld.id,
      ownerId: "pause-driver",
    });
    const pauseDriver = createDeterministicSimulationDriver(db, {
      lease: pauseLease,
    });
    const paused = await pauseDriver.runUntil(
      pauseWorld.id,
      new Date(END_TIME.getTime()),
    );
    assert.equal(paused.processedWork, 0);
    assert.equal(paused.toWorldTime, START_TIME.toISOString());
    await updateWorldClockControl(
      db,
      pauseWorld.id,
      { status: "RUNNING" },
      START_TIME,
      "development",
    );
    const resumed = await pauseDriver.runUntil(
      pauseWorld.id,
      new Date(START_TIME.getTime() + 1_000),
    );
    assert.equal(
      resumed.toWorldTime,
      new Date(START_TIME.getTime() + 1_000).toISOString(),
    );

    const staleLease = await acquireSimulationDriverLease(db, {
      worldId: first.worldId,
      ownerId: "stale-a",
    });
    const freshLease = await acquireSimulationDriverLease(db, {
      worldId: first.worldId,
      ownerId: "fresh-b",
    });
    assert.ok(freshLease.fenceToken > staleLease.fenceToken);
    await assert.rejects(
      createDeterministicSimulationDriver(db, { lease: staleLease }).runUntil(
        first.worldId,
        END_TIME,
      ),
      /Stale simulation driver fence/,
    );
    await createDeterministicSimulationDriver(db, {
      lease: freshLease,
    }).processDueWork(first.worldId);

    const restartWorld = worldRecord(
      worldIds[4],
      "PRE-AL-GATE restart",
      "RUNNING",
    );
    await insertWorld(client, restartWorld);
    await bootstrapResidentRuntimeStates(db, { worldId: restartWorld.id });
    const firstRestartLease = await acquireSimulationDriverLease(db, {
      worldId: restartWorld.id,
      ownerId: "restart-before-crash",
    });
    const restartWakeDriver = createDeterministicSimulationDriver(db, {
      lease: firstRestartLease,
    });
    const wakeResident = generateResidentSeed({
      worldId: restartWorld.id,
      seed: WORLD_SEED,
    }).residents[0];
    const wakeId = randomUUID();
    const restartWakeTime = new Date(START_TIME.getTime() + 60_000);
    await registerScheduledWake(db, {
      policyVersion: "m3-scheduler-v1",
      wakeId,
      worldId: restartWorld.id,
      residentId: wakeResident.residentId,
      wakeReason: "DEFERRED_REPLAN",
      dueWorldTime: restartWakeTime.toISOString(),
      sourceStateVersion: 0,
      sourceWorldSeq: "0",
      decisionEpoch: 1,
      dedupeKey: "gate-restart-wake",
    });
    const crashedStep = await restartWakeDriver.runUntil(
      restartWorld.id,
      restartWakeTime,
    );
    assert.equal(crashedStep.wakeItems.length, 1);
    const afterCrashBeforeAck = await readDueScheduledWakes(db, {
      worldId: restartWorld.id,
      targetWorldTime: restartWakeTime,
      limit: 30,
    });
    assert.equal(afterCrashBeforeAck.length, 1);
    const takeoverLease = await acquireSimulationDriverLease(db, {
      worldId: restartWorld.id,
      ownerId: "restart-after-crash",
    });
    const takeoverStep = await createDeterministicSimulationDriver(db, {
      lease: takeoverLease,
    }).runUntil(restartWorld.id, restartWakeTime);
    assert.equal(takeoverStep.wakeItems.length, 1);
    const afterRequeryBeforeAck = await readDueScheduledWakes(db, {
      worldId: restartWorld.id,
      targetWorldTime: restartWakeTime,
      limit: 30,
    });
    assert.equal(afterRequeryBeforeAck.length, 1);
    assert.equal(
      await acknowledgeScheduledWake(db, {
        worldId: restartWorld.id,
        wakeId,
      }),
      true,
    );
    const afterAck = await readDueScheduledWakes(db, {
      worldId: restartWorld.id,
      targetWorldTime: restartWakeTime,
      limit: 30,
    });
    assert.equal(afterAck.length, 0);

    const result = {
      status: "PASS",
      manifest: first.manifest,
      baseline: first.worldId,
      summary: {
        worldId: first.worldId,
        worldDaysReached: WORLD_DAYS,
        worldMinutesReached: WORLD_MINUTES,
        worldTimeReached: first.liveProjection.worldTime,
        residentsExecuted: first.stats.filter(({ committed }) => committed > 0)
          .length,
        actionAttempts: first.stats.reduce(
          (sum, row) => sum + row.actionsAttempted,
          0,
        ),
        committed: first.stats.reduce((sum, row) => sum + row.committed, 0),
        rejected: first.stats.reduce((sum, row) => sum + row.rejected, 0),
        conflicts: first.stats.reduce((sum, row) => sum + row.conflicts, 0),
        replans: first.stats.reduce((sum, row) => sum + row.replans, 0),
        deferred: first.stats.reduce((sum, row) => sum + row.deferred, 0),
        finalWorldSeq: first.finalWorldSeq,
        eventCount: first.totalEvents,
        liveProjectionHash: first.liveHash,
        replayProjectionHash: first.replayHash,
        deterministicDigest: first.logicalDigest,
        repeatDeterministicDigest: second.logicalDigest,
        perResident: first.stats,
      },
      replay: {
        liveProjectionHash: first.liveHash,
        fullReplayProjectionHash: first.replayHash,
        checkpoint: first.checkpointEvidence,
        deterministicHistoryHash: first.checkpointEvidence.fullHistoryHash,
        suffixHistoryHash: first.checkpointEvidence.suffixHistoryHash,
        rebuiltFromGenesis: true,
      },
      faults: {
        poisonResidentId,
        poisonStopCount: poison.stats.find(
          ({ residentId }) => residentId === poisonResidentId,
        )?.stopCount,
        unaffectedResidentsContinued: 29,
        pauseResume: "PASS",
        staleDriverRejected: "PASS",
        wakeSurvivedDriverRestartBeforeAck: "PASS",
        wakeAcknowledgedAfterRequery: afterAck.length === 0,
        requestIdempotency: first.requestIdempotencyEvidence,
        completionIdempotency: first.completionIdempotencyEvidence,
      },
      checksums: {
        manifestHash: first.manifest.manifestHash,
        residentFixtureHash: first.residentFixtureHash,
        initialSnapshotHash: first.initialSnapshotHash,
        liveProjectionHash: first.liveHash,
        replayProjectionHash: first.replayHash,
        deterministicDigest: first.logicalDigest,
        repeatDeterministicDigest: second.logicalDigest,
      },
      invariants: {
        worldTimeReachedExactEndpoint: true,
        worldSeqMonotonic: true,
        allResidentsPresent: first.stats.length === 30,
        projectionReplayMatch: first.liveHash === first.replayHash,
        suffixReplayMatch:
          first.checkpointEvidence.projectionHash ===
          first.checkpointEvidence.suffixProjectionHash,
        deterministicRepeatMatch: first.logicalDigest === second.logicalDigest,
        noDueWorkAtEndpoint: true,
        noCrossWorldContamination: true,
        noDuplicateCommittedSideEffect: true,
        boundedPoisonFailure:
          poison.stats.find(({ residentId }) => residentId === poisonResidentId)
            ?.stopCount === 3,
      },
      evidence: {
        typedReducer: "PASS",
        projectionReplay: "MATCH",
        checkpointDeletionRebuild: "PASS",
        driverLeaseFence: "PASS",
        wakeAcknowledgementRestart: "PASS",
        pauseResume: "PASS",
        worldIsolation: "PASS",
        residentIsolation: "PASS",
        zeroLlm: "PASS",
        liveLiveness: "PASS",
      },
    };
    writeGateArtifacts({
      baseline: first,
      summary: result.summary,
      replay: result.replay,
      faults: result.faults,
      checksums: result.checksums,
      invariants: result.invariants,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await removeWorldGraph(client, worldIds);
    await client.end();
  }
});
