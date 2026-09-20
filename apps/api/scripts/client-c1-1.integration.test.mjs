import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createDb } from "@mirror/db";
import {
  buildClientEventFeed,
  buildClientResidentDetail,
  buildClientWorldSnapshot,
  ClientProjectionError,
} from "../dist/client-projection.js";
import {
  cleanupClientC11World,
  runClientC11LifecycleVerification,
} from "./client-c1-1-lifecycle-harness.mjs";

const worldId = randomUUID();
let verification;
let dbHandle;

before(async () => {
  verification = await runClientC11LifecycleVerification({
    worldId,
    worldDays: 2,
    captureAtHours: [0, 6, 14, 26],
  });
  dbHandle = createDb();
});

after(async () => {
  if (dbHandle) {
    await dbHandle.client.end({ timeout: 5 });
  }
  await cleanupClientC11World(worldId);
});

test("C1.1 real lifecycle advances world time and world seq", () => {
  assert.equal(verification.residentCount, 30);
  assert.equal(verification.placeCount, 17);
  assert.ok(verification.eventCount > 0);
  assert.equal(verification.duplicateEventIds, 0);
  assert.equal(verification.eventOrderingStrictlyIncreasing, true);
  assert.ok(
    new Date(verification.finalWorldTime).getTime() >
      new Date(verification.startWorldTime).getTime(),
  );
  assert.ok(Number(verification.finalWorldSeq) > 0);
});

test("C1.1 snapshot captures show advancing world state", () => {
  assert.ok(verification.snapshots.length >= 2);
  let previousSeq = -1;
  let previousTime = -1;
  for (const snapshot of verification.snapshots) {
    const seq = Number(snapshot.worldSeq);
    const time = new Date(snapshot.capturedAtWorldTime).getTime();
    assert.equal(snapshot.residentCount, 30);
    assert.equal(snapshot.placeCount, 17);
    assert.ok(seq >= previousSeq);
    assert.ok(time >= previousTime);
    previousSeq = seq;
    previousTime = time;
  }
  assert.ok(Number(verification.snapshots.at(-1).worldSeq) >= previousSeq);
});

test("C1.1 observes real MOVE/SLEEP/EAT/WORK lifecycles", () => {
  const { actionCoverage } = verification;
  const required = ["MOVE", "SLEEP", "EAT", "WORK"];
  const missing = required.filter((action) => !actionCoverage[action].observed);
  assert.deepEqual(
    missing,
    [],
    `Missing required real lifecycle coverage: ${missing.join(",")}`,
  );
  for (const action of required) {
    assert.ok(
      actionCoverage[action].startedEvents >= 1,
      `${action} started events`,
    );
    assert.ok(
      actionCoverage[action].completedEvents >= 1,
      `${action} completed events`,
    );
  }
  // TALK is opportunistic; never fabricate if bounded horizon did not produce it.
  assert.equal(typeof actionCoverage.TALK.observed, "boolean");
});

test("C1.1 resident detail is consistent with snapshot", async () => {
  const snapshot = await buildClientWorldSnapshot(dbHandle.db, worldId);
  const working = snapshot.residents.find(
    (resident) => resident.activity === "WORKING",
  );
  const talking = snapshot.residents.find(
    (resident) => resident.activity === "TALKING",
  );
  const traveling = snapshot.residents.find(
    (resident) => resident.activity === "TRAVELING",
  );
  const candidate =
    working ??
    talking ??
    traveling ??
    snapshot.residents.find((resident) => resident.activity !== "IDLE") ??
    snapshot.residents[0];
  assert.ok(candidate);
  const detail = await buildClientResidentDetail(dbHandle.db, {
    worldId,
    residentId: candidate.residentId,
  });
  assert.equal(detail.residentId, candidate.residentId);
  assert.equal(detail.placeId, candidate.placeId);
  assert.equal(detail.activity, candidate.activity);
  assert.equal(detail.projectionSeq, candidate.projectionSeq);
});

test("C1.1 event feed supports resident filter and pagination", async () => {
  const firstPage = await buildClientEventFeed(dbHandle.db, {
    worldId,
    afterSeq: "0",
    limit: 5,
  });
  assert.equal(firstPage.events.length <= 5, true);
  assert.ok(firstPage.events.length > 0);
  const secondPage = await buildClientEventFeed(dbHandle.db, {
    worldId,
    afterSeq: firstPage.nextAfterSeq,
    limit: 5,
  });
  if (secondPage.events.length > 0) {
    assert.ok(
      Number(secondPage.events[0].worldSeq) >
        Number(firstPage.events.at(-1).worldSeq),
    );
  }

  const withResident = firstPage.events.find((event) => event.residentId);
  assert.ok(withResident);
  const filtered = await buildClientEventFeed(dbHandle.db, {
    worldId,
    afterSeq: "0",
    limit: 50,
    residentId: withResident.residentId,
  });
  assert.ok(filtered.events.length >= 1);
  assert.ok(
    filtered.events.every(
      (event) => event.residentId === withResident.residentId,
    ),
  );
});

test("C1.1 snapshot does not invent unknown places", () => {
  assert.equal(verification.residentsWithUnknownPlace, 0);
});

test("C1.1 unknown resident detail fails closed", async () => {
  await assert.rejects(
    () =>
      buildClientResidentDetail(dbHandle.db, {
        worldId,
        residentId: "00000000-0000-4000-8000-0000000000ff",
      }),
    (error) =>
      error instanceof ClientProjectionError &&
      error.code === "WORLD_NOT_FOUND",
  );
});
