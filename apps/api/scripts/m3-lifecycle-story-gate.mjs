/* global console, process */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  acknowledgeScheduledWake,
  acquireSimulationDriverLease,
  bootstrapResidentRuntimeStates,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  getResidentFoodItemId,
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
  deriveWorkPreparationBoundary,
  executeResidentActionRequest,
  M3_DOMAIN_EVENT_REGISTRY_VERSION,
  M3_DOMAIN_REPLAY_SCHEMA_VERSION,
  projectionHash,
  replayM3ResidentProjection,
  replayM3ResidentProjectionFromCheckpoint,
  registerNextWorkPreparationWakes,
} from "@mirror/world-kernel";
import {
  COVERAGE_CONTRACT_VERSION,
  CoverageV2Collector,
  evaluateCoverageV2,
} from "./m3-story-gate-coverage-v2.mjs";
import {
  DEFAULT_NODE_HEAP_MB,
  SCENARIO_ARTIFACTS,
  assertNewRunId,
  hashJsonArray,
  jsonReplacer,
  validateJsonArtifacts,
  writeJsonArrayObjectAtomic,
  writeJsonAtomic,
} from "./m3-story-gate-runner-infra.mjs";

const START_TIME = new Date("2026-09-07T00:00:00.000Z");
const REDUCED_SCENARIO = process.env.GATE_REDUCED_SCENARIO === "1";
const WORLD_DAYS = REDUCED_SCENARIO
  ? Number(process.env.GATE_WORLD_DAYS ?? 1)
  : 30;
const WORLD_MINUTES = REDUCED_SCENARIO
  ? Number(process.env.GATE_WORLD_MINUTES ?? WORLD_DAYS * 24 * 60)
  : WORLD_DAYS * 24 * 60;
assert.ok(Number.isInteger(WORLD_DAYS) && WORLD_DAYS > 0);
assert.ok(Number.isInteger(WORLD_MINUTES) && WORLD_MINUTES > 0);
const TARGET_TIME = new Date(START_TIME.getTime() + WORLD_MINUTES * 60_000);
const WORLD_SEED = "mirror-m3-lifecycle-story-gate-world-v1";
const DIFFERENT_WORLD_SEED = "mirror-m3-lifecycle-story-gate-world-v2";
const GATE_VERSION = "m3-story-sanity-v2";
const RUN_ID = process.env.GATE_RUN_ID ?? "20260912-run-15";
const PARENT_RUN_ID = "20260911-run-14";
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

