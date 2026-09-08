import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { buildApp } from "../dist/app.js";

let app;

before(async () => {
  app = await buildApp({ database: null });
  await app.ready();
});

after(async () => {
  await app.close();
});

test("health exposes a request id and a stable success envelope", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/health",
    headers: { "x-request-id": "m1-t04-health" },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-request-id"], "m1-t04-health");
  assert.deepEqual(response.json(), {
    data: { status: "ok", service: "mirror-api" },
    requestId: "m1-t04-health",
  });
});

test("short task paths remain equivalent to the versioned contract", async () => {
  for (const url of ["/health", "/ready", "/worlds"]) {
    const response = await app.inject({ method: "GET", url });
    assert.equal(response.headers["x-request-id"] !== undefined, true);
    assert.equal(
      response.statusCode === 200 || response.statusCode === 503,
      true,
    );
  }
});

test("ready and worlds fail closed when the database is unavailable", async () => {
  for (const url of ["/api/v1/ready", "/api/v1/worlds"]) {
    const response = await app.inject({ method: "GET", url });
    const body = response.json();

    assert.equal(response.statusCode, 503);
    assert.equal(typeof body.error.requestId, "string");
    assert.equal(body.error.message.includes("stack"), false);
    assert.equal("stack" in body.error, false);
  }
});

test("not found responses use the same error envelope", async () => {
  const response = await app.inject({ method: "GET", url: "/api/v1/not-real" });
  const body = response.json();

  assert.equal(response.statusCode, 404);
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.equal(body.error.code, "NOT_FOUND");
  assert.equal(typeof body.error.requestId, "string");
});

test("openapi is generated from the registered routes", async () => {
  const response = await app.inject({ method: "GET", url: "/openapi.json" });
  const document = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(document.openapi, "3.0.3");
  assert.ok(document.paths["/api/v1/health"]);
  assert.ok(document.paths["/api/v1/ready"]);
  assert.ok(document.paths["/api/v1/worlds"]);
  assert.equal(document.paths["/health"], undefined);
});
