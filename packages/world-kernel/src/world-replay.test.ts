import { describe, expect, it } from "vitest";
import {
  replayFromCheckpoint,
  replayWorldEvents,
  type ReplayEvent,
  type ReplaySeed,
} from "./world-replay.js";

const worldId = "00000000-0000-4000-8000-000000000002";
const initialWorldTime = new Date("2026-09-06T22:00:00.000Z");
const seed: ReplaySeed = {
  worldId,
  seed: "m2-t05-replay-seed",
  initialWorldTime,
};

function event(
  seq: bigint,
  type: ReplayEvent["type"],
  payload: ReplayEvent["payload"],
  occurredAt: string,
): ReplayEvent {
  return {
    worldId,
    seq,
    type,
    payload,
    occurredAt: new Date(occurredAt),
  };
}

const events: ReplayEvent[] = [
  event(
    1n,
    "WORLD_TIME_ADVANCED",
    {
      schemaVersion: 1,
      worldId,
      from: "2026-09-06T22:00:00.000Z",
      to: "2026-09-06T22:00:20.000Z",
    },
    "2026-09-06T22:00:20.000Z",
  ),
  event(
    2n,
    "WORLD_DIGEST_CREATED",
    { eventIds: [], periodEnd: "2026-09-06T22:01:00.000Z", schemaVersion: 1 },
    "2026-09-06T22:01:00.000Z",
  ),
];

describe("world replay", () => {
  it("produces a stable hash from the same seed and ordered events", () => {
    const first = replayWorldEvents({ seed, events });
    const second = replayWorldEvents({
      seed: { ...seed },
      events: [
        { ...events[0], payload: { ...events[0].payload } },
        {
          ...events[1],
          payload: {
            schemaVersion: 1,
            periodEnd: "2026-09-06T22:01:00.000Z",
            eventIds: [],
          },
        },
      ],
    });

    expect(second.summaryHash).toBe(first.summaryHash);
    expect(first.state.worldTime.toISOString()).toBe(
      "2026-09-06T22:00:20.000Z",
    );
    expect(first.state.appliedSeq).toBe(2n);
  });

  it("replays the suffix after a checkpoint to the same result", () => {
    const full = replayWorldEvents({ seed, events });
    const prefix = replayWorldEvents({ seed, events: events.slice(0, 1) });

    const resumed = replayFromCheckpoint({
      checkpoint: {
        worldId,
        worldSeq: prefix.state.appliedSeq,
        checksum: prefix.summaryHash,
        snapshot: prefix.snapshot,
      },
      events: events.slice(1),
    });

    expect(resumed.summaryHash).toBe(full.summaryHash);
    expect(resumed.state.appliedSeq).toBe(full.state.appliedSeq);
  });

  it.each([
    ["sequence gap", [{ ...events[1], seq: 3n }]],
    [
      "wrong world",
      [{ ...events[0], worldId: "00000000-0000-4000-8000-000000000099" }],
    ],
  ])("rejects %s", (_name, invalidEvents) => {
    expect(() => replayWorldEvents({ seed, events: invalidEvents })).toThrow();
  });

  it("rejects a checkpoint with a mismatched checksum", () => {
    const prefix = replayWorldEvents({ seed, events: events.slice(0, 1) });

    expect(() =>
      replayFromCheckpoint({
        checkpoint: {
          worldId,
          worldSeq: prefix.state.appliedSeq,
          checksum: "0".repeat(64),
          snapshot: prefix.snapshot,
        },
        events: [],
      }),
    ).toThrow();
  });

  it.each([
    ["wrong world", { worldId: "00000000-0000-4000-8000-000000000099" }],
    ["wrong schema", { snapshot: { schemaVersion: 2 } }],
    ["corrupted snapshot", { snapshot: null }],
  ])("rejects a checkpoint with %s", (_name, changes) => {
    const prefix = replayWorldEvents({ seed, events: events.slice(0, 1) });
    const checkpoint = {
      worldId,
      worldSeq: prefix.state.appliedSeq,
      checksum: prefix.summaryHash,
      snapshot: prefix.snapshot,
      ...changes,
    };

    expect(() => replayFromCheckpoint({ checkpoint, events: [] })).toThrowError(
      expect.objectContaining({
        code: "REPLAY_CHECKPOINT_INVALID",
        name: "WorldReplayError",
      }),
    );
  });

  it("rejects a checkpoint with a malformed sequence as a replay error", () => {
    const prefix = replayWorldEvents({ seed, events: events.slice(0, 1) });

    expect(() =>
      replayFromCheckpoint({
        checkpoint: {
          worldId,
          worldSeq: prefix.state.appliedSeq,
          checksum: prefix.summaryHash,
          snapshot: { ...prefix.snapshot, appliedSeq: "not-a-sequence" },
        },
        events: [],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "REPLAY_CHECKPOINT_INVALID",
        name: "WorldReplayError",
      }),
    );
  });
});
