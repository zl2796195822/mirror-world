import assert from "node:assert/strict";
import { test } from "node:test";
import { createDb, M0_FIXTURE_IDS, generateResidentSeed } from "@mirror/db";
import {
  createPostgresObservationQuery,
  ObservationQueryError,
} from "@mirror/world-kernel";

test("Observation query is read-only, deterministic, bounded, and world-versioned", async () => {
  const { db, client } = createDb();
  const worldId = M0_FIXTURE_IDS.world;

  try {
    const [before] = await client`
      select world_seq, world_time, status, seed
      from worlds
      where id = ${worldId}
    `;
    const [eventsBefore] = await client`
      select count(*)::text as count
      from world_events
      where world_id = ${worldId}
    `;
    const fixture = generateResidentSeed({
      worldId,
      seed: before.seed,
    });
    const residentIds = fixture.residents.map(({ residentId }) => residentId);
    const query = createPostgresObservationQuery(db);

    const first = await query.getResidentObservations({
      worldId,
      residentIds: [...residentIds].reverse(),
    });
    const second = await query.getResidentObservations({
      worldId,
      residentIds,
    });

    assert.equal(first.length, 30);
    assert.deepEqual(first, second);
    assert.deepEqual(
      first.map(({ subjectResidentId }) => subjectResidentId),
      [...residentIds].sort(),
    );
    assert.ok(
      first.every(
        ({ worldId: snapshotWorldId }) => snapshotWorldId === worldId,
      ),
    );
    assert.ok(
      first.every(
        ({ sourceWorldSeq }) => sourceWorldSeq === String(before.world_seq),
      ),
    );
    assert.ok(
      first.every(
        ({ worldTime }) =>
          worldTime === new Date(before.world_time).toISOString(),
      ),
    );
    assert.ok(
      first.every(
        ({ actorRef, location, activity, resources }) =>
          actorRef.status === "UNAVAILABLE" &&
          location.status === "UNAVAILABLE" &&
          activity.status === "UNAVAILABLE" &&
          resources.status === "UNAVAILABLE",
      ),
    );
    assert.equal(Object.isFrozen(first[0]), true);

    await assert.rejects(
      query.getResidentObservation({
        worldId,
        residentId: residentIds[0],
        expectedWorldSeq: "999999",
      }),
      (error) =>
        error instanceof ObservationQueryError && error.code === "STALE_READ",
    );

    const [after] = await client`
      select world_seq, world_time, status, seed
      from worlds
      where id = ${worldId}
    `;
    const [eventsAfter] = await client`
      select count(*)::text as count
      from world_events
      where world_id = ${worldId}
    `;
    assert.deepEqual(after, before);
    assert.equal(eventsAfter.count, eventsBefore.count);
  } finally {
    await client.end();
  }
});
