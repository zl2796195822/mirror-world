import { and, asc, eq, gt } from "drizzle-orm";
import type { createDb } from "./client.js";
import { worldEvents, worlds } from "./schema.js";

export type WorldEventReadDatabase = ReturnType<typeof createDb>["db"];

export type WorldEventRow = typeof worldEvents.$inferSelect;
export type WorldRecord = typeof worlds.$inferSelect;

export async function readWorldById(
  database: WorldEventReadDatabase,
  worldId: string,
): Promise<WorldRecord | null> {
  const rows = await database
    .select()
    .from(worlds)
    .where(eq(worlds.id, worldId))
    .limit(1);
  return rows[0] ?? null;
}

export async function readWorldEventsAfterSeq(
  database: WorldEventReadDatabase,
  input: Readonly<{
    worldId: string;
    afterSeq: bigint;
    limit: number;
  }>,
): Promise<readonly WorldEventRow[]> {
  return database
    .select()
    .from(worldEvents)
    .where(
      and(
        eq(worldEvents.worldId, input.worldId),
        gt(worldEvents.seq, input.afterSeq),
      ),
    )
    .orderBy(asc(worldEvents.seq))
    .limit(input.limit);
}