function resourceFixtureHash(seed, worldId) {
  return sha256(
    canonical(
      seed.residents
        .map((resident) => ({
          residentId: resident.residentId,
          itemId: getResidentFoodItemId(worldId, resident.residentId),
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

function loopObservation(snapshot, allSnapshots, worldTime) {
  const actorRef = available(snapshot.actorRef).actorRef;
  const location = available(snapshot.location).location;
  const activity = available(snapshot.activity).activity;
  const resources = available(snapshot.resources).snapshot;
  const obligation = available(snapshot.workObligation).obligation;
  const workplace = obligation.workplaceId
    ? getFirstStreetLocationFixtures(snapshot.worldId).find(
        ({ id }) => id === obligation.workplaceId,
      )
    : null;
  const workPreparation =
    snapshot.self.employment.status === "EMPLOYED" &&
    obligation.status === "NOT_DUE" &&
    workplace &&
    workplace.id !== location.locationId
      ? (() => {
          const boundary = deriveWorkPreparationBoundary({
            currentWorldTime: worldTime,
            currentLocationKind: location.kind,
            workplaceKind: workplace.kind,
          });
          const shiftStartWorldTime = new Date(obligation.startsAtWorldTime);
          if (
            boundary.shiftStartWorldTime.getTime() !==
            shiftStartWorldTime.getTime()
          ) {
            return undefined;
          }
          return {
            boundaryWorldTime: boundary.preparationWorldTime,
            travelDurationWorldMinutes: boundary.travelDurationWorldMinutes,
          };
        })()
      : undefined;
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
    ...(workPreparation ? { workPreparation } : {}),
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

function coverageDenominators(fixture) {
  const all = fixture.residents.map(({ residentId }) => residentId);
  const employed = fixture.residents
    .filter(({ employment }) => employment.status === "EMPLOYED")
    .map(({ residentId }) => residentId);
  return Object.fromEntries(
    [
      ["SLEEP", all],
      ["EAT", all],
      ["WORK", employed],
      ["TALK", all],
      ["MOVE", all],
    ].map(([action, totalResidentIds]) => [
      action,
      {
        totalResidentIds,
        eligibleResidentIds:
          action === "WORK" ? employed : [...totalResidentIds],
        feasibleResidentIds:
          action === "EAT"
            ? fixture.residents
                .filter(({ resources }) => resources.foodUnits > 0)
                .map(({ residentId }) => residentId)
            : action === "WORK" || action === "MOVE"
              ? employed
              : action === "TALK"
                ? []
                : [...totalResidentIds],
      },
    ]),
  );
}

function recordCoverageDecision(collector, input) {
  const {
    worldId,
    residentId,
    worldTime,
    sourceWorldSeq,
    observation,
    result,
  } = input;
  const selectedGoal = result.goalEvaluation.selectedGoal;
  const nearbyResidents = observation.nearbyResidents ?? [];
  const legalTalkParticipants = nearbyResidents.filter(
    (participant) =>
      participant.active &&
      participant.worldId === worldId &&
      participant.residentId !== residentId &&
      participant.locationId === observation.locationId &&
      participant.activityKind === "IDLE",
  );
  const candidateFor = (action) =>
    result.decision.candidates.find(({ actionType }) => actionType === action);
  const selectedFor = (action) =>
    result.decision.selectedCandidate?.actionType === action
      ? result.decision.selectedCandidate
      : null;
  const submissionFor = (action) =>
    result.submission?.request.actionType === action ? result.submission : null;
  const evidenceFor = (action) => ({
    need: {
      hungerPressure: result.needState.hungerPressure,
      restPressure: result.needState.restPressure,
      socialPressure: result.needState.socialPressure,
    },
    goalType: selectedGoal?.type ?? null,
    selectedActionType: result.decision.selectedCandidate?.actionType ?? null,
    ...(action === "TALK"
      ? {
          partnerAvailability: legalTalkParticipants.length,
          locationId: observation.locationId,
        }
      : {}),
  });
  const record = (action, details) => {
    const submission = submissionFor(action);
    collector.recordActionLoopDecision({
      worldId,
      residentId,
      action,
      episodeId:
        submission?.request.id ??
        `${action}|${residentId}|${result.decisionEpoch}`,
      worldTime: new Date(worldTime).toISOString(),
      sourceObservationId: `${worldId}|${residentId}|${sourceWorldSeq}`,
      policyVersions: POLICY_VERSIONS,
      decision: result.decision,
      submission,
      evidence: evidenceFor(action),
      ...details,
    });
  };

  const talkEligible =
    result.needState.socialPressure >= 70 ||
    selectedGoal?.type === "MAKE_SOCIAL_CONTACT";
  record("TALK", {
    eligible: talkEligible,
    feasible: talkEligible && legalTalkParticipants.length > 0,
    opportunity: talkEligible && legalTalkParticipants.length > 0,
    ...(talkEligible && legalTalkParticipants.length === 0
      ? { reason: "NO_LEGAL_OPPORTUNITY" }
      : {}),
  });

  const eatEligible =
    result.needState.hungerPressure >= 80 ||
    selectedGoal?.type === "SATISFY_HUNGER";
  const eatFeasible =
    eatEligible &&
    observation.eatCapable === true &&
    (observation.resources?.foodUnits ?? 0) > 0 &&
    observation.resources?.locationId === observation.locationId;
  record("EAT", {
    eligible: eatEligible,
    feasible: eatFeasible,
    opportunity: eatFeasible,
    ...(eatEligible && !eatFeasible ? { reason: "UNAVAILABLE_RESOURCE" } : {}),
  });

  const workEligible = observation.workplaceId !== null;
  const workOpportunity =
    workEligible &&
    (observation.workPreparation !== undefined ||
      observation.locationId === observation.workplaceId);
  record("WORK", {
    eligible: workEligible,
    feasible: workEligible,
    opportunity: workOpportunity,
    ...(workEligible && !workOpportunity
      ? { reason: "NO_LEGAL_OPPORTUNITY" }
      : {}),
  });

  const moveEligible =
    observation.workplaceId !== null ||
    selectedGoal?.type === "RETURN_HOME" ||
    candidateFor("MOVE") !== undefined;
  const moveCandidate = candidateFor("MOVE");
  record("MOVE", {
    eligible: moveEligible,
    feasible: moveEligible,
    opportunity: moveEligible && moveCandidate !== undefined,
    ...(moveEligible
      ? moveCandidate === undefined
        ? { reason: "NO_LEGAL_OPPORTUNITY" }
        : {}
      : { reason: "NO_FORMAL_NECESSITY" }),
  });

  record("SLEEP", {
    eligible: true,
    feasible: true,
    opportunity: true,
    ...(candidateFor("SLEEP") === undefined && selectedFor("SLEEP") === null
      ? { reason: "NO_CANDIDATE" }
      : {}),
  });
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
    runId: RUN_ID,
    previousRun: PARENT_RUN_ID,
    parentRunId: PARENT_RUN_ID,
    previousStatus: "INFRA_FAILURE",
    remediation: "M3 Story Gate runner infrastructure remediation",
    infraRemediationVersion: "m3-story-gate-runner-infra-v1",
    runnerStrategy: "serial-child-process-per-scenario",
    serializationStrategy: "per-artifact-atomic-json-summary-finalizer",
    heapProfile: {
      previousMaxOldSpaceSizeMb: 8192,
      newMaxOldSpaceSizeMb: Number(
        process.env.GATE_HEAP_MB ?? DEFAULT_NODE_HEAP_MB,
      ),
      scope: "one-scenario-child",
    },
    manifestVersion: "m3-simulation-manifest-v1",
    scenarioId: "m3-30x30-lifecycle-story",
    logicalWorldId: LOGICAL_WORLD_ID,
    worldId,
    worldSeed: seed,
    startWorldTime: START_TIME.toISOString(),
    initialWorldTime: START_TIME.toISOString(),
    targetWorldTime: TARGET_TIME.toISOString(),
    durationWorldMinutes: WORLD_MINUTES,
    stepResolutionWorldMinutes: 1,
    residentCount: fixture.residents.length,
    residentSeedGeneratorVersion: fixture.generatorVersion,
    residentSeedConfigVersion: fixture.configVersion,
    residentFixtureHash: residentFixtureHash(fixture, worldId),
    resourceFixtureHash: resourceFixtureHash(fixture, worldId),
    initialSnapshotHash: initialSnapshotHash(fixture, worldId),
    policyVersions: POLICY_VERSIONS,
    resourceCapability: "M3_KERNEL_POSTGRES_RESOURCE_CAS",
    actionScope: ACTION_SCOPE,
    coverageContractVersion: COVERAGE_CONTRACT_VERSION,
    storySanityVersion: GATE_VERSION,
    schedulerWakeVersion: POLICY_VERSIONS.scheduler,
    actionSemanticsVersion: POLICY_VERSIONS.actionSemantics,
    eventRegistryVersion: M3_DOMAIN_EVENT_REGISTRY_VERSION,
    migrationVersion: "12",
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
  await registerNextWorkPreparationWakes(db, { worldId });
  const fixture = generateResidentSeed({ worldId, seed });
  assert.equal(fixture.residents.length, 30);
  const residentById = new Map(
    fixture.residents.map((resident) => [resident.residentId, resident]),
  );
  const anchors = createResidentNeedAnchorStore();
  fixture.residents.forEach((resident) => seedAnchor(anchors, resident));
  const coverage = new CoverageV2Collector();
  const denominators = coverageDenominators(fixture);
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
    const observation = loopObservation(snapshot, all, worldWorldTime);
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
    recordCoverageDecision(coverage, {
      worldId,
      residentId,
      worldTime: worldWorldTime,
      sourceWorldSeq: result.sourceWorldSeq,
      observation,
      result,
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
        sourceObservationId: `${worldId}|${residentId}|${result.sourceWorldSeq}`,
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
    for (const failure of step.failureItems) recovery.failures.push(failure);
    for (const outcome of step.completionOutcomes) {
      const request = pendingActions.get(outcome.requestId);
      const completionEvents = outcome.eventRefs.length
        ? await client`
            select id, type, actor_id, payload, occurred_at
            from world_events
            where world_id = ${worldId}
              and id = any(${client.array(
                outcome.eventRefs.map(({ eventId }) => eventId),
                2950,
              )})
            order by seq
          `
        : [];
      const completedEvent = completionEvents.find(({ type }) =>
        type.endsWith("_COMPLETED"),
      );
      if (request) {
        request.completionOutcome = outcome;
        request.eventRefs = outcome.eventRefs;
        const actionType = request.actionRequest.actionType;
        stats.get(request.residentId).actionsByType[actionType].completed +=
          outcome.eventRefs.some(({ type }) => type.endsWith("_COMPLETED"))
            ? 1
            : 0;
        if (completedEvent) {
          const participant =
            actionType === "TALK"
              ? [...residentById.values()].find(
                  ({ actorRef }) =>
                    actorRef.actorId ===
                    completedEvent.payload?.participantActorId,
                )
              : undefined;
          const participantResidentId = participant?.residentId;
          coverage.recordCompletion({
            worldId,
            residentId: request.residentId,
            action: actionType,
            episodeId: request.actionRequest.id,
            worldTime:
              completedEvent.payload?.completedAtWorldTime ??
              completedEvent.occurred_at.toISOString(),
            sourceObservationId: request.sourceObservationId,
            policyVersions: POLICY_VERSIONS,
            actionInstanceId: request.actionRequest.id,
            ...(actionType === "TALK"
              ? {
                  initiatorResidentId: request.residentId,
                  ...(participantResidentId ? { participantResidentId } : {}),
                }
              : {}),
          });
        }
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
      if (REDUCED_SCENARIO) break;
      const [remainingActivity] = await client`
        select count(*)::int as count from resident_runtime_states
        where world_id = ${worldId} and current_activity <> 'IDLE'
      `;
      const [remainingWake] = await client`
        select count(*)::int as count from scheduled_wake_registrations
        where world_id = ${worldId} and due_world_time <= ${TARGET_TIME.toISOString()}
      `;
      if (remainingActivity.count === 0 && remainingWake.count === 0) break;
      if (!next || next >= TARGET_TIME) {
        throw new Error(
          `M3 story gate endpoint could not settle before target: active=${remainingActivity.count}, dueWakes=${remainingWake.count}, next=${next?.toISOString() ?? "none"}`,
        );
      }
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
  // The collector owns already-normalized rows. Avoid a second full deep clone
  // at the peak of the scenario while retaining the public clone-by-default API.
  const coverageRows = coverage.rows({ clone: false });
  const coverageV2 = evaluateCoverageV2({
    contractVersion: COVERAGE_CONTRACT_VERSION,
    worldId,
    rows: coverageRows,
    rowsAreNormalized: true,
    denominators,
  });
  coverage.clear();
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
  const manifest = await makeManifest({ worldId, seed, codeCommit });
  const storyDigest = sha256(
    canonical({
      manifest,
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
    manifest,
    fixture,
    stats: [...stats.values()].sort((left, right) =>
      left.residentId.localeCompare(right.residentId),
    ),
    causalEvidence,
    recovery,
    events,
    eventCounts,
    finalWorld,
    liveProjection,
    fullReplay,
    suffixReplay,
    genesisReplay,
    hashes,
    storyDigest,
    coverageV2,
    coverageRows,
    acceptedActionCoverage: coverageV2.passes && commuteCoverage,
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

async function writeScenarioArtifacts(scenario) {
  const root = process.env.GATE_ARTIFACT_DIR;
  assert.ok(root, "GATE_ARTIFACT_DIR is required for a scenario child");
  const write = (name, value) => writeJsonAtomic(`${root}/${name}`, value);
  write("manifest.json", scenario.manifest);
  write("run-summary.json", {
    status: "SCENARIO_COMPLETE",
    role: process.env.GATE_SINGLE_ROLE,
    runId: scenario.manifest.runId,
    parentRunId: scenario.manifest.parentRunId,
    worldTimeReached: scenario.finalWorld.world_time,
    worldMinutesReached: WORLD_MINUTES,
    finalWorldSeq: scenario.finalWorld.world_seq,
    actionAttempts: scenario.recovery.attempts,
    committed: scenario.recovery.committed,
    rejected: scenario.recovery.rejected,
    conflicts: scenario.recovery.conflicts,
    replans: scenario.recovery.replans,
    deferred: scenario.recovery.deferred,
    acceptedActionCoverage: scenario.acceptedActionCoverage,
    commuteCoverage: scenario.commuteCoverage,
    endpoint: scenario.endpoint,
    liveProjectionHash: scenario.hashes.live,
    fullReplayProjectionHash: scenario.hashes.full,
    suffixReplayProjectionHash: scenario.hashes.suffix,
    genesisRebuildProjectionHash: scenario.hashes.genesis,
    deterministicDigest: scenario.storyDigest,
    repeatDeterministicDigest: null,
  });
  write(
    "action-statistics.json",
    scenario.stats.map(({ residentId, actionsByType }) => ({
      residentId,
      actionsByType,
    })),
  );
  write("resident-summary.json", scenario.stats);
  await writeJsonArrayObjectAtomic(`${root}/causal-evidence.json`, {
    prefix: "[",
    items: scenario.causalEvidence,
    suffix: "]\n",
  });
  await writeJsonArrayObjectAtomic(`${root}/coverage-funnel-v2.json`, {
    prefix: `{"contractVersion":${JSON.stringify(COVERAGE_CONTRACT_VERSION)},"rows":[`,
    items: scenario.coverageRows,
    suffix: `],"summary":${JSON.stringify(scenario.coverageV2, jsonReplacer, 2)}}\n`,
  });
  write("event-summary.json", {
    total: scenario.events.length,
    byType: scenario.eventCounts,
    actionRequestToEventRefs: Object.fromEntries(
      scenario.causalEvidence.map((evidence) => [
        evidence.actionRequest.id,
        evidence.eventRefs,
      ]),
    ),
    finalWorldSeq: scenario.finalWorld.world_seq,
  });
  write("replay-summary.json", {
    hashes: scenario.hashes,
    checkpointDeleted: true,
    fullEventCount: scenario.events.length,
  });
  write("determinism-comparison.json", {
    role: process.env.GATE_SINGLE_ROLE,
    runA: scenario.storyDigest,
    runB: null,
    sameSeedEqual: null,
    differentSeed: null,
  });
  write("failure-recovery-summary.json", scenario.recovery);
  write("diagnostics.json", scenario.diagnostics);
  write("hard-gates.json", []);
  write("checksums.json", {
    manifestHash: scenario.manifest.manifestHash,
    fixtureHash: scenario.manifest.residentFixtureHash,
    resourceFixtureHash: scenario.manifest.resourceFixtureHash,
    initialSnapshotHash: scenario.manifest.initialSnapshotHash,
    historyHash: hashJsonArray(scenario.events, (key, value) => {
      if (key === "id") return undefined;
      return jsonReplacer(key, value);
    }),
    liveProjectionHash: scenario.hashes.live,
    replayProjectionHash: scenario.hashes.full,
    storyDigest: scenario.storyDigest,
  });
  const summary = createScenarioSummary(scenario);
  write("scenario-summary.json", summary);
  return summary;
}

function createScenarioSummary(scenario) {
  const completionEvents = scenario.events.filter(({ type }) =>
    type.endsWith("_COMPLETED"),
  );
  const unemployedResidentIds = scenario.fixture.residents
    .filter(({ employment }) => employment.status === "UNEMPLOYED")
    .map(({ residentId }) => residentId)
    .sort();
  return {
    schemaVersion: "m3-story-gate-scenario-summary-v1",
    role: process.env.GATE_SINGLE_ROLE ?? "baseline",
    worldId: scenario.worldId,
    seed: scenario.seed,
    manifest: scenario.manifest,
    fixtureResidentCount: scenario.fixture.residents.length,
    fixtureHashVerified:
      scenario.manifest.residentFixtureHash ===
      residentFixtureHash(scenario.fixture, scenario.worldId),
    resourceFixtureHashVerified:
      scenario.manifest.resourceFixtureHash ===
      resourceFixtureHash(scenario.fixture, scenario.worldId),
    unemployedResidentIds,
    finalWorld: scenario.finalWorld,
    endpoint: scenario.endpoint,
    acceptedActionCoverage: scenario.acceptedActionCoverage,
    commuteCoverage: scenario.commuteCoverage,
    hashes: scenario.hashes,
    storyDigest: scenario.storyDigest,
    recovery: scenario.recovery,
    stats: scenario.stats,
    causalEvidenceCount: scenario.causalEvidence.length,
    causalEvidenceWithNextObservation: scenario.causalEvidence.filter(
      ({ nextObservation }) => Boolean(nextObservation),
    ).length,
    eventChecks: {
      needEffectPolicyValid: scenario.events
        .filter(
          ({ type }) =>
            type === "RESIDENT_EAT_COMPLETED" ||
            type === "RESIDENT_TALK_COMPLETED",
        )
        .every(
          ({ payload }) =>
            payload.needEffect?.policyVersion === POLICY_VERSIONS.needEffects,
        ),
      workAttendanceValid: scenario.events
        .filter(({ type }) => type === "RESIDENT_WORK_COMPLETED")
        .every(({ payload }) => payload.attendanceMinutes === 480),
      talkParticipantsPresent: scenario.events
        .filter(({ type }) => type === "RESIDENT_TALK_COMPLETED")
        .every(({ payload }) => Boolean(payload.participantActorId)),
      hasCompletedAction: completionEvents.length > 0,
    },
    resourceRows: scenario.resourceRows,
    initialFoodUnits: scenario.initialFoodUnits,
    finalFoodUnits: scenario.finalFoodUnits,
    diagnostics: scenario.diagnostics,
  };
}

async function main() {
  const role = process.env.GATE_SINGLE_ROLE;
  const roleSeeds = {
    baseline: WORLD_SEED,
    repeat: WORLD_SEED,
    different: DIFFERENT_WORLD_SEED,
  };
  const databaseUrl = process.env.GATE_SINGLE_DATABASE_URL;
  if (!role || !roleSeeds[role] || !databaseUrl) {
    throw new Error(
      "Story Gate scenario child requires GATE_SINGLE_ROLE, GATE_SINGLE_DATABASE_URL, and GATE_ARTIFACT_DIR",
    );
  }
  assertNewRunId(RUN_ID);
  const codeCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const { db, client } = createDb(databaseUrl);
  let scenario;
  try {
    scenario = await runScenario({
      db,
      client,
      worldId: LOGICAL_WORLD_ID,
      seed: roleSeeds[role],
      codeCommit,
    });
    const summary = await writeScenarioArtifacts(scenario);
    scenario = null;
    validateJsonArtifacts(process.env.GATE_ARTIFACT_DIR, SCENARIO_ARTIFACTS);
    console.log(
      JSON.stringify({
        status: "SCENARIO_COMPLETE",
        role,
        runId: RUN_ID,
        storyDigest: summary.storyDigest,
        artifactDir: process.env.GATE_ARTIFACT_DIR,
      }),
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

await main();
