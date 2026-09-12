import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  SCENARIO_ARTIFACTS,
  sha256,
  writeJsonAtomic,
} from "./m3-story-gate-runner-infra.mjs";
import {
  finalizeStoryGate,
  loadScenarioSummary,
  runSerialStoryGate,
} from "./m3-lifecycle-story-gate-runner.mjs";

const TARGET_TIME = "2026-10-07T00:00:00.000Z";
const SEEDS = {
  baseline: "mirror-m3-lifecycle-story-gate-world-v1",
  repeat: "mirror-m3-lifecycle-story-gate-world-v1",
  different: "mirror-m3-lifecycle-story-gate-world-v2",
};

function summary(role) {
  const manifestInput = {
    runId: "20260912-run-15",
    residentCount: 30,
    residentFixtureHash: `fixture-${role}`,
    resourceFixtureHash: `resource-${role}`,
    coverageContractVersion: "m3-story-gate-coverage-v2",
  };
  const manifest = {
    ...manifestInput,
    manifestHash: sha256(JSON.stringify(manifestInput)),
  };
  return {
    schemaVersion: "m3-story-gate-scenario-summary-v1",
    role,
    seed: SEEDS[role],
    manifest,
    fixtureResidentCount: 30,
    fixtureHashVerified: true,
    resourceFixtureHashVerified: true,
    unemployedResidentIds: ["resident-0"],
    finalWorld: { world_time: TARGET_TIME, world_seq: "100" },
    endpoint: { remainingActiveActivities: 0, remainingDueWakes: 0 },
    acceptedActionCoverage: true,
    commuteCoverage: true,
    hashes: {
      live: "projection",
      full: "projection",
      suffix: "projection",
      genesis: "projection",
    },
    storyDigest: role === "different" ? "digest-different" : "digest-same",
    recovery: {
      attempts: 2,
      committed: 1,
      rejected: 1,
      conflicts: 0,
      replans: 0,
      deferred: 0,
      stop: 0,
    },
    stats: [
      {
        residentId: "resident-0",
        actionsByType: { WORK: { committed: 0 } },
      },
    ],
    causalEvidenceCount: 1,
    causalEvidenceWithNextObservation: 1,
    eventChecks: {
      needEffectPolicyValid: true,
      workAttendanceValid: true,
      talkParticipantsPresent: true,
      hasCompletedAction: true,
    },
    resourceRows: [{ foodUnits: 1 }],
    initialFoodUnits: 1,
    finalFoodUnits: 1,
    diagnostics: {
      UNEXPECTED_BUY_EXECUTION: 0,
      LLM_PATH_USED: 0,
      ISOLATION_VIOLATION: 0,
    },
  };
}

async function fakeChild({ role, artifactDir }) {
  const scenario = summary(role);
  for (const name of SCENARIO_ARTIFACTS) {
    writeJsonAtomic(
      join(artifactDir, name),
      name === "scenario-summary.json"
        ? scenario
        : name === "manifest.json"
          ? scenario.manifest
          : { role },
    );
  }
}

test("serial orchestration flushes each role before starting the next", async () => {
  const root = mkdtempSync(join(tmpdir(), "mirror-gate-runner-"));
  const order = [];
  const result = await runSerialStoryGate({
    runId: "20260912-run-15",
    root,
    databaseUrls: ["baseline", "repeat", "different"],
    spawnChild: async (input) => {
      order.push(`start:${input.role}`);
      await fakeChild(input);
      order.push(`end:${input.role}`);
    },
    summaryLoader: loadScenarioSummary,
  });
  assert.deepEqual(order, [
    "start:baseline",
    "end:baseline",
    "start:repeat",
    "end:repeat",
    "start:different",
    "end:different",
  ]);
  assert.equal(result.status, "PASS");
  assert.equal(result.hardGates.length, 15);
  assert.equal(
    result.summaries.baseline.storyDigest,
    result.summaries.repeat.storyDigest,
  );
});

test("finalizer reads persisted summaries without parsing raw evidence", async () => {
  const sourceRoot = mkdtempSync(
    join(tmpdir(), "mirror-gate-finalizer-source-"),
  );
  const scenariosRoot = join(sourceRoot, "scenarios");
  for (const role of ["baseline", "repeat", "different"]) {
    const artifactDir = join(scenariosRoot, role);
    await fakeChild({ role, artifactDir });
  }
  writeFileSync(
    join(scenariosRoot, "baseline", "causal-evidence.json"),
    "not JSON, intentionally not loaded by the finalizer",
  );
  const result = finalizeStoryGate({
    root: join(sourceRoot, "finalized"),
    scenariosRoot,
    summaryLoader: loadScenarioSummary,
  });
  assert.equal(result.status, "PASS");
  assert.equal(result.hardGates.length, 15);
});

test("reduced verification mode is forwarded to every child only when enabled", async () => {
  const root = mkdtempSync(join(tmpdir(), "mirror-gate-reduced-"));
  const seen = [];
  await runSerialStoryGate({
    runId: "20260912-run-17",
    root,
    databaseUrls: ["baseline", "repeat", "different"],
    reducedScenario: true,
    reducedWorldMinutes: 1_920,
    spawnChild: async (input) => {
      seen.push({
        role: input.role,
        reducedScenario: input.reducedScenario,
        reducedWorldMinutes: input.reducedWorldMinutes,
      });
      await fakeChild(input);
    },
    summaryLoader: loadScenarioSummary,
  });
  assert.deepEqual(seen, [
    {
      role: "baseline",
      reducedScenario: true,
      reducedWorldMinutes: 1_920,
    },
    {
      role: "repeat",
      reducedScenario: true,
      reducedWorldMinutes: 1_920,
    },
    {
      role: "different",
      reducedScenario: true,
      reducedWorldMinutes: 1_920,
    },
  ]);
});

test("partial scenario failure writes abort record and never finalizes gates", async () => {
  const root = mkdtempSync(join(tmpdir(), "mirror-gate-abort-"));
  await assert.rejects(
    runSerialStoryGate({
      runId: "20260912-run-16",
      root,
      databaseUrls: ["baseline", "repeat", "different"],
      spawnChild: async (input) => {
        if (input.role === "repeat") throw new Error("synthetic child failure");
        await fakeChild(input);
      },
      summaryLoader: loadScenarioSummary,
    }),
    /synthetic child failure/,
  );
  const aborted = JSON.parse(
    await readFile(join(root, "aborted-run.json"), "utf8"),
  );
  assert.equal(aborted.status, "INFRA_FAILURE");
  assert.equal(aborted.lifecycle, "ABORTED_BEFORE_GATE_FINALIZE");
  assert.deepEqual(aborted.completedRoles, ["baseline"]);
  assert.equal(aborted.finalizerRun, false);
});

test("parent refuses immutable run-14 before touching artifacts", async () => {
  const root = mkdtempSync(join(tmpdir(), "mirror-gate-run14-"));
  await assert.rejects(
    runSerialStoryGate({
      runId: "20260911-run-14",
      root,
      databaseUrls: ["baseline", "repeat", "different"],
      spawnChild: async () => assert.fail("child must not start"),
    }),
    /cannot be reused/,
  );
});
