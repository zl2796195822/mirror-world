import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bootstrapResidentRuntimeStates,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  M0_FIXTURE_IDS,
} from "@mirror/db";
import {
  createPostgresObservationQuery,
  ResidentRuntimeAuthorityError,
} from "@mirror/world-kernel";

const otherWorldId = "00000000-0000-4000-8000-000000000003";

test("resident runtime bootstrap is durable, idempotent, isolated, and read-only through Observation", async () => {
  const { db, client } = createDb();
  const worldId = M0_FIXTURE_IDS.world;

  try {
    const firstBootstrap = await bootstrapResidentRuntimeStates(db, {
      worldId,
    });
    const secondBootstrap = await bootstrapResidentRuntimeStates(db, {
      worldId,
    });
    assert.equal(firstBootstrap.length, 30);
    assert.deepEqual(secondBootstrap, firstBootstrap);

    const otherWorldTime = "2026-09-07T06:00:00.000Z";
    await client`
      insert into worlds
        (id, name, timezone, time_scale, status, seed, world_time, clock_anchor_at)
      values
        (${otherWorldId}, 'PRE-AL-04 isolation world', 'Asia/Shanghai', 1,
         'PAUSED', 'pre-al-04-isolation-seed', ${otherWorldTime}, ${otherWorldTime})
    `;
    try {
      const otherFirst = await bootstrapResidentRuntimeStates(db, {
        worldId: otherWorldId,
      });
      const otherSecond = await bootstrapResidentRuntimeStates(db, {
        worldId: otherWorldId,
      });
      assert.equal(otherFirst.length, 30);
      assert.deepEqual(otherSecond, otherFirst);

      const otherFixture = generateResidentSeed({
        worldId: otherWorldId,
        seed: "pre-al-04-isolation-seed",
      });
      const otherResident = otherFixture.residents[0];
      const otherPark = getFirstStreetLocationFixtures(otherWorldId).find(
        ({ kind }) => kind === "PARK",
      );
      assert.ok(otherPark);
      await client`
        update resident_runtime_states
        set current_location_id = ${otherPark.id}, state_version = 9
        where world_id = ${otherWorldId}
          and resident_id = ${otherResident.residentId}
      `;
      const afterExistingState = await bootstrapResidentRuntimeStates(db, {
        worldId: otherWorldId,
      });
      const preserved = afterExistingState.find(
        ({ residentId }) => residentId === otherResident.residentId,
      );
      assert.equal(preserved.currentLocationId, otherPark.id);
      assert.equal(preserved.stateVersion, 9);

      const query = createPostgresObservationQuery(db);
      const observation = await query.getResidentObservation({
        worldId: otherWorldId,
        residentId: otherResident.residentId,
      });
      assert.equal(observation.location.status, "AVAILABLE");
      assert.equal(observation.location.location.locationId, otherPark.id);
      assert.equal(observation.activity.activity.kind, "IDLE");
      assert.equal(observation.workObligation.status, "AVAILABLE");

      await assert.rejects(
        query.getResidentObservation({
          worldId,
          residentId: otherResident.residentId,
        }),
        (error) =>
          error?.code === "RESIDENT_NOT_FOUND" ||
          error instanceof ResidentRuntimeAuthorityError,
      );
    } finally {
      await client`
        delete from resident_resource_states
        where world_id = ${otherWorldId}
      `;
      await client`
        delete from resident_runtime_states
        where world_id = ${otherWorldId}
      `;
      await client`
        delete from worlds
        where id = ${otherWorldId}
      `;
    }

    const fixture = generateResidentSeed({
      worldId,
      seed: "mirror-m0-foundation-v1",
    });
    const query = createPostgresObservationQuery(db);
    const snapshots = await query.getResidentObservations({
      worldId,
      residentIds: fixture.residents.map(({ residentId }) => residentId),
    });
    assert.equal(snapshots.length, 30);
    assert.ok(
      snapshots.every(
        ({ location, activity, workObligation }) =>
          location.status === "AVAILABLE" &&
          activity.status === "AVAILABLE" &&
          workObligation.status === "AVAILABLE",
      ),
    );
    assert.equal(
      snapshots.filter(
        ({ workObligation }) =>
          workObligation.obligation.status === "NO_CURRENT_OBLIGATION",
      ).length,
      4,
    );
    assert.equal(
      snapshots.filter(
        ({ workObligation }) => workObligation.obligation.status === "NOT_DUE",
      ).length,
      26,
    );
  } finally {
    await client.end();
  }
});
