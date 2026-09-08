import assert from "node:assert/strict";
import { test } from "node:test";
import { createDb } from "@mirror/db";
import {
  findWorldCheckpoint,
  persistWorldCheckpoint,
  replayFromCheckpoint,
  replayWorldEvents,
} from "@mirror/world-kernel";

const worldId = "00000000-0000-4000-8000-000000000002";

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
