import { createDb } from "./client.js";
import { M0_FIXTURE, M0_FIXTURE_IDS } from "./fixture.js";
import { bootstrapResidentRuntimeStates } from "./resident-runtime-state.js";
import { users, worlds } from "./schema.js";

const { db, client } = createDb(
  process.env.DATABASE_URL ??
    "postgres://mirror:mirror_dev_only@localhost:5432/mirror",
);

try {
  await db
    .insert(users)
    .values(M0_FIXTURE.user)
    .onConflictDoUpdate({
      target: users.id,
      set: { email: M0_FIXTURE.user.email, status: M0_FIXTURE.user.status },
    });

  await db
    .insert(worlds)
    .values(M0_FIXTURE.world)
    .onConflictDoUpdate({
      target: worlds.id,
      set: {
        name: M0_FIXTURE.world.name,
        timezone: M0_FIXTURE.world.timezone,
        timeScale: M0_FIXTURE.world.timeScale,
        status: M0_FIXTURE.world.status,
        seed: M0_FIXTURE.world.seed,
        worldTime: M0_FIXTURE.world.worldTime,
        clockAnchorAt: M0_FIXTURE.world.clockAnchorAt,
        updatedAt: new Date(),
      },
    });

  await bootstrapResidentRuntimeStates(db, { worldId: M0_FIXTURE_IDS.world });

  console.log(
    `Seeded M0 fixtures: user=${M0_FIXTURE_IDS.user} world=${M0_FIXTURE_IDS.world}`,
  );
} finally {
  await client.end();
}
