import { describe, expect, it } from "vitest";
import {
  generateResidentSeed,
  getFirstStreetLocationFixtures,
} from "@mirror/db";
import {
  M3DomainReplayError,
  projectionHash,
  replayM3ResidentProjection,
  replayM3ResidentProjectionFromCheckpoint,
  type M3ReplayEvent,
} from "./m3-domain-replay.js";

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
