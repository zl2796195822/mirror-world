import { describe, expect, it } from "vitest";
import {
  generateResidentSeed,
  getResidentFoodItemId,
  getFirstStreetLocationFixtures,
} from "@mirror/db";
import {
  M3DomainReplayError,
  M3_DOMAIN_EVENT_REGISTRY_VERSION,
  M3_DOMAIN_REPLAY_SCHEMA_VERSION,
  M3_TYPED_EVENT_TYPES,
  canonicalResidentProjectionFromRows,
  projectionHash,
  replayM3ResidentProjection,
  replayM3ResidentProjectionFromCheckpoint,
  type M3ReplayEvent,
} from "./m3-domain-replay.js";
import { workObligationKey } from "./lifecycle-semantics.js";

const worldId = "00000000-0000-4000-8000-000000000099";
const start = new Date("2026-09-09T00:00:00.000Z");

function event(
  input: Partial<M3ReplayEvent> &
    Pick<M3ReplayEvent, "seq" | "type" | "payload">,
): M3ReplayEvent {
  return {
    id: `00000000-0000-4000-8000-${String(Number(input.seq)).padStart(12, "0")}`,
    worldId,
    seq: input.seq,
    type: input.type,
    actorId: input.actorId ?? null,
    targetId: input.targetId ?? null,
    payload: input.payload,
    occurredAt: input.occurredAt ?? start,
  };
}

