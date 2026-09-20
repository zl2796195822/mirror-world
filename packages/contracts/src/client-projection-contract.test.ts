import { describe, expect, it } from "vitest";
import {
  CLIENT_PROJECTION_SCHEMA_VERSION,
  parseClientEventFeed,
  parseClientWorldSnapshot,
} from "../src/client-projection-contract.js";

describe("client projection contract v0", () => {
  it("parses a minimal world snapshot", () => {
    const snapshot = parseClientWorldSnapshot({
      schemaVersion: CLIENT_PROJECTION_SCHEMA_VERSION,
      worldId: "00000000-0000-4000-8000-000000000010",
      worldTime: "2026-09-12T08:00:00.000Z",
      worldSeq: "12",
      worldStatus: "PAUSED",
      places: [
        {
          placeId: "00000000-0000-4000-8000-000000000020",
          placeKey: "office",
          placeType: "OFFICE",
          displayName: "OFFICE",
          parentPlaceId: null,
          residentCount: 2,
        },
      ],
      residents: [
        {
          residentId: "00000000-0000-4000-8000-000000000030",
          displayName: "Resident 001",
          placeId: "00000000-0000-4000-8000-000000000020",
          placeKey: "office",
          placeKind: "OFFICE",
          activity: "WORKING",
          activityInstanceId: "00000000-0000-4000-8000-000000000040",
          activityStartedAtWorldTime: "2026-09-12T09:00:00.000Z",
          activityDueAtWorldTime: "2026-09-12T17:00:00.000Z",
          targetPlaceId: null,
          participantId: null,
          employmentStatus: "EMPLOYED",
          workplaceId: "00000000-0000-4000-8000-000000000020",
          projectionSeq: "12",
        },
      ],
    });

    expect(snapshot.schemaVersion).toBe("client-projection-v0");
    expect(snapshot.residents).toHaveLength(1);
  });

  it("parses an event feed envelope", () => {
    const feed = parseClientEventFeed({
      schemaVersion: CLIENT_PROJECTION_SCHEMA_VERSION,
      worldId: "00000000-0000-4000-8000-000000000010",
      worldSeq: "12",
      nextAfterSeq: "12",
      events: [
        {
          eventId: "00000000-0000-4000-8000-000000000050",
          worldSeq: "12",
          eventType: "RESIDENT_MOVE_STARTED",
          occurredAtWorldTime: "2026-09-12T08:25:00.000Z",
          residentId: "00000000-0000-4000-8000-000000000030",
          participantId: null,
          placeId: "00000000-0000-4000-8000-000000000021",
          targetPlaceId: "00000000-0000-4000-8000-000000000020",
        },
      ],
    });

    expect(feed.events[0]?.eventType).toBe("RESIDENT_MOVE_STARTED");
  });

  it("rejects unknown fields", () => {
    expect(() =>
      parseClientWorldSnapshot({
        schemaVersion: CLIENT_PROJECTION_SCHEMA_VERSION,
        worldId: "00000000-0000-4000-8000-000000000010",
        worldTime: "2026-09-12T08:00:00.000Z",
        worldSeq: "12",
        worldStatus: "PAUSED",
        places: [],
        residents: [],
        unexpected: true,
      }),
    ).toThrow();
  });
});
