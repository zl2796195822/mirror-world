/* Browser verification for CLIENT-C1.1 Web Observer. */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const API_BASE = process.env.MIRROR_API_BASE_URL ?? "http://127.0.0.1:3301";
const WEB_BASE = process.env.MIRROR_WEB_BASE_URL ?? "http://127.0.0.1:3300";
const WORLD_ID =
  process.env.MIRROR_WORLD_ID ?? "ae8bd0ce-c3bb-40e7-a60c-17287878804f";
const OUT_DIR = path.resolve(
  process.cwd(),
  "../../docs/verification/screenshots/CLIENT-C1.1",
);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  // Development session cookie value is the seed user id (HttpOnly).
  await context.addCookies([
    {
      name: "mirror_dev_session",
      value: "00000000-0000-4000-8000-000000000001",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);

  const results = {};

  for (const route of ["/world", "/residents", "/events"]) {
    await page.goto(`${WEB_BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const bodyText = await page.locator("body").innerText();
    const shot = path.join(OUT_DIR, `${route.replace("/", "")}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    results[route] = {
      url: page.url(),
      hasLive: bodyText.includes("LIVE"),
      hasWorldStatus: bodyText.includes("WORLD STATUS") || route !== "/world",
      residentCountMentions: (bodyText.match(/30/g) ?? []).length > 0,
      hasReconnecting:
        bodyText.includes("RECONNECTING") || bodyText.includes("STALE"),
      snippet: bodyText.slice(0, 500),
      screenshot: shot,
    };
  }

  // STALE / RECONNECTING: block API and reload world page.
  await page.route("**/api/v1/client/v0/**", (route) => route.abort());
  await page.route("**/api/v1/worlds**", (route) => route.abort());
  await page.goto(`${WEB_BASE}/world`, { waitUntil: "networkidle" });
  const staleText = await page.locator("body").innerText();
  const staleShot = path.join(OUT_DIR, "world-stale.png");
  await page.screenshot({ path: staleShot, fullPage: true });
  results.stale = {
    hasUnavailable:
      staleText.includes("暂不可用") || staleText.includes("未接入"),
    hasReconnecting:
      staleText.includes("RECONNECTING") || staleText.includes("STALE"),
    snippet: staleText.slice(0, 400),
    screenshot: staleShot,
  };

  // Recover: unroute and reload.
  await page.unrouteAll();
  await page.goto(`${WEB_BASE}/world`, { waitUntil: "networkidle" });
  const recoveredText = await page.locator("body").innerText();
  results.recovered = {
    hasLive: recoveredText.includes("LIVE"),
    hasWorldStatus: recoveredText.includes("WORLD STATUS"),
    snippet: recoveredText.slice(0, 400),
  };

  // API payload sizes and latency.
  const snapshotStart = Date.now();
  const snapshotResponse = await page.request.get(
    `${API_BASE}/api/v1/client/v0/worlds/${WORLD_ID}/snapshot`,
  );
  const snapshotJson = await snapshotResponse.text();
  const snapshotLatency = Date.now() - snapshotStart;
  const eventsStart = Date.now();
  const eventsResponse = await page.request.get(
    `${API_BASE}/api/v1/client/v0/worlds/${WORLD_ID}/events?limit=50`,
  );
  const eventsJson = await eventsResponse.text();
  const eventsLatency = Date.now() - eventsStart;

  results.metrics = {
    snapshotStatus: snapshotResponse.status(),
    snapshotBytes: snapshotJson.length,
    snapshotLatencyMs: snapshotLatency,
    eventsStatus: eventsResponse.status(),
    eventsBytes: eventsJson.length,
    eventsLatencyMs: eventsLatency,
    consoleErrors,
    worldId: WORLD_ID,
  };

  await browser.close();
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

await main();
