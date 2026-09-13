import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  createWriteStream,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { finished } from "node:stream/promises";

export const DEFAULT_NODE_HEAP_MB = 12_288;
export const IMMUTABLE_RUN_IDS = [
  "20260910-run-08",
  "20260911-run-14",
  "20260912-run-15",
  "20260912-run-16",
  "20260912-run-20",
  "20260913-run-21",
  "20260913-run-22",
  "20260913-run-23",
  "20260913-run-24",
  "20260913-run-25",
  "20260913-run-26",
  "20260913-run-27",
  "20260913-run-28",
];
export const IMMUTABLE_RUN_ID = IMMUTABLE_RUN_IDS[1];
const FORKED_JSON_VALIDATION_BYTES = 1_000_000;
const STREAMING_JSON_VALIDATION_BYTES = 8_000_000;
export const SCENARIO_ARTIFACTS = [
  "manifest.json",
  "scenario-summary.json",
  "run-summary.json",
  "action-statistics.json",
  "resident-summary.json",
  "causal-evidence.json",
  "coverage-funnel-v2.json",
  "event-summary.json",
  "replay-summary.json",
  "determinism-comparison.json",
  "failure-recovery-summary.json",
  "diagnostics.json",
  "hard-gates.json",
  "checksums.json",
];

export function jsonReplacer(key, value) {
  if (key === "id" && this?.__hashWithoutIds) return undefined;
  if (typeof value === "bigint") return value.toString();
  return value;
}

export function stringifyJson(value, space = 2, replacer = jsonReplacer) {
  return `${JSON.stringify(value, replacer, space)}\n`;
}

export function writeJsonAtomic(file, value, options = {}) {
  const { space = 2, replacer = jsonReplacer } = options;
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, stringifyJson(value, space, replacer), {
      flag: "w",
    });
    renameSync(temporary, file);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // The temporary file may not have been created.
    }
    throw error;
  }
}

function writeChunk(stream, chunk) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      stream.off("drain", onDrain);
      reject(error);
    };
    const onDrain = () => {
      stream.off("error", onError);
      resolve();
    };
    stream.once("error", onError);
    if (stream.write(chunk)) {
      stream.off("error", onError);
      resolve();
    } else {
      stream.once("drain", onDrain);
    }
  });
}

export async function writeJsonArrayObjectAtomic(
  file,
  { prefix, items, suffix, replacer = jsonReplacer },
) {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  const stream = createWriteStream(temporary, { flags: "w" });
  const completion = finished(stream, { cleanup: true });
  try {
    await writeChunk(stream, prefix);
    let index = 0;
    for (const item of items) {
      await writeChunk(
        stream,
        `${index === 0 ? "" : ","}${JSON.stringify(item, replacer)}`,
      );
      index += 1;
    }
    await writeChunk(stream, suffix);
    stream.end();
    await completion;
    renameSync(temporary, file);
  } catch (error) {
    stream.destroy();
    await completion.catch(() => undefined);
    try {
      unlinkSync(temporary);
    } catch {
      // The temporary file may not have been created.
    }
    throw error;
  }
}

export function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashJsonArray(items, replacer = jsonReplacer) {
  const hash = createHash("sha256");
  hash.update("[");
  items.forEach((item, index) => {
    if (index > 0) hash.update(",");
    hash.update(JSON.stringify(item, replacer));
  });
  hash.update("]");
  return hash.digest("hex");
}

export function validateJsonWellFormedStreamSync(file) {
  // Streaming JSON well-formedness check: tracks strings/escapes and
  // container depth without materializing the parsed value tree.
  const fd = openSync(file, "r");
  try {
    const buffer = Buffer.allocUnsafe(1 << 20);
    let depth = 0;
    let inString = false;
    let escaped = false;
    let started = false;
    let lastNonWs = "";
    let bytesRead = 0;
    while ((bytesRead = readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      for (let index = 0; index < bytesRead; index += 1) {
        const code = buffer[index];
        const char = String.fromCharCode(code);
        if (inString) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') inString = false;
          continue;
        }
        if (char === " " || char === "\n" || char === "\r" || char === "\t") {
          continue;
        }
        if (!started) {
          if (char !== "{" && char !== "[") {
            throw new Error(`invalid JSON start in ${file}: ${char}`);
          }
          started = true;
        }
        if (char === '"') inString = true;
        else if (char === "{" || char === "[") depth += 1;
        else if (char === "}" || char === "]") {
          depth -= 1;
          if (depth < 0) {
            throw new Error(`unbalanced JSON close in ${file}`);
          }
        }
        lastNonWs = char;
      }
    }
    if (inString) throw new Error(`unterminated JSON string in ${file}`);
    if (depth !== 0) throw new Error(`unbalanced JSON depth in ${file}: ${depth}`);
    if (!started) throw new Error(`empty JSON artifact: ${file}`);
    if (lastNonWs !== "}" && lastNonWs !== "]") {
      throw new Error(`invalid JSON end in ${file}: ${lastNonWs}`);
    }
  } finally {
    closeSync(fd);
  }
  return true;
}

export function validateJsonArtifacts(directory, names = SCENARIO_ARTIFACTS) {
  for (const name of names) {
    const file = `${directory}/${name}`;
    const stats = statSync(file);
    assert.equal(stats.isFile(), true, `missing artifact: ${name}`);
    if (stats.size > STREAMING_JSON_VALIDATION_BYTES) {
      validateJsonWellFormedStreamSync(file);
    } else if (stats.size > FORKED_JSON_VALIDATION_BYTES) {
      execFileSync(
        process.execPath,
        [
          "-e",
          'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))',
          file,
        ],
        { stdio: "ignore" },
      );
    } else {
      readJson(file);
    }
  }
  return true;
}

export function assertNewRunId(runId) {
  assert.ok(runId, "GATE_RUN_ID is required");
  assert.ok(
    !IMMUTABLE_RUN_IDS.includes(runId),
    `immutable run ${runId} cannot be reused`,
  );
  assert.match(runId, /^\d{8}-run-\d+$/, "invalid immutable run id");
}
