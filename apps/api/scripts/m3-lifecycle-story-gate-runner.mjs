/* global console, process */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_NODE_HEAP_MB,
  SCENARIO_ARTIFACTS,
  assertNewRunId,
  readJson,
  writeJsonAtomic,
} from "./m3-story-gate-runner-infra.mjs";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const SCENARIO_SCRIPT = resolve(
  SCRIPT_DIRECTORY,
  "m3-lifecycle-story-gate.mjs",
);
const START_TIME = new Date("2026-09-07T00:00:00.000Z");
const WORLD_DAYS = 30;
const WORLD_MINUTES = WORLD_DAYS * 24 * 60;
const TARGET_TIME = new Date(START_TIME.getTime() + WORLD_MINUTES * 60_000);
const WORLD_SEED = "mirror-m3-lifecycle-story-gate-world-v1";
const DIFFERENT_WORLD_SEED = "mirror-m3-lifecycle-story-gate-world-v2";
const PARENT_RUN_ID = "20260911-run-14";
const ROLE_SEEDS = {
  baseline: WORLD_SEED,
  repeat: WORLD_SEED,
  different: DIFFERENT_WORLD_SEED,
};
const ROLE_ORDER = ["baseline", "repeat", "different"];
const FINAL_ARTIFACTS = SCENARIO_ARTIFACTS;

