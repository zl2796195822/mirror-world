import assert from "node:assert/strict";
import { test } from "node:test";
import { createDb, M0_FIXTURE_IDS } from "@mirror/db";
import { buildApp } from "../dist/app.js";

const worldId = M0_FIXTURE_IDS.world;
const seedTime = "2026-09-06T22:00:00.000Z";
const at = (value) => new Date(`2026-09-08T${value}Z`);

async function appAt(environment, value) {
  const app = await buildApp({
    database: createDb(),
    environment,
    clockNow: () => at(value),
  });
  await app.ready();
  return app;
}

test("world clock persists scale, pause, production policy, and restart monotonicity", async () => {
  let app = await appAt("development", "00:00:00.000");
  let response = await app.inject({
    method: "POST",
    url: `/api/v1/worlds/${worldId}/admin/time`,
    payload: { status: "RUNNING", timeScale: 10 },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.world.worldTime, seedTime);
  await app.close();

  app = await appAt("development", "00:00:02.000");
  response = await app.inject({
    method: "GET",
    url: `/api/v1/worlds/${worldId}`,
  });
  assert.equal(
    response.json().data.world.worldTime,
    "2026-09-06T22:00:20.000Z",
  );
  await app.close();

  app = await appAt("development", "00:01:02.000");
  response = await app.inject({
    method: "POST",
    url: `/api/v1/worlds/${worldId}/admin/time`,
    payload: { status: "PAUSED" },
  });
  assert.equal(
    response.json().data.world.worldTime,
    "2026-09-06T22:10:20.000Z",
  );
  await app.close();

  app = await appAt("development", "00:02:02.000");
  response = await app.inject({
    method: "GET",
    url: `/api/v1/worlds/${worldId}`,
  });
  assert.equal(
    response.json().data.world.worldTime,
    "2026-09-06T22:10:20.000Z",
  );
  await app.close();

  app = await appAt("development", "00:03:02.000");
  response = await app.inject({
    method: "POST",
    url: `/api/v1/worlds/${worldId}/admin/time`,
    payload: { status: "RUNNING", timeScale: 100 },
  });
  assert.equal(response.json().data.world.timeScale, 100);
  await app.close();

  app = await appAt("production", "00:03:03.000");
  response = await app.inject({
    method: "GET",
    url: `/api/v1/worlds/${worldId}`,
  });
  assert.equal(
    response.json().data.world.worldTime,
    "2026-09-06T22:10:21.000Z",
  );
  assert.equal(response.json().data.world.timeScale, 1);
  response = await app.inject({
    method: "POST",
    url: `/api/v1/worlds/${worldId}/admin/time`,
    payload: { status: "RUNNING", timeScale: 10 },
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, "WORLD_TIME_CONTROL_DISABLED");
  await app.close();

  app = await appAt("production", "00:03:00.000");
  response = await app.inject({
    method: "GET",
    url: `/api/v1/worlds/${worldId}`,
  });
  assert.equal(
    response.json().data.world.worldTime,
    "2026-09-06T22:10:21.000Z",
  );
  await app.close();
});
