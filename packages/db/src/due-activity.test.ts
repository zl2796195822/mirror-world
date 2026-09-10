import { describe, expect, it } from "vitest";
import { generateResidentSeed } from "./resident-seed.js";
import {
  DUE_ACTIVITY_MAX_BATCH_SIZE,
  readDueActivities,
  type DueActivityDatabase,
} from "./due-activity.js";

const worldId = "00000000-0000-4000-8000-000000000001";
const worldSeed = "due-activity-test";
const worldTime = new Date("2026-09-14T12:00:00.000Z");
const residents = generateResidentSeed({ worldId, seed: worldSeed }).residents;

type FakeDueRow = {
  worldId: string;
  residentId: string;
  activityInstanceId: string;
  activityKind: string;
  dueWorldTime: Date;
  stateVersion: number;
  sourceWorldSeq: bigint;
  requestActorId: string | null;
  worldSeed: string;
};

function fakeDatabase(rows: readonly FakeDueRow[]): DueActivityDatabase {
  const query = {
    from: () => query,
    innerJoin: () => query,
    leftJoin: () => query,
    where: () => query,
    orderBy: () => query,
    limit: async () => rows,
  };
  return {
    select: () => query,
  } as unknown as DueActivityDatabase;
}

function row(
  input: Partial<FakeDueRow> &
    Pick<FakeDueRow, "residentId" | "activityKind" | "activityInstanceId">,
): FakeDueRow {
  return {
    worldId,
    dueWorldTime: worldTime,
    stateVersion: 3,
    sourceWorldSeq: 11n,
    requestActorId: null,
    worldSeed,
    ...input,
  };
}

describe("due activity query", () => {
  it("returns EATING/WORKING/TALKING and coalesces TALK to its initiator row", async () => {
    const initiator = residents[1];
    const participant = residents[0];
    const due = await readDueActivities(
      fakeDatabase([
        row({
          residentId: participant.residentId,
          activityKind: "TALKING",
          activityInstanceId: "00000000-0000-4000-8000-000000000010",
          stateVersion: 9,
          requestActorId: initiator.actorRef.actorId,
        }),
        row({
          residentId: initiator.residentId,
          activityKind: "TALKING",
          activityInstanceId: "00000000-0000-4000-8000-000000000010",
          stateVersion: 8,
          requestActorId: initiator.actorRef.actorId,
        }),
        row({
          residentId: residents[2].residentId,
          activityKind: "EATING",
          activityInstanceId: "00000000-0000-4000-8000-000000000011",
        }),
        row({
          residentId: residents[3].residentId,
          activityKind: "WORKING",
          activityInstanceId: "00000000-0000-4000-8000-000000000012",
        }),
        row({
          residentId: residents[4].residentId,
          activityKind: "TRAVELING",
          activityInstanceId: "00000000-0000-4000-8000-000000000013",
        }),
        row({
          residentId: residents[5].residentId,
          activityKind: "SLEEPING",
          activityInstanceId: "00000000-0000-4000-8000-000000000014",
        }),
      ]),
      { worldId, targetWorldTime: worldTime, limit: 5 },
    );

    expect(due).toHaveLength(5);
    expect(due.map(({ activityKind }) => activityKind).sort()).toEqual([
      "EATING",
      "SLEEPING",
      "TALKING",
      "TRAVELING",
      "WORKING",
    ]);
    expect(
      due.find(({ activityKind }) => activityKind === "TALKING"),
    ).toMatchObject({
      residentId: initiator.residentId,
      stateVersion: 8,
    });
  });

  it("keeps the existing bounded query contract", async () => {
    await expect(
      readDueActivities(fakeDatabase([]), {
        worldId,
        targetWorldTime: worldTime,
        limit: DUE_ACTIVITY_MAX_BATCH_SIZE + 1,
      }),
    ).rejects.toMatchObject({ code: "INVALID_QUERY" });
  });
});
