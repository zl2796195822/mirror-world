import { describe, expect, it } from "vitest";
import { SCHEDULER_POLICY_V2_VERSION } from "@mirror/contracts";
import { generateResidentSeed } from "@mirror/db";
import {
  createDeterministicSimulationDriver,
  type SimulationDriverDatabase,
} from "./simulation-driver.js";

const worldId = "00000000-0000-4000-8000-000000000001";
const worldSeed = "scheduler-test";
const dueWorldTime = new Date("2026-09-14T12:00:00.000Z");
const residents = generateResidentSeed({ worldId, seed: worldSeed }).residents;

function fakeDatabase(
  queryRows: readonly (readonly unknown[])[],
): SimulationDriverDatabase {
  let selectCount = 0;
  return {
    select: () => {
      const rows = queryRows[selectCount++] ?? [];
      const query = {
        from: () => query,
        innerJoin: () => query,
        leftJoin: () => query,
        where: () => query,
        orderBy: () => query,
        limit: async () => rows,
        then: (
          resolve: (value: readonly unknown[]) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(rows).then(resolve, reject),
      };
      return query;
    },
  } as unknown as SimulationDriverDatabase;
}

describe("deterministic simulation driver lifecycle due integration", () => {
  it("coalesces paired TALK due rows and emits lifecycle v2 work items", async () => {
    const database = fakeDatabase([
      [
        {
          id: worldId,
          status: "RUNNING",
          worldTime: dueWorldTime,
          worldSeq: 4n,
        },
      ],
      [
        {
          worldId,
          residentId: residents[1].residentId,
          activityInstanceId: "00000000-0000-4000-8000-000000000010",
          activityKind: "TALKING",
          dueWorldTime,
          stateVersion: 8,
          sourceWorldSeq: 4n,
          requestActorId: residents[0].actorRef.actorId,
          worldSeed,
        },
        {
          worldId,
          residentId: residents[0].residentId,
          activityInstanceId: "00000000-0000-4000-8000-000000000010",
          activityKind: "TALKING",
          dueWorldTime,
          stateVersion: 7,
          sourceWorldSeq: 4n,
          requestActorId: residents[0].actorRef.actorId,
          worldSeed,
        },
        {
          worldId,
          residentId: residents[2].residentId,
          activityInstanceId: "00000000-0000-4000-8000-000000000011",
          activityKind: "EATING",
          dueWorldTime,
          stateVersion: 2,
          sourceWorldSeq: 4n,
          requestActorId: null,
          worldSeed,
        },
      ],
      [],
    ]);

    const due =
      await createDeterministicSimulationDriver(database).collectDueWork(
        worldId,
      );

    expect(due).toHaveLength(2);
    expect(due.map(({ activityInstanceId }) => activityInstanceId)).toEqual([
      "00000000-0000-4000-8000-000000000010",
      "00000000-0000-4000-8000-000000000011",
    ]);
    expect(
      due.every(
        ({ policyVersion }) => policyVersion === SCHEDULER_POLICY_V2_VERSION,
      ),
    ).toBe(true);
  });
});
