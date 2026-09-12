/* CLI runner for CLIENT-C1.1 lifecycle verification evidence. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { runClientC11LifecycleVerification } from "./client-c1-1-lifecycle-harness.mjs";

const worldId = process.env.C11_WORLD_ID ?? randomUUID();
const worldDays = Number(process.env.C11_WORLD_DAYS ?? 2);
const result = await runClientC11LifecycleVerification({
  worldId,
  worldDays,
  captureAtHours: [0, 6, 14, 26],
});

const outDir = path.resolve(
  process.cwd(),
  "../../docs/verification/artifacts/CLIENT-C1.1",
);
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, "real-lifecycle-summary.json");
await writeFile(outFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      worldId: result.worldId,
      finalWorldTime: result.finalWorldTime,
      finalWorldSeq: result.finalWorldSeq,
      eventCount: result.eventCount,
      actionCoverage: result.actionCoverage,
      snapshots: result.snapshots.map((snapshot) => ({
        worldTime: snapshot.capturedAtWorldTime,
        worldSeq: snapshot.worldSeq,
        activities: snapshot.activityDistribution,
      })),
      elapsedMs: result.elapsedMs,
      outFile,
    },
    null,
    2,
  ),
);
