# 07 - 异步意图流水线架构 (Async Intent Pipeline)

## 1. 全链路流水线全景图

在持久数字社会中，认知智能与世界物理之间通过一条完全异步、松耦合且具备版本栅栏的流水线连接。

```text
[ 1. 触发源 (Stimulus) ]
    ├── World Event (如: 收到打招呼 CONVERSATION_COMPLETED)
    ├── Schedule Tick (如: 工作结束时间点到)
    └── Player Interaction (如: 人类玩家在街头点击对话)
              │
              ▼
[ 2. 唤醒调度与门禁 (AgentWakeRouter) ]
    ├── 过滤: 居民是否处于 SLEEPING / BUSY ?
    ├── 评估: Intelligence LOD (LOD-I0 ~ LOD-I3)
    └── 决策: 若 LOD-I0/I1 则直接由 Life Engine 规则消化 (终止流程)
              │ (若为 LOD-I2 / I3)
              ▼
[ 3. 任务入队 (Ingress Queue - BullMQ Lanes) ]
    ├── 写入 Priority Lane (foreground / social / background)
    └── 设置并发配额与单居民排他防重
              │
              ▼
[ 4. 观察切片组装 (ObservationComposer) ]
    ├── 提取 Actor 实体当前版本 (actorVersion=N, worldSeq=S)
    ├── 空间视野裁剪 (Nearby Locations / Actors / Items)
    └── 检索 M4 记忆与关系投影 (Top-K)
              │
              ▼
[ 5. 认知执行与模型推理 (Agent Worker & ProviderPort) ]
    ├── 组装受限 Prompt / Context Window
    ├── 发起带 AbortController 的异步调用 (Wall-time 8s 超时守卫)
    └── 外部大模型推理 (OpenAI / Claude / DeepSeek / Local SLM)
              │
              ▼
[ 6. 结构化输出解析与门禁校验 (IntentParser & Validator) ]
    ├── Schema 运行时验证 (Zod Strict Parse)
    ├── 权限与能力校验 (Capability & Budget Check)
    └── 生成合法 ActionIntent (携带 basedOnActorVersion=N)
              │
              ▼
[ 7. 网关转换与幂等防重 (World Gateway) ]
    ├── 生成全局唯一 idempotencyKey 与 traceId
    ├── 转换为正式 ActionRequest (requestedBy: "AI", expectedActorVersion: N)
    └── 记录至 action_requests 表 (持久化请求指纹)
              │
              ▼
[ 8. 世界内核原子裁决 (World Kernel Transaction) ]
    ├── 校验: expectedActorVersion === current.actorVersion ?
    │         ├── 否 ──► 返回 KERNEL_CONFLICT (快照陈旧, 触发重规划)
    │         └── 是 ──► 继续执行业务规则纯函数校验
    └── 业务判定: 资产、道具、连通性是否满足?
              ├── 不满足 ──► 返回 REJECT (拒绝执行)
              └── 全部通过 ──► 原子 Commit: 变更实体状态 + 追加 world_events (SEQ=S+1)
```

---

## 2. 流水线核心组件设计规范

### 2.1 任务持久化与暂存（Operation Persistence）

- **职责**：在 Agent 进入思考时，任务元数据暂存于 Redis 运行态哈希表中（键名 `mirror:agent_op:{worldId}:{operationId}`），记录 `operationId`、`residentId`、`triggerEventType`、`lodTier`、`startedAt`、`deadline`。
- **持久化原则**：临时运行态数据不直接频繁刷写 PostgreSQL 核心表，只有最终完成的审计 Trace 才会批量落入 `ai_traces`。

### 2.2 结果交付闭环（Completion Delivery）

- **机制**：
  1. Worker 完成推理并验证意图后，直接通过内置的 `KernelActionPort` 调用网关接口。
  2. 网关将请求投递至内核待处理队列或直接在内核微批处理周期中执行。
  3. 内核裁决结果（`KernelActionOutcome`）通过发布-订阅（Redis Pub/Sub）或直接回调广播至 Agent Runtime。
  4. Agent Runtime 根据结果清理自身居民的 `inProgressOperationId` 标记。

### 2.3 超时断路器（Timeout Circuit Breaker）

- **机制**：
  - **提供商超时（Wall-time Provider Timeout）**：默认硬上限 8 秒。若外部模型超过 8 秒未返回首包或未完成，Node.js `AbortController` 立即终止 HTTP 连接。
  - **世界超时（World-time Deadline）**：意图携带 `expiresAtWorldTime`。若从唤醒到内核接收期间，世界时钟已经流逝超过该时间点，内核直接判定为过期，拒绝执行。

### 2.4 陈旧冲突安全着陆（Stale Result Safe Landing）

- **场景**：居民从 $T=0$ 开始思考（基于 $N$ 版本），耗时 6 秒完成。但在 $T=3$ 秒时，居民被另一位玩家推搡产生位移，导致居民版本升为 $N+1$。
- **处理规范**：
  1. 内核在事务中发现 `expectedActorVersion: N` 与当前实体的最新版本 `N+1` 不符。
  2. 内核坚决拒绝执行，返回原因码 `KERNEL_CONFLICT`。
  3. **严禁网关偷偷强行合并或强行写入！**
  4. Agent Runtime 收到 `KERNEL_CONFLICT` 后，本次操作以 `STALE` 状态收敛；若仍有规划需求，由状态机重新发起一次感知装配（Re-observe），带上最新版本 $N+1$ 重新决策。
