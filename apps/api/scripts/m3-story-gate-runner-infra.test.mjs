import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  SCENARIO_ARTIFACTS,
  assertNewRunId,
  hashJsonArray,
  readJson,
  validateJsonArtifacts,
  writeJsonArrayObjectAtomic,
  writeJsonAtomic,
} from "./m3-story-gate-runner-infra.mjs";

test("atomic JSON writer handles bigint, overwrite, and cleanup", () => {
  const directory = mkdtempSync(join(tmpdir(), "mirror-gate-infra-"));
  const file = join(directory, "artifact.json");
  writeJsonAtomic(file, { seq: 12n, at: new Date("2026-09-07T00:00:00Z") });
  writeJsonAtomic(file, { version: 2 });
  assert.deepEqual(readJson(file), { version: 2 });
  assert.deepEqual(readdirSync(directory), ["artifact.json"]);
});

test("hashJsonArray is deterministic without building a combined JSON array", () => {
  const rows = Array.from({ length: 20_000 }, (_, index) => ({
    index,
    value: `evidence-${index}`,
  }));
  const left = hashJsonArray(rows);
  const right = hashJsonArray(rows.map((row) => ({ ...row })));
  assert.equal(left, right);
});

test("bounded array hash keeps the legacy canonical hash bytes", () => {
  const events = [
    { id: "event-1", seq: 1n, occurredAt: new Date("2026-09-07T00:00:00Z") },
    { id: "event-2", seq: 2n, payload: { action: "MOVE" } },
  ];
  const legacy = createHash("sha256")
    .update(
      JSON.stringify(
        events.map((event) =>
          JSON.parse(
            JSON.stringify(event, (key, value) => {
              if (key === "id") return undefined;
              if (typeof value === "bigint") return value.toString();
              return value;
            }),
          ),
        ),
      ),
    )
    .digest("hex");
  const bounded = hashJsonArray(events, (key, value) => {
    if (key === "id") return undefined;
    if (typeof value === "bigint") return value.toString();
    return value;
  });
  assert.equal(bounded, legacy);
});

test("large evidence artifact flush remains machine-readable", async () => {
  const directory = mkdtempSync(join(tmpdir(), "mirror-gate-stress-"));
  const rows = Array.from({ length: 15_000 }, (_, index) => ({
    schemaVersion: "m3-story-gate-coverage-v2",
    residentId: `resident-${index % 30}`,
    evidence: "bounded-verification-evidence".repeat(8),
  }));
  const file = join(directory, "coverage-funnel-v2.json");
  await writeJsonArrayObjectAtomic(file, {
    prefix: '{"rows":[',
    items: rows,
    suffix: "]}\n",
  });
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(parsed.rows.length, rows.length);
  assert.ok(readFileSync(file, "utf8").length > 1_000_000);
  assert.equal(
    validateJsonArtifacts(directory, ["coverage-funnel-v2.json"]),
    true,
  );
});

test("streaming artifact failure removes the temporary file", async () => {
  const directory = mkdtempSync(join(tmpdir(), "mirror-gate-stream-failure-"));
  const file = join(directory, "coverage-funnel-v2.json");
  const items = (function* entries() {
    yield { row: 1 };
    throw new Error("synthetic stream failure");
  })();
  await assert.rejects(
    writeJsonArrayObjectAtomic(file, {
      prefix: '{"rows":[',
      items,
      suffix: "]}\n",
    }),
    /synthetic stream failure/,
  );
  assert.equal(existsSync(file), false);
  assert.deepEqual(readdirSync(directory), []);
});

test("generated evidence stream completes under a constrained child heap", () => {
  const directory = mkdtempSync(join(tmpdir(), "mirror-gate-memory-stress-"));
  const file = join(directory, "coverage-funnel-v2.json");
  const moduleUrl = new URL(
    "./m3-story-gate-runner-infra.mjs",
    import.meta.url,
  );
  const script = `
    import { writeJsonArrayObjectAtomic } from ${JSON.stringify(moduleUrl.href)};
    const file = process.argv[1];
    await writeJsonArrayObjectAtomic(file, {
      prefix: "[",
      items: (function* () {
        for (let index = 0; index < 120000; index += 1) {
          yield { index, evidence: "bounded-verification-evidence".repeat(8) };
        }
      })(),
      suffix: "]\\n",
    });
  `;
  execFileSync(
    process.execPath,
    ["--max-old-space-size=64", "--input-type=module", "-e", script, file],
    { stdio: "inherit" },
  );
  assert.ok(readFileSync(file, "utf8").length > 10_000_000);
  assert.equal(
    validateJsonArtifacts(directory, ["coverage-funnel-v2.json"]),
    true,
  );
});

test("scenario artifact validation checks every required file", () => {
  const directory = mkdtempSync(join(tmpdir(), "mirror-gate-artifacts-"));
  for (const name of SCENARIO_ARTIFACTS)
    writeJsonAtomic(join(directory, name), {});
  assert.equal(validateJsonArtifacts(directory), true);
});

test("immutable run-14 cannot be reused", () => {
  assert.throws(() => assertNewRunId("20260911-run-14"), /cannot be reused/);
  assert.doesNotThrow(() => assertNewRunId("20260912-run-15"));
});
