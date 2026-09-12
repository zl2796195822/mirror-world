/* CLIENT-C1.1 real-lifecycle observer verification harness.
 * Drives formal M3 production path on a disposable world, then validates
 * Client Projection v0 against real Event Ledger / runtime state.
 */
import { createHash, randomUUID } from "node:crypto";
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
  createDeterministicSimulationDriver,
  createPostgresObservationQuery,
  deriveWorkPreparationBoundary,
  executeResidentActionRequest,
  registerNextWorkPreparationWakes,
} from "@mirror/world-kernel";
import {
  buildClientEventFeed,
  buildClientWorldSnapshot,
} from "../dist/client-projection.js";

export const C11_START_TIME = new Date("2026-09-07T00:00:00.000Z");
export const C11_WORLD_SEED = "mirror-client-c1-1-real-lifecycle-v1";
export const C11_WORLD_ID = "00000000-0000-4000-8000-00000000c110";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

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

function available(value) {
  if (!value || value.status !== "AVAILABLE") {
    throw new Error(`Expected AVAILABLE capability, got ${value?.status}`);
  }
  return value;
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

function decisionLocations(worldId) {
  return getFirstStreetLocationFixtures(worldId).map(({ id, kind }) => ({
    id,
    kind,
  }));
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

async function insertWorld(client, world) {
  await client`
    insert into worlds
      (id, name, timezone, status, seed, world_time, clock_anchor_at, time_scale)
    values
      (${world.id}, ${world.name}, ${world.timezone}, ${world.status},
       ${world.seed}, ${world.worldTime.toISOString()},
       ${world.clockAnchorAt.toISOString()}, 1)
  `;
}

async function readWorldRow(client, worldId) {
  const [row] = await client`
    select id, seed, status, world_time, world_seq
    from worlds where id = ${worldId}
  `;
  if (!row) throw new Error(`World ${worldId} missing`);
  return row;
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
  if (eventIds.length === 0) return;
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
    const participantActor = seed.residents.find(
      ({ actorRef }) => actorRef.actorId === payload.participantActorId,
    );
    if (participantActor) {
      applyEffect(participantActor, payload.needEffect);
    }
  }
}

function summarizeEvents(events) {
  const counts = {};
  const byType = {};
  for (const event of events) {
    const eventType = event.eventType ?? event.type ?? "UNKNOWN";
    counts[eventType] = (counts[eventType] ?? 0) + 1;
    const prefix = eventType
      .replace(/^RESIDENT_/, "")
      .replace(/_(STARTED|COMPLETED)$/, "");
    byType[prefix] = (byType[prefix] ?? 0) + 1;
  }
  return { counts, byType };
}

function actionCoverage(events) {
  const types = ["MOVE", "SLEEP", "EAT", "WORK", "TALK"];
  const coverage = {};
  for (const action of types) {
    const started = events.filter(
      (event) => event.eventType === `RESIDENT_${action}_STARTED`,
    );
    const completed = events.filter(
      (event) => event.eventType === `RESIDENT_${action}_COMPLETED`,
    );
    const example = started[0] ?? completed[0] ?? null;
    coverage[action] = {
      observed: started.length > 0 && completed.length > 0,
      startedEvents: started.length,
      completedEvents: completed.length,
      totalEvents: started.length + completed.length,
      residentExample: example?.residentId ?? null,
      participantExample: example?.participantId ?? null,
      exampleEventTypes: [
        ...new Set([...started, ...completed].map((event) => event.eventType)),
      ],
    };
  }
  return coverage;
}

export async function runClientC11LifecycleVerification(options = {}) {
  const {
    worldDays = options.worldDays ?? 2,
    worldId = options.worldId ?? C11_WORLD_ID,
    seed = options.seed ?? C11_WORLD_SEED,
    captureAtHours = options.captureAtHours ?? [0, 8, 20],
  } = options;

  const startedAt = Date.now();
  const database = createDb();
  const { db, client } = database;
  const targetTime = new Date(
    C11_START_TIME.getTime() + worldDays * 24 * 60 * 60_000,
  );

  const world = {
    id: worldId,
    name: "Client C1.1 real lifecycle",
    timezone: "UTC",
    status: "RUNNING",
    seed,
    worldTime: C11_START_TIME,
    clockAnchorAt: C11_START_TIME,
  };

  await insertWorld(client, world);
  await bootstrapResidentRuntimeStates(db, { worldId });
  await registerNextWorkPreparationWakes(db, { worldId });

  const fixture = generateResidentSeed({ worldId, seed });
  const residentById = new Map(
    fixture.residents.map((resident) => [resident.residentId, resident]),
  );
  const anchors = createResidentNeedAnchorStore();
  for (const resident of fixture.residents) {
    anchors.seed(resident.residentId, {
      worldTime: C11_START_TIME,
      activity: "AWAKE",
      hungerPressure: 20,
      restPressure: 20,
      socialPressure: 20,
    });
  }

  const lease = await acquireSimulationDriverLease(db, {
    worldId,
    ownerId: `client-c1-1-${worldId}`,
  });
  const driver = createDeterministicSimulationDriver(db, { lease });
  const query = createPostgresObservationQuery(db);
  const decisionEpochs = new Map(
    fixture.residents.map((resident) => [resident.residentId, 0]),
  );

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

  let worldWorldTime = C11_START_TIME.toISOString();

  const submitFor = (all, stateVersions) => ({
    async submit(request, submitOptions = {}) {
      const context = validationContext(worldId, all, stateVersions);
      const result = await executeResidentActionRequest(db, {
        request,
        validationContext: {
          world: {
            id: worldId,
            status: "RUNNING",
            worldTime: new Date(worldWorldTime),
          },
          actors: context.actors,
          locations: context.locations,
          items: context.items,
        },
        ...(submitOptions.expectedResourceVersion === undefined
          ? {}
          : {
              expectedResourceVersion: submitOptions.expectedResourceVersion,
            }),
        fenceToken: lease.fenceToken,
      });
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
    if (!snapshot || !resident) return;
    const observation = loopObservation(
      snapshot,
      all,
      new Date(worldWorldTime),
    );
    const stateVersion = state.stateVersions.get(residentId) ?? 0;
    const epoch = Math.max(
      decisionEpochs.get(residentId) ?? 0,
      wake.decisionEpoch ?? 0,
    );
    decisionEpochs.set(residentId, epoch);
    const worldRow = await readWorldRow(client, worldId);
    await runResidentActionLoopStepV2({
      world: {
        id: worldId,
        seed,
        status: "RUNNING",
        worldTime: new Date(worldWorldTime),
        worldSeq: String(worldRow.world_seq),
      },
      observation: {
        ...observation,
        stateVersion,
      },
      locations: decisionLocations(worldId),
      needAnchors: anchors.store,
      submission: submitFor(all, state.stateVersions),
      decisionEpoch: epoch,
      seed,
    });
    decisionEpochs.set(residentId, epoch + 1);
  }

  const initialWake = fixture.residents.map((resident) => {
    const dedupeKey = [
      "client-c1-1",
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
      dueWorldTime: C11_START_TIME.toISOString(),
      sourceStateVersion: 0,
      sourceWorldSeq: "0",
      decisionEpoch: 0,
      dedupeKey,
    };
  });
  for (const wake of initialWake) await registerScheduledWake(db, wake);

  const capturePoints = captureAtHours
    .map((hours) => new Date(C11_START_TIME.getTime() + hours * 60 * 60_000))
    .filter((time) => time <= targetTime)
    .sort((left, right) => left.getTime() - right.getTime());
  let nextCaptureIndex = 0;
  const snapshots = [];
  let iterations = 0;
  let worldWorldTimeDate = C11_START_TIME;

  const maybeCapture = async () => {
    if (nextCaptureIndex >= capturePoints.length) return;
    const capturePoint = capturePoints[nextCaptureIndex];
    if (worldWorldTimeDate < capturePoint) return;
    const snapshot = await buildClientWorldSnapshot(db, worldId);
    snapshots.push({
      capturedAtWorldTime: snapshot.worldTime,
      worldSeq: snapshot.worldSeq,
      worldStatus: snapshot.worldStatus,
      residentCount: snapshot.residents.length,
      placeCount: snapshot.places.length,
      activityDistribution: snapshot.residents.reduce((acc, resident) => {
        acc[resident.activity] = (acc[resident.activity] ?? 0) + 1;
        return acc;
      }, {}),
    });
    nextCaptureIndex += 1;
  };

  while (true) {
    iterations += 1;
    if (iterations > 50_000) {
      throw new Error("C1.1 lifecycle loop exceeded iteration budget");
    }
    const current = await readWorldRow(client, worldId);
    worldWorldTimeDate = new Date(current.world_time);
    worldWorldTime = worldWorldTimeDate.toISOString();
    await maybeCapture();
    if (worldWorldTimeDate >= targetTime) {
      // Ensure at least two snapshots for advancement evidence.
      while (snapshots.length < 2 && nextCaptureIndex < capturePoints.length) {
        nextCaptureIndex += 1;
        const snapshot = await buildClientWorldSnapshot(db, worldId);
        snapshots.push({
          capturedAtWorldTime: snapshot.worldTime,
          worldSeq: snapshot.worldSeq,
          worldStatus: snapshot.worldStatus,
          residentCount: snapshot.residents.length,
          placeCount: snapshot.places.length,
          activityDistribution: snapshot.residents.reduce((acc, resident) => {
            acc[resident.activity] = (acc[resident.activity] ?? 0) + 1;
            return acc;
          }, {}),
        });
      }
      break;
    }

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
    const nextDue = dueTimes.length
      ? new Date(Math.min(...dueTimes.map((value) => value.getTime())))
      : null;
    const nextCapture =
      nextCaptureIndex < capturePoints.length
        ? capturePoints[nextCaptureIndex]
        : null;

    const candidates = [targetTime];
    if (nextDue && nextDue > worldWorldTimeDate) candidates.push(nextDue);
    if (nextCapture && nextCapture > worldWorldTimeDate) {
      candidates.push(nextCapture);
    }
    candidates.push(new Date(worldWorldTimeDate.getTime() + 30 * 60_000));
    const target = new Date(
      Math.min(...candidates.map((value) => value.getTime())),
    );

    const step = await driver.runUntil(worldId, target);
    worldWorldTimeDate = new Date(step.toWorldTime);
    worldWorldTime = worldWorldTimeDate.toISOString();

    for (const outcome of step.completionOutcomes) {
      await applyCompletionEffects({
        client,
        worldId,
        outcome,
        seed: fixture,
        anchors,
      });
    }
    for (const wake of step.wakeItems) {
      if (wake.wakeId) {
        await acknowledgeScheduledWake(db, { worldId, wakeId: wake.wakeId });
      }
      if (new Date(worldWorldTime) >= targetTime) continue;
      await decideResident(wake.residentId, wake);
    }
  }

  const finalSnapshot = await buildClientWorldSnapshot(db, worldId);
  const eventFeed = await buildClientEventFeed(db, {
    worldId,
    afterSeq: "0",
    limit: 200,
  });
  const allEvents = [];
  let afterSeq = "0";
  for (let page = 0; page < 50; page += 1) {
    const feed = await buildClientEventFeed(db, {
      worldId,
      afterSeq,
      limit: 200,
    });
    allEvents.push(...feed.events);
    if (feed.events.length === 0) break;
    afterSeq = feed.nextAfterSeq;
  }

  const eventIds = allEvents.map((event) => event.eventId);
  const uniqueEventIds = new Set(eventIds);
  const seqs = allEvents.map((event) => Number(event.worldSeq));
  const ordered = seqs.every((seq, index) => {
    if (index === 0) return true;
    return seq > seqs[index - 1];
  });

  const coverage = actionCoverage(allEvents);
  const observedTypes = summarizeEvents(allEvents);

  const placeIds = new Set(finalSnapshot.places.map((place) => place.placeId));
  const residentsWithUnknownPlace = finalSnapshot.residents.filter(
    (resident) => !placeIds.has(resident.placeId),
  );

  const result = {
    schemaVersion: "client-c1-1-verification-v0",
    worldId,
    seed,
    horizonMinutes: worldDays * 24 * 60,
    startWorldTime: C11_START_TIME.toISOString(),
    finalWorldTime: finalSnapshot.worldTime,
    finalWorldSeq: finalSnapshot.worldSeq,
    residentCount: finalSnapshot.residents.length,
    placeCount: finalSnapshot.places.length,
    eventCount: allEvents.length,
    uniqueEventCount: uniqueEventIds.size,
    eventOrderingStrictlyIncreasing: ordered,
    duplicateEventIds: eventIds.length - uniqueEventIds.size,
    snapshots,
    finalSnapshotActivityDistribution: finalSnapshot.residents.reduce(
      (acc, resident) => {
        acc[resident.activity] = (acc[resident.activity] ?? 0) + 1;
        return acc;
      },
      {},
    ),
    eventTypeCounts: observedTypes.counts,
    actionCoverage: coverage,
    residentsWithUnknownPlace: residentsWithUnknownPlace.length,
    iterations,
    elapsedMs: Date.now() - startedAt,
    sampleResident: finalSnapshot.residents[0] ?? null,
    lastEvents: allEvents.slice(-20),
    eventExamples: Object.fromEntries(
      ["MOVE", "SLEEP", "EAT", "WORK", "TALK"].map((action) => {
        const events = allEvents.filter((event) =>
          event.eventType?.includes(action),
        );
        return [action, events.slice(0, 4)];
      }),
    ),
  };

  await client.end({ timeout: 5 });
  return result;
}

export async function cleanupClientC11World(worldId = C11_WORLD_ID) {
  const { client } = createDb();
  try {
    // world_events are append-only and FK to worlds; disposable DB owns cleanup.
    await client`delete from kernel_action_outcome_events where world_id = ${worldId}`;
    await client`delete from kernel_action_outcomes where world_id = ${worldId}`;
    await client`delete from action_requests where world_id = ${worldId}`;
    await client`delete from scheduled_wake_registrations where world_id = ${worldId}`;
    await client`delete from resident_resource_states where world_id = ${worldId}`;
    await client`delete from resident_runtime_states where world_id = ${worldId}`;
    await client`delete from simulation_checkpoints where world_id = ${worldId}`;
    await client`delete from simulation_driver_leases where world_id = ${worldId}`;
  } finally {
    await client.end({ timeout: 5 });
  }
}

export function createUniqueWorldId() {
  return randomUUID();
}
