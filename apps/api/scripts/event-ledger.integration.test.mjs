import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createDb, worlds } from "@mirror/db";
import {
  appendWorldEvent,
  commitWorldStateWithEventInTransaction,
} from "@mirror/world-kernel";

const worldId = "00000000-0000-4000-8000-000000000002";
const rollbackWorldId = "00000000-0000-4000-8000-000000000099";

function digestEvent(id, worldId) {
  return {
    id,
    worldId,
    type: "WORLD_DIGEST_CREATED",
    payload: {
      schemaVersion: 1,
      worldId,
      periodStart: "2026-09-08T00:00:00.000Z",
      periodEnd: "2026-09-08T00:01:00.000Z",
      eventIds: [],
    },
    occurredAt: new Date("2026-09-08T00:01:00.000Z"),
    correlationId: randomUUID(),
  };
}

test("world event ledger is ordered, immutable, isolated, and atomic", async () => {
  const { db, client } = createDb();

  try {
    const [before] = await client`
      select world_seq, world_time, status, time_scale
      from worlds
      where id = ${worldId}
    `;
    const baseSeq = BigInt(before.world_seq);

    const [first, second] = await Promise.all([
      appendWorldEvent(db, digestEvent(randomUUID(), worldId)),
      appendWorldEvent(db, digestEvent(randomUUID(), worldId)),
    ]);
    const sequences = [first.event.seq, second.event.seq].sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    assert.deepEqual(sequences, [baseSeq + 1n, baseSeq + 2n]);

    const [clockEvent] = await client`
      select type, occurred_at, payload
      from world_events
      where world_id = ${worldId} and type = 'WORLD_TIME_ADVANCED'
      order by seq desc
      limit 1
    `;
    assert.equal(clockEvent.type, "WORLD_TIME_ADVANCED");
    assert.equal(clockEvent.payload.schemaVersion, 1);
    assert.ok(clockEvent.occurred_at);

    await assert.rejects(
      client`
        update world_events
        set payload = payload
        where id = ${first.event.id}
      `,
    );
    await assert.rejects(
      client`
        delete from world_events
        where id = ${first.event.id}
      `,
    );

    const [current] = await client`
      select world_seq
      from worlds
      where id = ${worldId}
    `;
    const gapSeq = BigInt(current.world_seq) + 2n;
    await assert.rejects(
      client`
        insert into world_events
          (id, world_id, seq, type, payload, occurred_at, correlation_id)
        values
          (${randomUUID()}, ${worldId}, ${gapSeq}, 'WORLD_DIGEST_CREATED',
           ${JSON.stringify({ schemaVersion: 1 })}::jsonb,
           ${new Date("2026-09-08T00:01:00.000Z")}, ${randomUUID()})
      `,
    );

    await assert.rejects(
      client`
        update worlds
        set world_seq = world_seq + 2
        where id = ${worldId}
      `,
    );

    let rollbackError;
    const rollbackEvent = digestEvent(randomUUID(), rollbackWorldId);
    await db
      .transaction(async (tx) => {
        await tx.insert(worlds).values({
          id: rollbackWorldId,
          name: "M2-T04 rollback world",
          timezone: "Asia/Shanghai",
          status: "PAUSED",
          seed: "m2-t04-rollback",
          worldTime: new Date("2026-09-08T00:00:00.000Z"),
          clockAnchorAt: new Date("2026-09-08T00:00:00.000Z"),
        });

        await commitWorldStateWithEventInTransaction(tx, {
          worldId: rollbackWorldId,
          state: { status: "RUNNING" },
          event: rollbackEvent,
        });

        await commitWorldStateWithEventInTransaction(tx, {
          worldId: rollbackWorldId,
          state: { status: "PAUSED" },
          event: rollbackEvent,
        });
      })
      .catch((error) => {
        rollbackError = error;
      });
    assert.ok(rollbackError);

    const [rolledBackWorld] = await client`
      select count(*)::int as count
      from worlds
      where id = ${rollbackWorldId}
    `;
    const [rolledBackEvents] = await client`
      select count(*)::int as count
      from world_events
      where world_id = ${rollbackWorldId}
    `;
    assert.equal(rolledBackWorld.count, 0);
    assert.equal(rolledBackEvents.count, 0);

    const [after] = await client`
      select world_seq, world_time, status, time_scale
      from worlds
      where id = ${worldId}
    `;
    assert.equal(BigInt(after.world_seq), baseSeq + 2n);
    assert.equal(after.status, before.status);
    assert.equal(after.time_scale, before.time_scale);
    assert.equal(
      new Date(after.world_time).toISOString(),
      new Date(before.world_time).toISOString(),
    );
  } finally {
    await client.end();
  }
});
