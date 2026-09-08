# 30 - 外部源码证据考据清单 (Source Evidence)

> **注**：本文件同时作为 `SOURCE_EVIDENCE.md` 归档。详述本次研究所审查的外部开源代码的具体路径、符号与架构物证。

---

## 1. 核心外部项目代码级证据清单

### 1.1 OpenClaw Core (`openclaw/openclaw`)

- **来源库**: `openclaw/openclaw` (MIT)
- **核心文件路径**:
  1. `src/process/command-queue.ts`
  2. `src/process/lanes.ts`
- **代码级符号与结构物证**:
  - `class CommandQueue`: 实现了内部多通道优先级调度；
  - `type CommandLane = 'main' | 'background' | 'subagent'`: 定义了按任务性质隔离的物理车道；
  - `runInLane(lane, fn, abortSignal)`: 实现了带取消信号的受限执行沙箱。
- **架构考据发现 (Finding)**:
  - OpenClaw 通过将交互通道与后台巡检通道隔离，成功避免了重型任务阻塞前端；镜界吸收其设计思想，设计了 5 大优先级车道。
- **复用定级**: **REFERENCE**

---

### 1.2 a16z AI Town (`a16z-infra/ai-town`)

- **来源库**: `a16z-infra/ai-town` (Commit `8e05997f2409275669c8344b84a51692e83f3f33`, MIT)
- **核心文件路径**:
  1. `convex/aiTown/agent.ts:238-250`
  2. `convex/aiTown/agentOperations.ts:18-70`
  3. `convex/engine/abstractGame.ts:39-75`
- **代码级符号与结构物证**:
  - `inProgressOperation = { name, operationId, started: now }`: 内存状态标记，声明当前 Agent 正在异步思考；
  - `sendInput('finishDoSomething', { operationId, ... })`: 异步任务完成后，并不直接写库，而是作为输入提交给引擎消费；
  - `AbstractGame.runStep`: 主模拟循环在 Agent 思考期间继续按 60Hz Tick 推进。
- **架构考据发现 (Finding)**:
  - 证明了“世界模拟主循环绝不等待大模型返回”的可行性与优越性。但 AI Town 每秒全量加载全局状态到内存（`Game.load()`）的做法在 1,000+ 规模下直接导致内存暴跌，必须坚决摒弃。
- **复用定级**: **REFERENCE**

---

### 1.3 Vercel AI SDK (`vercel/ai`)

- **来源库**: `vercel/ai` (v4.1.0, Apache-2.0)
- **核心文件路径**:
  1. `packages/core/generate-object/generate-object.ts`
  2. `packages/core/types/usage.ts`
- **代码级符号与结构物证**:
  - `generateObject<T>({ model, schema: z.ZodSchema<T>, prompt, abortSignal })`: 原生深度绑定 Zod Schema，强制大模型通过 JSON Mode 或 Tool Calling 输出严格强类型对象；
  - `type LanguageModelUsage = { promptTokens, completionTokens, totalTokens }`: 标准化的算力开销计量接口。
- **架构考据发现 (Finding)**:
  - 极其成熟优雅的抽象，天然抹平了 OpenAI、Anthropic、DeepSeek 与本地端侧模型的私有差异，能完美承载镜界 M5 的 `ProviderPort` 契约需求。
- **复用定级**: **DEPENDENCY_CANDIDATE**

---

### 1.4 BullMQ (`taskforcesh/bullmq`)

- **来源库**: `taskforcesh/bullmq` (v5.34.0, MIT)
- **核心文件路径**:
  1. `src/classes/queue.ts`
  2. `src/classes/worker.ts`
  3. `src/interfaces/jobs-options.ts`
- **代码级符号与结构物证**:
  - `queue.add(name, data, { priority, jobId, removeOnComplete })`: 支持基于权重的优先级调度与基于 `jobId` 的单居民去重；
  - `worker.process(...)`: 分布式无状态 Worker 认领任务，原生支持并发配额（`concurrency`）与连接复用；
  - Redis Lua 脚本原子认领与看门狗锁续期机制。
- **架构考据发现 (Finding)**:
  - 工业级稳定的削峰填谷中间件，非常适合管理 M5 的 5 大优先级车道。但必须重申：Redis 仅为调度队列，绝不能借尸还魂替代 PostgreSQL 作为持久事实源。
- **复用定级**: **DEPENDENCY_CANDIDATE (CONDITIONAL)**

---

### 1.5 Letta / MemGPT (`letta-ai/letta`) & Mem0 (`mem0ai/mem0`)

- **来源库**: `letta-ai/letta` (Apache-2.0) / `mem0ai/mem0` (Apache-2.0)
- **核心文件路径**:
  1. `letta/agent.py`
  2. `mem0/memory/main.py`
- **代码级符号与结构物证**:
  - `MemoryItem` / `ContextMemory`: 将记忆划分为固定 Prompt 槽位与动态检索槽位；
  - 基于检索相似度与时间衰减的加权排序算法。
- **架构考据发现 (Finding)**:
  - 验证了定额分箱上下文组装（Context Composer）在控制 Token 预算方面的有效性。但其重型的自主循环（Autonomous Loop）会破坏镜界 World Kernel 的中心化裁决权，因此仅供概念参考。
- **复用定级**: **REFERENCE**