describe("M3 typed resident projection replay", () => {
  it("registers the v2 lifecycle events and replays an EAT resource delta", () => {
    expect(M3_DOMAIN_EVENT_REGISTRY_VERSION).toBe(
      "m3-domain-event-registry-v2",
    );
    expect(M3_DOMAIN_REPLAY_SCHEMA_VERSION).toBe("m3-resident-projection-v2");
    expect(M3_TYPED_EVENT_TYPES).toEqual([
      "WORLD_TIME_ADVANCED",
      "RESIDENT_MOVE_STARTED",
      "RESIDENT_MOVE_COMPLETED",
      "RESIDENT_SLEEP_STARTED",
      "RESIDENT_SLEEP_COMPLETED",
      "RESIDENT_EAT_STARTED",
      "RESIDENT_EAT_COMPLETED",
      "RESIDENT_WORK_STARTED",
      "RESIDENT_WORK_COMPLETED",
      "RESIDENT_TALK_STARTED",
      "RESIDENT_TALK_COMPLETED",
    ]);

    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents[0];
    const started = new Date(start.getTime() + 10 * 60_000);
    const completed = new Date(start.getTime() + 40 * 60_000);
    const itemId = getResidentFoodItemId(worldId, resident.residentId);
    const events = [
      event({
        seq: 1n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: started,
        payload: {
          schemaVersion: 1,
          from: start.toISOString(),
          to: started.toISOString(),
        },
      }),
      event({
        seq: 2n,
        type: "RESIDENT_EAT_STARTED",
        actorId: resident.actorRef.actorId,
        occurredAt: started,
        payload: {
          schemaVersion: 1,
          actionType: "EAT",
          phase: "STARTED",
          actionRequestId: "00000000-0000-4000-8000-000000000101",
          activityInstanceId: "00000000-0000-4000-8000-000000000101",
          sourceLocationId: resident.homeLocationId,
          itemId,
          quantity: 1,
          startedAtWorldTime: started.toISOString(),
          dueAtWorldTime: completed.toISOString(),
          durationWorldMinutes: 30,
          policyVersion: "m3-lifecycle-semantics-v1",
          resourceEffect: {
            kind: "FOOD_UNITS_CONSUMED",
            beforeUnits: resident.resources.foodUnits,
            afterUnits: resident.resources.foodUnits - 1,
            beforeVersion: resident.resources.version,
            afterVersion: resident.resources.version + 1,
          },
        },
      }),
      event({
        seq: 3n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: completed,
        payload: {
          schemaVersion: 1,
          from: started.toISOString(),
          to: completed.toISOString(),
        },
      }),
      event({
        seq: 4n,
        type: "RESIDENT_EAT_COMPLETED",
        actorId: resident.actorRef.actorId,
        occurredAt: completed,
        payload: {
          schemaVersion: 1,
          actionType: "EAT",
          phase: "COMPLETED",
          actionRequestId: "00000000-0000-4000-8000-000000000101",
          activityInstanceId: "00000000-0000-4000-8000-000000000101",
          sourceLocationId: resident.homeLocationId,
          itemId,
          quantity: 1,
          startedAtWorldTime: started.toISOString(),
          dueAtWorldTime: completed.toISOString(),
          completedAtWorldTime: completed.toISOString(),
          durationWorldMinutes: 30,
          policyVersion: "m3-lifecycle-semantics-v1",
          needEffect: {
            kind: "HUNGER_PRESSURE_RELIEF",
            quantity: 1,
            policyVersion: "m3-need-effects-v1",
            reliefPoints: 55,
          },
        },
      }),
    ];

    const projection = replayM3ResidentProjection({
      worldId,
      initialWorldTime: start,
      seed,
      events,
    });
    expect(projection.residents[0]).toMatchObject({
      activity: "IDLE",
      foodUnits: resident.resources.foodUnits - 1,
      resourceVersion: resident.resources.version + 1,
      lastAteAtWorldTime: completed.toISOString(),
      stateVersion: 2,
    });
  });

  it("rejects a lifecycle event that jumps World Time without a clock event", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents[0];
    const future = new Date(start.getTime() + 10 * 60_000);
    const itemId = getResidentFoodItemId(worldId, resident.residentId);
    expect(() =>
      replayM3ResidentProjection({
        worldId,
        initialWorldTime: start,
        seed,
        events: [
          event({
            seq: 1n,
            type: "RESIDENT_EAT_STARTED",
            actorId: resident.actorRef.actorId,
            occurredAt: future,
            payload: {
              schemaVersion: 1,
              actionType: "EAT",
              phase: "STARTED",
              actionRequestId: "00000000-0000-4000-8000-000000000103",
              activityInstanceId: "00000000-0000-4000-8000-000000000103",
              sourceLocationId: resident.homeLocationId,
              itemId,
              quantity: 1,
              startedAtWorldTime: future.toISOString(),
              dueAtWorldTime: new Date(
                future.getTime() + 30 * 60_000,
              ).toISOString(),
              durationWorldMinutes: 30,
              policyVersion: "m3-lifecycle-semantics-v1",
              resourceEffect: {
                kind: "FOOD_UNITS_CONSUMED",
                beforeUnits: resident.resources.foodUnits,
                afterUnits: resident.resources.foodUnits - 1,
                beforeVersion: resident.resources.version,
                afterVersion: resident.resources.version + 1,
              },
            },
          }),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_TRANSITION" }));
  });

  it("replays WORK attendance without payroll and records the shift key", () => {
    const shiftStart = new Date("2026-09-14T09:00:00.000Z");
    const shiftEnd = new Date("2026-09-14T17:00:00.000Z");
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents.find(
      ({ employment }) => employment.status === "EMPLOYED",
    );
    const workplaceId =
      resident?.employment.status === "EMPLOYED"
        ? resident.employment.workplaceId
        : "";
    expect(resident).toBeDefined();
    const initial = replayM3ResidentProjection({
      worldId,
      initialWorldTime: new Date("2026-09-14T08:00:00.000Z"),
      seed,
      events: [],
    });
    const initialAtWork = {
      ...initial,
      residents: initial.residents.map((candidate) =>
        candidate.residentId === resident?.residentId
          ? { ...candidate, locationId: workplaceId }
          : candidate,
      ),
    };
    const shiftKey = workObligationKey(
      resident?.residentId ?? "",
      shiftStart.toISOString(),
    );
    const events = [
      event({
        seq: 1n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: shiftStart,
        payload: {
          schemaVersion: 1,
          from: initial.worldTime,
          to: shiftStart.toISOString(),
        },
      }),
      event({
        seq: 2n,
        type: "RESIDENT_WORK_STARTED",
        actorId: resident?.actorRef.actorId,
        targetId: workplaceId,
        occurredAt: shiftStart,
        payload: {
          schemaVersion: 1,
          actionType: "WORK",
          phase: "STARTED",
          actionRequestId: "00000000-0000-4000-8000-000000000102",
          activityInstanceId: "00000000-0000-4000-8000-000000000102",
          sourceLocationId: workplaceId,
          workplaceId,
          workObligationKey: shiftKey,
          shiftStartsAtWorldTime: shiftStart.toISOString(),
          shiftEndsAtWorldTime: shiftEnd.toISOString(),
          startedAtWorldTime: shiftStart.toISOString(),
          dueAtWorldTime: shiftEnd.toISOString(),
          durationWorldMinutes: 480,
          policyVersion: "m3-lifecycle-semantics-v1",
        },
      }),
      event({
        seq: 3n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: shiftEnd,
        payload: {
          schemaVersion: 1,
          from: shiftStart.toISOString(),
          to: shiftEnd.toISOString(),
        },
      }),
      event({
        seq: 4n,
        type: "RESIDENT_WORK_COMPLETED",
        actorId: resident?.actorRef.actorId,
        targetId: workplaceId,
        occurredAt: shiftEnd,
        payload: {
          schemaVersion: 1,
          actionType: "WORK",
          phase: "COMPLETED",
          actionRequestId: "00000000-0000-4000-8000-000000000102",
          activityInstanceId: "00000000-0000-4000-8000-000000000102",
          sourceLocationId: workplaceId,
          workplaceId,
          workObligationKey: shiftKey,
          shiftStartsAtWorldTime: shiftStart.toISOString(),
          shiftEndsAtWorldTime: shiftEnd.toISOString(),
          startedAtWorldTime: shiftStart.toISOString(),
          dueAtWorldTime: shiftEnd.toISOString(),
          completedAtWorldTime: shiftEnd.toISOString(),
          durationWorldMinutes: 480,
          attendanceMinutes: 480,
          policyVersion: "m3-lifecycle-semantics-v1",
        },
      }),
    ];
    const projection = replayM3ResidentProjectionFromCheckpoint({
      checkpoint: {
        worldId,
        worldSeq: 0n,
        checksum: projectionHash(initialAtWork),
        snapshot: initialAtWork,
      },
      events,
    });
    expect(
      projection.residents.find(
        ({ residentId }) => residentId === resident?.residentId,
      ),
    ).toMatchObject({
      activity: "IDLE",
      completedWorkShiftKeys: [shiftKey],
      stateVersion: 2,
    });
  });

  it("rejects an EAT item that is not the resident's world-scoped food item", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents[0];
    const started = new Date(start.getTime() + 10 * 60_000);
    const foreignItemId = getResidentFoodItemId(
      "00000000-0000-4000-8000-000000000100",
      resident.residentId,
    );

    expect(() =>
      replayM3ResidentProjection({
        worldId,
        initialWorldTime: start,
        seed,
        events: [
          event({
            seq: 1n,
            type: "WORLD_TIME_ADVANCED",
            occurredAt: started,
            payload: {
              schemaVersion: 1,
              from: start.toISOString(),
              to: started.toISOString(),
            },
          }),
          event({
            seq: 2n,
            type: "RESIDENT_EAT_STARTED",
            actorId: resident.actorRef.actorId,
            occurredAt: started,
            payload: {
              schemaVersion: 1,
              actionType: "EAT",
              phase: "STARTED",
              actionRequestId: "00000000-0000-4000-8000-000000000104",
              activityInstanceId: "00000000-0000-4000-8000-000000000104",
              sourceLocationId: resident.homeLocationId,
              itemId: foreignItemId,
              quantity: 1,
              startedAtWorldTime: started.toISOString(),
              dueAtWorldTime: new Date(
                started.getTime() + 30 * 60_000,
              ).toISOString(),
              durationWorldMinutes: 30,
              policyVersion: "m3-lifecycle-semantics-v1",
              resourceEffect: {
                kind: "FOOD_UNITS_CONSUMED",
                beforeUnits: resident.resources.foodUnits,
                afterUnits: resident.resources.foodUnits - 1,
                beforeVersion: resident.resources.version,
                afterVersion: resident.resources.version + 1,
              },
            },
          }),
        ],
      }),
    ).toThrow(M3DomainReplayError);
  });

  it("rejects WORK started away from the assigned workplace", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents.find(
      ({ employment }) => employment.status === "EMPLOYED",
    );
    expect(resident?.employment.status).toBe("EMPLOYED");
    if (!resident || resident.employment.status !== "EMPLOYED") return;
    const shiftStart = new Date("2026-09-14T09:00:00.000Z");
    const shiftEnd = new Date("2026-09-14T17:00:00.000Z");

    expect(() =>
      replayM3ResidentProjection({
        worldId,
        initialWorldTime: new Date("2026-09-14T08:00:00.000Z"),
        seed,
        events: [
          event({
            seq: 1n,
            type: "WORLD_TIME_ADVANCED",
            occurredAt: shiftStart,
            payload: {
              schemaVersion: 1,
              from: "2026-09-14T08:00:00.000Z",
              to: shiftStart.toISOString(),
            },
          }),
          event({
            seq: 2n,
            type: "RESIDENT_WORK_STARTED",
            actorId: resident.actorRef.actorId,
            targetId: resident.employment.workplaceId,
            occurredAt: shiftStart,
            payload: {
              schemaVersion: 1,
              actionType: "WORK",
              phase: "STARTED",
              actionRequestId: "00000000-0000-4000-8000-000000000105",
              activityInstanceId: "00000000-0000-4000-8000-000000000105",
              sourceLocationId: resident.homeLocationId,
              workplaceId: resident.employment.workplaceId,
              workObligationKey: workObligationKey(
                resident.residentId,
                shiftStart.toISOString(),
              ),
              shiftStartsAtWorldTime: shiftStart.toISOString(),
              shiftEndsAtWorldTime: shiftEnd.toISOString(),
              startedAtWorldTime: shiftStart.toISOString(),
              dueAtWorldTime: shiftEnd.toISOString(),
              durationWorldMinutes: 480,
              policyVersion: "m3-lifecycle-semantics-v1",
            },
          }),
        ],
      }),
    ).toThrow(M3DomainReplayError);
  });

  it("updates both residents from one paired TALK event and keeps live/suffix parity", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const first = seed.residents[0];
    const second = seed.residents[1];
    const cafe = getFirstStreetLocationFixtures(worldId).find(
      ({ kind }) => kind === "CAFE",
    );
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(cafe).toBeDefined();
    const genesis = replayM3ResidentProjection({
      worldId,
      initialWorldTime: start,
      seed,
      events: [],
    });
    const coLocated = {
      ...genesis,
      residents: genesis.residents.map((resident) =>
        resident.residentId === first.residentId ||
        resident.residentId === second.residentId
          ? { ...resident, locationId: cafe?.id ?? resident.locationId }
          : resident,
      ),
    };
    const talkStarted = new Date(start.getTime() + 10 * 60_000);
    const talkCompleted = new Date(start.getTime() + 25 * 60_000);
    const requestId = "00000000-0000-4000-8000-000000000103";
    const events = [
      event({
        seq: 1n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: talkStarted,
        payload: {
          schemaVersion: 1,
          from: start.toISOString(),
          to: talkStarted.toISOString(),
        },
      }),
      event({
        seq: 2n,
        type: "RESIDENT_TALK_STARTED",
        actorId: first.actorRef.actorId,
        targetId: second.actorRef.actorId,
        occurredAt: talkStarted,
        payload: {
          schemaVersion: 1,
          actionType: "TALK",
          phase: "STARTED",
          actionRequestId: requestId,
          activityInstanceId: requestId,
          sourceLocationId: cafe?.id,
          participantId: second.actorRef.actorId,
          participantActorId: second.actorRef.actorId,
          startedAtWorldTime: talkStarted.toISOString(),
          dueAtWorldTime: talkCompleted.toISOString(),
          durationWorldMinutes: 15,
          policyVersion: "m3-lifecycle-semantics-v1",
        },
      }),
      event({
        seq: 3n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: talkCompleted,
        payload: {
          schemaVersion: 1,
          from: talkStarted.toISOString(),
          to: talkCompleted.toISOString(),
        },
      }),
      event({
        seq: 4n,
        type: "RESIDENT_TALK_COMPLETED",
        actorId: first.actorRef.actorId,
        targetId: second.actorRef.actorId,
        occurredAt: talkCompleted,
        payload: {
          schemaVersion: 1,
          actionType: "TALK",
          phase: "COMPLETED",
          actionRequestId: requestId,
          activityInstanceId: requestId,
          sourceLocationId: cafe?.id,
          participantId: second.actorRef.actorId,
          participantActorId: second.actorRef.actorId,
          startedAtWorldTime: talkStarted.toISOString(),
          dueAtWorldTime: talkCompleted.toISOString(),
          completedAtWorldTime: talkCompleted.toISOString(),
          durationWorldMinutes: 15,
          policyVersion: "m3-lifecycle-semantics-v1",
          needEffect: {
            kind: "SOCIAL_PRESSURE_RELIEF",
            policyVersion: "m3-need-effects-v1",
            reliefPoints: 35,
          },
        },
      }),
    ];
    const full = replayM3ResidentProjectionFromCheckpoint({
      checkpoint: {
        worldId,
        worldSeq: 0n,
        checksum: projectionHash(coLocated),
        snapshot: coLocated,
      },
      events,
    });
    expect(
      full.residents.filter(({ residentId }) =>
        [first.residentId, second.residentId].includes(residentId),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          residentId: first.residentId,
          activity: "IDLE",
          activityTargetResidentId: null,
          lastSocialContactAtWorldTime: talkCompleted.toISOString(),
          stateVersion: 2,
        }),
        expect.objectContaining({
          residentId: second.residentId,
          activity: "IDLE",
          activityTargetResidentId: null,
          lastSocialContactAtWorldTime: talkCompleted.toISOString(),
          stateVersion: 2,
        }),
      ]),
    );

    const live = canonicalResidentProjectionFromRows({
      worldId,
      worldTime: new Date(full.worldTime),
      worldSeq: BigInt(full.worldSeq),
      seed,
      rows: full.residents.map((resident) => ({
        residentId: resident.residentId,
        currentLocationId: resident.locationId,
        currentActivity: resident.activity,
        activityInstanceId: resident.activityInstanceId,
        activityTargetLocationId: resident.activityTargetLocationId,
        activityTargetResidentId: resident.activityTargetResidentId,
        activityStartedAtWorldTime: resident.startedAtWorldTime
          ? new Date(resident.startedAtWorldTime)
          : null,
        activityDueAtWorldTime: resident.dueAtWorldTime
          ? new Date(resident.dueAtWorldTime)
          : null,
        stateVersion: resident.stateVersion,
        sourceWorldSeq: BigInt(resident.sourceWorldSeq),
        lastAteAtWorldTime: resident.lastAteAtWorldTime
          ? new Date(resident.lastAteAtWorldTime)
          : null,
        lastSocialContactAtWorldTime: resident.lastSocialContactAtWorldTime
          ? new Date(resident.lastSocialContactAtWorldTime)
          : null,
        completedWorkShiftKeys: resident.completedWorkShiftKeys,
      })),
      resourceRows: full.residents.map((resident) => ({
        residentId: resident.residentId,
        foodUnits: resident.foodUnits,
        resourceVersion: resident.resourceVersion,
      })),
    });
    const suffix = replayM3ResidentProjectionFromCheckpoint({
      checkpoint: {
        worldId,
        worldSeq: 2n,
        checksum: projectionHash({
          ...coLocated,
          worldTime: talkStarted.toISOString(),
          worldSeq: "2",
          residents: coLocated.residents.map((resident) =>
            resident.residentId === first.residentId ||
            resident.residentId === second.residentId
              ? {
                  ...resident,
                  activity: "TALKING",
                  activityInstanceId: requestId,
                  activityTargetResidentId:
                    resident.residentId === first.residentId
                      ? second.residentId
                      : first.residentId,
                  startedAtWorldTime: talkStarted.toISOString(),
                  dueAtWorldTime: talkCompleted.toISOString(),
                  stateVersion: 1,
                  sourceWorldSeq: "2",
                }
              : resident,
          ),
        }),
        snapshot: {
          ...coLocated,
          worldTime: talkStarted.toISOString(),
          worldSeq: "2",
          residents: coLocated.residents.map((resident) =>
            resident.residentId === first.residentId ||
            resident.residentId === second.residentId
              ? {
                  ...resident,
                  activity: "TALKING",
                  activityInstanceId: requestId,
                  activityTargetResidentId:
                    resident.residentId === first.residentId
                      ? second.residentId
                      : first.residentId,
                  startedAtWorldTime: talkStarted.toISOString(),
                  dueAtWorldTime: talkCompleted.toISOString(),
                  stateVersion: 1,
                  sourceWorldSeq: "2",
                }
              : resident,
          ),
        },
      },
      events: events.slice(2),
    });
    expect(projectionHash(live)).toBe(projectionHash(full));
    expect(projectionHash(suffix)).toBe(projectionHash(full));
  });

  it("rebuilds runtime state from ordered committed facts", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents[0];
    const cafe = getFirstStreetLocationFixtures(worldId).find(
      ({ kind }) => kind === "CAFE",
    );
    expect(resident).toBeDefined();
    expect(cafe).toBeDefined();
    const started = new Date(start.getTime() + 10 * 60_000);
    const completed = new Date(start.getTime() + 20 * 60_000);
    const events = [
      event({
        seq: 1n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: started,
        payload: {
          schemaVersion: 1,
          from: start.toISOString(),
          to: started.toISOString(),
        },
      }),
      event({
        seq: 2n,
        type: "RESIDENT_MOVE_STARTED",
        actorId: resident.actorRef.actorId,
        occurredAt: started,
        payload: {
          schemaVersion: 1,
          actionRequestId: "00000000-0000-4000-8000-000000000001",
          activityInstanceId: "00000000-0000-4000-8000-000000000001",
          sourceLocationId: resident.homeLocationId,
          destinationId: cafe?.id,
          startedAtWorldTime: started.toISOString(),
          dueAtWorldTime: completed.toISOString(),
        },
      }),
      event({
        seq: 3n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: completed,
        payload: {
          schemaVersion: 1,
          from: started.toISOString(),
          to: completed.toISOString(),
        },
      }),
      event({
        seq: 4n,
        type: "RESIDENT_MOVE_COMPLETED",
        actorId: resident.actorRef.actorId,
        targetId: cafe?.id,
        occurredAt: completed,
        payload: {
          schemaVersion: 1,
          actionRequestId: "00000000-0000-4000-8000-000000000001",
          activityInstanceId: "00000000-0000-4000-8000-000000000001",
          sourceLocationId: resident.homeLocationId,
          destinationId: cafe?.id,
          completedAtWorldTime: completed.toISOString(),
        },
      }),
    ];
    const projection = replayM3ResidentProjection({
      worldId,
      initialWorldTime: start,
      seed,
      events,
    });
    const result = projection.residents.find(
      ({ residentId }) => residentId === resident.residentId,
    );
    expect(result?.locationId).toBe(cafe?.id);
    expect(result?.activity).toBe("IDLE");
    expect(result?.stateVersion).toBe(2);
    expect(projection.worldSeq).toBe("4");
    expect(projectionHash(projection)).toHaveLength(64);
  });

  it("rejects a TALK participantId that is not the participant ActorRef", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const first = seed.residents[0];
    const second = seed.residents[1];
    const initial = replayM3ResidentProjection({
      worldId,
      initialWorldTime: start,
      seed,
      events: [],
    });
    const coLocated = {
      ...initial,
      residents: initial.residents.map((resident) =>
        resident.residentId === first.residentId ||
        resident.residentId === second.residentId
          ? { ...resident, locationId: first.homeLocationId }
          : resident,
      ),
    };
    expect(() =>
      replayM3ResidentProjectionFromCheckpoint({
        checkpoint: {
          worldId,
          worldSeq: 0n,
          checksum: projectionHash(coLocated),
          snapshot: coLocated,
        },
        events: [
          event({
            seq: 1n,
            type: "RESIDENT_TALK_STARTED",
            actorId: first.actorRef.actorId,
            targetId: second.actorRef.actorId,
            payload: {
              schemaVersion: 1,
              actionType: "TALK",
              phase: "STARTED",
              actionRequestId: "00000000-0000-4000-8000-000000000104",
              activityInstanceId: "00000000-0000-4000-8000-000000000104",
              sourceLocationId: first.homeLocationId,
              participantId: second.residentId,
              participantActorId: second.actorRef.actorId,
              startedAtWorldTime: start.toISOString(),
              dueAtWorldTime: new Date(
                start.getTime() + 15 * 60_000,
              ).toISOString(),
              durationWorldMinutes: 15,
              policyVersion: "m3-lifecycle-semantics-v1",
            },
          }),
        ],
      }),
    ).toThrow(M3DomainReplayError);
  });

  it("rejects lifecycle events with mismatched request and activity identities", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents[0];
    const itemId = getResidentFoodItemId(worldId, resident.residentId);
    expect(() =>
      replayM3ResidentProjection({
        worldId,
        initialWorldTime: start,
        seed,
        events: [
          event({
            seq: 1n,
            type: "RESIDENT_EAT_STARTED",
            actorId: resident.actorRef.actorId,
            targetId: itemId,
            payload: {
              schemaVersion: 1,
              actionType: "EAT",
              phase: "STARTED",
              actionRequestId: "00000000-0000-4000-8000-000000000105",
              activityInstanceId: "00000000-0000-4000-8000-000000000106",
              sourceLocationId: resident.homeLocationId,
              itemId,
              quantity: 1,
              startedAtWorldTime: start.toISOString(),
              dueAtWorldTime: new Date(
                start.getTime() + 30 * 60_000,
              ).toISOString(),
              durationWorldMinutes: 30,
              policyVersion: "m3-lifecycle-semantics-v1",
              resourceEffect: {
                kind: "FOOD_UNITS_CONSUMED",
                beforeUnits: resident.resources.foodUnits,
                afterUnits: resident.resources.foodUnits - 1,
                beforeVersion: resident.resources.version,
                afterVersion: resident.resources.version + 1,
              },
            },
          }),
        ],
      }),
    ).toThrow(M3DomainReplayError);
  });

  it("rejects a checkpoint containing only half of a TALK pair", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const first = seed.residents[0];
    const second = seed.residents[1];
    const initial = replayM3ResidentProjection({
      worldId,
      initialWorldTime: start,
      seed,
      events: [],
    });
    const startedAt = start.toISOString();
    const dueAt = new Date(start.getTime() + 15 * 60_000).toISOString();
    const halfPair = {
      ...initial,
      residents: initial.residents.map((resident) =>
        resident.residentId === first.residentId
          ? {
              ...resident,
              activity: "TALKING" as const,
              activityInstanceId: "00000000-0000-4000-8000-000000000107",
              activityTargetResidentId: second.residentId,
              startedAtWorldTime: startedAt,
              dueAtWorldTime: dueAt,
              stateVersion: 1,
            }
          : resident,
      ),
    };
    expect(() =>
      replayM3ResidentProjectionFromCheckpoint({
        checkpoint: {
          worldId,
          worldSeq: 0n,
          checksum: projectionHash(halfPair),
          snapshot: halfPair,
        },
        events: [],
      }),
    ).toThrow(M3DomainReplayError);
  });

  it("fails closed on an unknown event or sequence gap", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    expect(() =>
      replayM3ResidentProjection({
        worldId,
        initialWorldTime: start,
        seed,
        events: [
          event({
            seq: 2n,
            type: "UNREGISTERED_EVENT",
            payload: { schemaVersion: 1 },
          }),
        ],
      }),
    ).toThrow(M3DomainReplayError);
  });

  it("replays a durable domain checkpoint suffix without replaying the prefix", () => {
    const seed = generateResidentSeed({ worldId, seed: "gate-seed-v1" });
    const resident = seed.residents[0];
    const cafe = getFirstStreetLocationFixtures(worldId).find(
      ({ kind }) => kind === "CAFE",
    );
    const started = new Date(start.getTime() + 10 * 60_000);
    const completed = new Date(start.getTime() + 20 * 60_000);
    const events = [
      event({
        seq: 1n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: started,
        payload: {
          schemaVersion: 1,
          from: start.toISOString(),
          to: started.toISOString(),
        },
      }),
      event({
        seq: 2n,
        type: "RESIDENT_MOVE_STARTED",
        actorId: resident.actorRef.actorId,
        occurredAt: started,
        payload: {
          schemaVersion: 1,
          actionRequestId: "00000000-0000-4000-0000-000000000001",
          activityInstanceId: "00000000-0000-4000-0000-000000000001",
          sourceLocationId: resident.homeLocationId,
          destinationId: cafe?.id,
          startedAtWorldTime: started.toISOString(),
          dueAtWorldTime: completed.toISOString(),
        },
      }),
      event({
        seq: 3n,
        type: "WORLD_TIME_ADVANCED",
        occurredAt: completed,
        payload: {
          schemaVersion: 1,
          from: started.toISOString(),
          to: completed.toISOString(),
        },
      }),
      event({
        seq: 4n,
        type: "RESIDENT_MOVE_COMPLETED",
        actorId: resident.actorRef.actorId,
        targetId: cafe?.id,
        occurredAt: completed,
        payload: {
          schemaVersion: 1,
          actionRequestId: "00000000-0000-4000-0000-000000000001",
          activityInstanceId: "00000000-0000-4000-0000-000000000001",
          sourceLocationId: resident.homeLocationId,
          destinationId: cafe?.id,
          completedAtWorldTime: completed.toISOString(),
        },
      }),
    ];
    const prefix = replayM3ResidentProjection({
      worldId,
      initialWorldTime: start,
      seed,
      events: events.slice(0, 2),
    });
    const full = replayM3ResidentProjection({
      worldId,
      initialWorldTime: start,
      seed,
      events,
    });
    const suffix = replayM3ResidentProjectionFromCheckpoint({
      checkpoint: {
        worldId,
        worldSeq: 2n,
        checksum: projectionHash(prefix),
        snapshot: prefix,
      },
      events: events.slice(2),
    });

    expect(suffix).toEqual(full);
    expect(projectionHash(suffix)).toBe(projectionHash(full));
  });
});
