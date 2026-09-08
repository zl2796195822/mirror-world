import assert from "node:assert/strict";
import { test } from "node:test";
import { createDb, worlds } from "@mirror/db";
import {
  findWorldCheckpoint,
  persistWorldCheckpoint,
  replayFromCheckpoint,
  replayWorldEvents,
} from "@mirror/world-kernel";

const worldId = "00000000-0000-4000-8000-000000000002";
const otherWorldId = "00000000-0000-4000-8000-000000000099";

function replayEvent(row) {
  return {
    worldId: row.world_id,
    seq: BigInt(row.seq),
    type: row.type,
    payload: row.payload,
    occurredAt: new Date(row.occurred_at),
  };
}

test("checkpoint and replay are deterministic, resumable, and world-scoped", async () => {
  const { db, client } = createDb();

  try {
    const [world] = await client`
      select id, seed, world_seq, world_time
      from worlds
      where id = ${worldId}
    `;
    const rows = await client`
      select world_id, seq, type, payload, occurred_at
      from world_events
      where world_id = ${worldId}
      order by seq asc
    `;
    const timeEvent = rows.find((row) => row.type === "WORLD_TIME_ADVANCED");
    assert.ok(timeEvent);

    const events = rows.map(replayEvent);
    const seed = {
      worldId,
      seed: world.seed,
      initialWorldTime: new Date(timeEvent.payload.from),
    };
    const full = replayWorldEvents({ seed, events });
    assert.equal(full.state.appliedSeq, BigInt(world.world_seq));
    assert.equal(
      full.state.worldTime.toISOString(),
      new Date(world.world_time).toISOString(),
    );

    const prefix = replayWorldEvents({ seed, events: events.slice(0, 1) });
    const created = await persistWorldCheckpoint(db, {
      worldId,
      replay: prefix,
    });
    assert.equal(created.status, "created");

    const duplicate = await persistWorldCheckpoint(db, {
      worldId,
      replay: prefix,
    });
    assert.equal(duplicate.status, "duplicate");

    const conflict = await persistWorldCheckpoint(db, {
      worldId,
      replay: replayWorldEvents({
        seed: { ...seed, seed: "different-replay-seed" },
        events: events.slice(0, 1),
      }),
    });
    assert.equal(conflict.status, "conflict");
    assert.equal(conflict.reasonCode, "CHECKPOINT_CONFLICT");

    const checkpoint = await findWorldCheckpoint(db, {
      worldId,
      atOrBeforeSeq: BigInt(world.world_seq),
    });
    const resumed = replayFromCheckpoint({
      checkpoint: {
        worldId: checkpoint.worldId,
        worldSeq: checkpoint.worldSeq,
        checksum: checkpoint.checksum,
        snapshot: checkpoint.snapshot,
      },
      events: events.slice(1),
    });
    assert.equal(resumed.summaryHash, full.summaryHash);

    const resumedAgain = replayFromCheckpoint({
      checkpoint: {
        worldId: checkpoint.worldId,
        worldSeq: checkpoint.worldSeq,
        checksum: checkpoint.checksum,
        snapshot: checkpoint.snapshot,
      },
      events: events.slice(1),
    });
    assert.equal(resumedAgain.summaryHash, full.summaryHash);

    await db.insert(worlds).values({
      id: otherWorldId,
      name: "M2-T05 isolation world",
      timezone: "Asia/Shanghai",
      status: "PAUSED",
      seed: "m2-t05-isolation-seed",
      worldTime: new Date("2026-09-06T22:00:00.000Z"),
      clockAnchorAt: new Date("2026-09-06T22:00:00.000Z"),
    });
    try {
      const otherReplay = replayWorldEvents({
        seed: {
          worldId: otherWorldId,
          seed: "m2-t05-isolation-seed",
          initialWorldTime: new Date("2026-09-06T22:00:00.000Z"),
        },
        events: [],
      });
      const otherCheckpoint = await persistWorldCheckpoint(db, {
        worldId: otherWorldId,
        replay: otherReplay,
      });
      assert.equal(otherCheckpoint.status, "created");
      const foundOther = await findWorldCheckpoint(db, {
        worldId: otherWorldId,
      });
      assert.equal(foundOther.worldId, otherWorldId);
      assert.equal(
        (await findWorldCheckpoint(db, { worldId })).worldId,
        worldId,
      );
      assert.throws(() =>
        replayFromCheckpoint({
          checkpoint: {
            worldId: otherWorldId,
            worldSeq: checkpoint.worldSeq,
            checksum: checkpoint.checksum,
            snapshot: checkpoint.snapshot,
          },
          events: [],
        }),
      );
    } finally {
      await client`
        delete from simulation_checkpoints
        where world_id = ${otherWorldId}
      `;
      await client`
        delete from worlds
        where id = ${otherWorldId}
      `;
    }

    const futureSeq = BigInt(world.world_seq) + 1n;
    await assert.rejects(
      client`
        insert into simulation_checkpoints
          (world_id, world_seq, schema_version, snapshot, checksum)
        values
          (${worldId}, ${futureSeq}, 1,
           ${JSON.stringify(prefix.snapshot)}::jsonb,
           ${prefix.summaryHash})
      `,
    );
  } finally {
    await client`
      delete from simulation_checkpoints
      where world_id = ${worldId}
    `;
    await client.end();
  }
});
