# SOURCE_EVIDENCE.md

> 统一说明：本文件为 `30-source-evidence.md` 的规范镜像。

详情请完整参阅：[30-source-evidence.md](./30-source-evidence.md)

### 审计证据清单摘要：

1. OpenClaw Core (`src/process/command-queue.ts`, `lanes.ts`) -> REFERENCE
2. a16z AI Town (`convex/aiTown/agentOperations.ts`, `abstractGame.ts`) -> REFERENCE
3. Vercel AI SDK (`packages/core/generate-object`) -> DEPENDENCY_CANDIDATE
4. BullMQ (`src/classes/queue.ts`, `worker.ts`) -> DEPENDENCY_CANDIDATE (CONDITIONAL)
5. Letta / Mem0 -> REFERENCE