function requireFreshDirectory(directory) {
  try {
    assert.equal(statSync(directory).isDirectory(), true);
    assert.equal(
      readdirSync(directory).length,
      0,
      `artifact directory is not empty: ${directory}`,
    );
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
}

function assertScenarioArtifactFiles(directory) {
  for (const name of SCENARIO_ARTIFACTS) {
    assert.equal(
      statSync(`${directory}/${name}`).isFile(),
      true,
      `missing scenario artifact: ${name}`,
    );
  }
}

export function loadScenarioSummary(directory, role) {
  assertScenarioArtifactFiles(directory);
  const summary = readJson(`${directory}/scenario-summary.json`);
  assert.equal(summary.schemaVersion, "m3-story-gate-scenario-summary-v1");
  assert.equal(summary.role, role);
  assert.equal(summary.seed, ROLE_SEEDS[role]);
  const { manifestHash, ...manifestInput } = summary.manifest;
  assert.deepEqual(readJson(`${directory}/manifest.json`), summary.manifest);
  assert.equal(manifestHash, summary.manifest.manifestHash);
  assert.equal(
    manifestHash,
    createHash("sha256").update(JSON.stringify(manifestInput)).digest("hex"),
  );
  assert.equal(summary.fixtureResidentCount, summary.manifest.residentCount);
  assert.equal(summary.fixtureHashVerified, true);
  assert.equal(summary.resourceFixtureHashVerified, true);
  assert.equal(typeof summary.storyDigest, "string");
  assert.equal(typeof summary.recovery.committed, "number");
  return summary;
}

export function runScenarioChild({
  role,
  databaseUrl,
  artifactDir,
  runId,
  heapMb = DEFAULT_NODE_HEAP_MB,
  reducedScenario = false,
  reducedWorldMinutes = 1_920,
}) {
  const childEnv = {
    ...process.env,
    GATE_RUN_ID: runId,
    GATE_HEAP_MB: String(heapMb),
    GATE_SINGLE_ROLE: role,
    GATE_SINGLE_DATABASE_URL: databaseUrl,
    GATE_ARTIFACT_DIR: artifactDir,
  };
  if (reducedScenario) {
    childEnv.GATE_REDUCED_SCENARIO = "1";
    childEnv.GATE_WORLD_DAYS = "1";
    childEnv.GATE_WORLD_MINUTES = String(reducedWorldMinutes);
  } else {
    delete childEnv.GATE_REDUCED_SCENARIO;
    delete childEnv.GATE_WORLD_DAYS;
    delete childEnv.GATE_WORLD_MINUTES;
  }
  return new Promise((resolveChild, rejectChild) => {
    const child = spawn(
      process.execPath,
      [`--max-old-space-size=${heapMb}`, SCENARIO_SCRIPT],
      {
        cwd: resolve(SCRIPT_DIRECTORY, "../../.."),
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectChild);
    child.on("close", (code, signal) => {
      if (code === 0) {
        resolveChild({ stdout, stderr });
        return;
      }
      const detail = [
        `scenario ${role} exited with ${signal ?? `code ${code}`}`,
        stderr.trim(),
        stdout.trim(),
      ]
        .filter(Boolean)
        .join("\n");
      rejectChild(new Error(detail));
    });
  });
}

function evaluateGateResult({ baseline, repeat, different }) {
  const sameSeedEqual = baseline.storyDigest === repeat.storyDigest;
  const differentSeed =
    baseline.storyDigest !== different.storyDigest &&
    baseline.manifest.residentFixtureHash !==
      different.manifest.residentFixtureHash;
  const b = baseline;
  const hardGates = [
    [
      1,
      "Run endpoint",
      new Date(b.finalWorld.world_time).toISOString() ===
        TARGET_TIME.toISOString() &&
        b.finalWorld.world_seq !== null &&
        b.endpoint.remainingActiveActivities === 0 &&
        b.endpoint.remainingDueWakes === 0,
    ],
    [
      2,
      "Fixture integrity",
      b.fixtureResidentCount === 30 &&
        b.fixtureHashVerified === true &&
        b.resourceFixtureHashVerified === true,
    ],
    [3, "Accepted action coverage", b.acceptedActionCoverage],
    [
      4,
      "Causal chain",
      b.causalEvidenceCount === b.recovery.committed &&
        b.causalEvidenceWithNextObservation === b.causalEvidenceCount,
    ],
    [5, "Need response", b.causalEvidenceCount > 0],
    [6, "Need effect", b.eventChecks.needEffectPolicyValid],
    [
      7,
      "Work obligation",
      b.eventChecks.workAttendanceValid &&
        b.stats
          .filter(({ residentId }) =>
            b.unemployedResidentIds.includes(residentId),
          )
          .every(({ actionsByType }) => actionsByType.WORK.committed === 0),
    ],
    [
      8,
      "Resource conservation",
      b.resourceRows.every(({ foodUnits }) => Number(foodUnits) >= 0) &&
        b.finalFoodUnits <= b.initialFoodUnits,
    ],
    [9, "TALK legality / atomicity", b.eventChecks.talkParticipantsPresent],
    [
      10,
      "Bounded recovery",
      b.recovery.replans <= 2 * 30 && b.recovery.stop >= 0,
    ],
    [
      11,
      "Liveness",
      b.eventChecks.hasCompletedAction &&
        new Date(b.finalWorld.world_time).toISOString() ===
          TARGET_TIME.toISOString(),
    ],
    [12, "Spatial / activity safety", b.hashes.live === b.hashes.full],
    [13, "Replay equivalence", new Set(Object.values(b.hashes)).size === 1],
    [14, "Determinism", sameSeedEqual && differentSeed],
    [
      15,
      "Isolation / scope",
      b.diagnostics.UNEXPECTED_BUY_EXECUTION === 0 &&
        b.diagnostics.LLM_PATH_USED === 0 &&
        b.diagnostics.ISOLATION_VIOLATION === 0,
    ],
  ].map(([number, name, passed]) => ({
    number,
    name,
    result: passed ? "PASS" : "FAIL",
  }));
  return { sameSeedEqual, differentSeed, hardGates };
}

function writeFinalArtifacts({ root, scenariosRoot, summaries, gateResult }) {
  mkdirSync(root, { recursive: true });
  const baselineRoot = `${scenariosRoot}/baseline`;
  for (const name of FINAL_ARTIFACTS) {
    copyFileSync(`${baselineRoot}/${name}`, `${root}/${name}`);
  }
  const b = summaries.baseline;
  const allPass = gateResult.hardGates.every(({ result }) => result === "PASS");
  writeJsonAtomic(`${root}/run-summary.json`, {
    status: allPass ? "PASS" : "FAIL",
    worldTimeReached: b.finalWorld.world_time,
    worldMinutesReached: WORLD_MINUTES,
    finalWorldSeq: b.finalWorld.world_seq,
    actionAttempts: b.recovery.attempts,
    committed: b.recovery.committed,
    rejected: b.recovery.rejected,
    conflicts: b.recovery.conflicts,
    replans: b.recovery.replans,
    deferred: b.recovery.deferred,
    acceptedActionCoverage: b.acceptedActionCoverage,
    commuteCoverage: b.commuteCoverage,
    runId: b.manifest.runId,
    parentRunId: b.manifest.parentRunId,
    previousStatus: b.manifest.previousStatus,
    coverageContractVersion: b.manifest.coverageContractVersion,
    storySanityVersion: b.manifest.storySanityVersion,
    runnerStrategy: b.manifest.runnerStrategy,
    heapProfile: b.manifest.heapProfile,
    endpoint: b.endpoint,
    liveProjectionHash: b.hashes.live,
    fullReplayProjectionHash: b.hashes.full,
    suffixReplayProjectionHash: b.hashes.suffix,
    genesisRebuildProjectionHash: b.hashes.genesis,
    deterministicDigest: b.storyDigest,
    repeatDeterministicDigest: summaries.repeat.storyDigest,
  });
  writeJsonAtomic(`${root}/determinism-comparison.json`, {
    runA: b.storyDigest,
    runB: summaries.repeat.storyDigest,
    sameSeedEqual: gateResult.sameSeedEqual,
    differentSeed: gateResult.differentSeed,
  });
  writeJsonAtomic(`${root}/hard-gates.json`, gateResult.hardGates);
  writeJsonAtomic(
    `${root}/scenario-summaries.json`,
    ROLE_ORDER.map((role) => ({
      role,
      artifactDir: `scenarios/${role}`,
      storyDigest: summaries[role].storyDigest,
      manifestHash: summaries[role].manifest.manifestHash,
      finalWorldSeq: summaries[role].finalWorld.world_seq,
    })),
  );
  assertScenarioArtifactFiles(root);
  readJson(`${root}/run-summary.json`);
  readJson(`${root}/hard-gates.json`);
  return { status: allPass ? "PASS" : "FAIL", hardGates: gateResult.hardGates };
}

function writeAbortedRun({ root, runId, failedRole, completedRoles, error }) {
  writeJsonAtomic(`${root}/aborted-run.json`, {
    schemaVersion: "m3-story-gate-aborted-run-v1",
    runId,
    parentRunId: PARENT_RUN_ID,
    previousStatus: "INFRA_FAILURE",
    status: "INFRA_FAILURE",
    lifecycle: "ABORTED_BEFORE_GATE_FINALIZE",
    failedRole,
    completedRoles,
    resultFilesEmitted: completedRoles.flatMap((role) =>
      SCENARIO_ARTIFACTS.map((name) => `scenarios/${role}/${name}`),
    ),
    finalizerRun: false,
    error: String(error?.message ?? error),
  });
}

export function finalizeStoryGate({
  root,
  scenariosRoot,
  summaryLoader = loadScenarioSummary,
}) {
  const summaries = Object.fromEntries(
    ROLE_ORDER.map((role) => [
      role,
      summaryLoader(`${scenariosRoot}/${role}`, role),
    ]),
  );
  const gateResult = evaluateGateResult({
    baseline: summaries.baseline,
    repeat: summaries.repeat,
    different: summaries.different,
  });
  return {
    ...writeFinalArtifacts({
      root,
      scenariosRoot,
      summaries,
      gateResult,
    }),
    summaries,
  };
}

export async function runSerialStoryGate({
  runId,
  root,
  databaseUrls,
  heapMb = DEFAULT_NODE_HEAP_MB,
  reducedScenario = false,
  reducedWorldMinutes = 1_920,
  spawnChild = runScenarioChild,
  summaryLoader = loadScenarioSummary,
}) {
  assertNewRunId(runId);
  assert.equal(databaseUrls.length, ROLE_ORDER.length);
  requireFreshDirectory(root);
  mkdirSync(root, { recursive: true });
  const scenariosRoot = `${root}/scenarios`;
  const completedRoles = [];
  let failedRole = null;
  try {
    for (const [index, role] of ROLE_ORDER.entries()) {
      failedRole = role;
      const artifactDir = `${scenariosRoot}/${role}`;
      mkdirSync(artifactDir, { recursive: true });
      await spawnChild({
        role,
        databaseUrl: databaseUrls[index],
        artifactDir,
        runId,
        heapMb,
        reducedScenario,
        reducedWorldMinutes,
      });
      summaryLoader(artifactDir, role);
      completedRoles.push(role);
    }
    return finalizeStoryGate({ root, scenariosRoot, summaryLoader });
  } catch (error) {
    writeAbortedRun({
      root,
      runId,
      failedRole,
      completedRoles,
      error,
    });
    throw error;
  }
}

async function main() {
  const runId = process.env.GATE_RUN_ID;
  const root = process.env.GATE_ARTIFACT_DIR;
  const databaseUrls = [
    process.env.GATE_BASELINE_DATABASE_URL,
    process.env.GATE_REPEAT_DATABASE_URL,
    process.env.GATE_DIFFERENT_DATABASE_URL,
  ];
  if (!runId || !root || databaseUrls.some((value) => !value)) {
    throw new Error(
      "M3 Story Gate parent requires GATE_RUN_ID, GATE_ARTIFACT_DIR, and three clean PostgreSQL URLs",
    );
  }
  const result = await runSerialStoryGate({
    runId,
    root,
    databaseUrls,
    heapMb: Number(process.env.GATE_HEAP_MB ?? DEFAULT_NODE_HEAP_MB),
    reducedScenario: process.env.GATE_REDUCED_SCENARIO === "1",
    reducedWorldMinutes: Number(process.env.GATE_WORLD_MINUTES ?? 1_920),
  });
  console.log(
    JSON.stringify({
      status: result.status,
      runId,
      artifactDir: root,
      hardGates: result.hardGates,
    }),
  );
  if (result.status !== "PASS") process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
