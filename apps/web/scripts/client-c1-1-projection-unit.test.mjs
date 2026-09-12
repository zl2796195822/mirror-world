import assert from "node:assert/strict";
import process from "node:process";
import { test } from "node:test";
import {
  activityCounts,
  formatWorldClock,
  loadClientObserverBundle,
  shortId,
} from "../lib/client-projection.ts";

test("formatWorldClock uses honest world date labels", () => {
  const label = formatWorldClock("2026-09-10T14:30:00.000Z");
  assert.equal(label.dayLabel, "World Date 2026-09-10");
  assert.equal(label.timeLabel, "14:30");
});

test("activityCounts maps projection activities without fabrication", () => {
  const counts = activityCounts([
    { activity: "TRAVELING" },
    { activity: "WORKING" },
    { activity: "TALKING" },
    { activity: "SLEEPING" },
    { activity: "EATING" },
    { activity: "IDLE" },
  ]);
  assert.equal(counts.MOVE, 1);
  assert.equal(counts.WORK, 1);
  assert.equal(counts.TALK, 1);
  assert.equal(counts.SLEEP, 1);
  assert.equal(counts.EAT, 1);
  assert.equal(counts.IDLE, 1);
});

test("shortId is deterministic", () => {
  assert.equal(shortId("0c8e28ed-a7d0-5431-95c6-50d7e511e899"), "0C8E28ED");
});

test("loadClientObserverBundle returns RECONNECTING when API is unreachable", async () => {
  process.env.MIRROR_API_BASE_URL = "http://127.0.0.1:1";
  process.env.MIRROR_WORLD_ID = "00000000-0000-4000-8000-000000000002";
  const bundle = await loadClientObserverBundle();
  assert.equal(bundle.status, "UNAVAILABLE");
  assert.equal(bundle.connection, "RECONNECTING");
});
