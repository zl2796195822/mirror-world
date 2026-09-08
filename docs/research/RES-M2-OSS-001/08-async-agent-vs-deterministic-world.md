# 08 - 异步智能体与确定性世界内核解耦架构研究 (Async Agent vs Deterministic World)

在镜界长期愿景中，核心矛盾之一是：

- **AI Agent 的异步性与不确定性**：大模型推理耗时不可预测（数百毫秒至数十秒）、可能遭遇网络超时、速率限制（Rate Limit）、重试、非确定性幻觉或并发决策。
- **World Kernel 的强一致与确定性**：内核必须单调顺序推进、事务隔离、毫秒级裁决、可审计、支持确定性重放。

若让 Agent 线程直接在推理过程中操作世界，或者阻塞世界主循环等待 LLM 返回，系统将在几秒钟内彻底崩溃。本专题重点探索如何在这两者之间构建一道坚不可摧的“防火墙”。

---

## 1. 三种候选架构深度对比

```mermaid
flowchart TD
    subgraph Candidate 1: Direct Polling & Mutate
        A1[Agent Thread / LLM Call] -->|等待 3-10 秒| B1[直接向 Kernel 提交写操作]
        B1 -->|高概率状态已过期 / 事务回滚| C1[(World State)]
    end

    subgraph Candidate 2: In-Engine Operation Pause (AI Town 模式)
        A2[Simulation Tick] -->|发现需思考| B2[设置 inProgressOperation]
        B2 -->|后台调度 Action| C2[异步 LLM 推理]
        C2 -->|产生 finishInput| D2[Input Queue]
        D2 -->|下一 Tick 顺序消费| A2
    end

    subgraph Candidate 3: Decoupled Intent Queue with Fencing Token (推荐模式)
        A3[Agent Cognitive Runtime] -->|读只读 Observation Snapshot| B3[异步推理 / 多次重试]
        B3 -->|产出结构化 Intent| C3[Intent Message Queue]
        C3 -->|Gateway 校验 + 赋予 Fencing Token| D3[ActionRequest 表]
        D3 -->|Kernel 顺序事务裁决| E3[World Kernel Validator & Commit]
        E3 -->|成功生成 Event / 失败生成 Reject| F3[(PostgreSQL Event Ledger)]
    end
```

### 方案 A：直接调用/轮询提交 (Direct Request Model)

- **机制**：Agent 线程完成思考后，直接调用 API 向 World Kernel 发送 ActionRequest，若因状态变更或版本冲突失败，则自行重试。
- **优势**：架构极为简单，无中间队列基础设施。
- **缺点**：
  - **严重的状态滞后（Stale State）**：当 Agent 耗时 5 秒思考完成并发送 `MOVE to Door` 时，Door 可能早在第 2 秒就被锁上，导致大量请求在内核中直接冲突报错。
  - **雪崩效应**：1,000 个 Agent 同时遇到网络抖动并重试时，瞬时并发流量直接打爆数据库连接池。

### 方案 B：模拟步挂起操作模式 (AI Town In-Engine Operation Pattern)

- **机制**：
  - 由世界引擎的 Agent 状态机统一管理操作生命周期。
  - 当 Agent 需要思考时，由引擎在其状态中打上 `inProgressOperation = { id, type, startedAt }` 标记并冻结其高层决策。
  - 引擎派发异步任务（Convex Action 或外部 Worker）；主世界物理与移动继续推进。
  - 异步任务完成后，向引擎的 `inputs` 表提交 `finishOperation`；引擎核对 `operationId` 吻合后才解除挂起并应用结果。
- **优势**：
  - 天然防并发：单个 Agent 同一时间只能运行一个活跃 Operation，绝不产生自身冲突。
  - 生命周期闭环完整，引擎随时可依据 `startedAt` 触发超时强制取消（Timeout Cancellation）。
- **缺点**：
  - 引擎与 Agent 运行时耦合度偏高，引擎必须感知异步操作的具体类型与 ID 分配。

### 方案 C：解耦意图队列 + Fencing Token 租约模式 (Recommended Pattern)

- **机制**：
  1. **认知与世界严格物理隔离**：Agent Runtime 独立运行于应用服务集群（或外部客户端），只能读取公开的世界观察切片（World Observation Snapshot），其内部推理完全不触碰数据库连接。
  2. **意图产出（Intent Formulation）**：Agent 推理出的不是世界事实，而是遵循严格 Schema 的 `ActionIntent`，包含它生成意图时依据的世界时间戳 `baseWorldTime` 与实体版本 `baseActorVersion`。
  3. **意图缓冲与速率削峰（Intent Queue）**：通过 Redis/BullMQ 缓冲池进行流量削峰，隔离并发冲击。
  4. **门禁与栅栏令牌（Fencing Gateway）**：网关取出 Intent，转换为正式的 `ActionRequest`，打上唯一 `idempotencyKey` 与 `traceId`。
  5. **Kernel 确定性裁决（Kernel Arbitration）**：Kernel 在事务内执行确定性校验。如果当前实体的最新版本 `actor.version !== expectedActorVersion`，说明在 Agent 思考期间世界已被改写，立即判定为 `KERNEL_CONFLICT`，安全丢弃或通知 Agent 重新感知。
  6. **账本记录与反应闭环**：裁决成功生成不可变 Event；Agent 监听事件流获知自身动作已被世界接纳。

---

## 2. 核心架构问题针对性分析与推荐标准

| 评估指标                         | 方案 A (直接调用)              | 方案 B (AI Town 挂起操作)               | 方案 C (解耦意图队列 + Fencing 门禁)                   | 推荐与理由                                                            |
| -------------------------------- | ------------------------------ | --------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| **确定性 (Determinism)**         | 差（受网络时延影响极大）       | 良（由单线程引擎逐步消费）              | **优（意图带版本栅栏，事务内单调仲裁）**               | **方案 C**: 保证即便 Agent 耗时任意久，也绝不可能给内核引入非确定性。 |
| **时序与全序 (Ordering)**        | 差（取决于哪个网络包先到）     | 良（按 InputQueue 入队顺序）            | **优（由 Gateway 分配序号，Kernel 行锁确立全序）**     | **方案 C**: 保障多 Agent 行为的因果一致性。                           |
| **迟到动作 (Late Action)**       | 易产生诡异“穿越”行为           | 依赖 OperationId 匹配，但缺乏细粒度版本 | **通过 `expectedActorVersion` + 严格失效窗口优雅拒绝** | **方案 C**: 彻底杜绝 10 秒前的思考覆盖 1 秒前的最新状态。             |
| **陈旧状态 (Stale State)**       | 频繁发生，且无体系化防御       | 靠逻辑代码手工检查状态合法性            | **内核层自动化前置版本校验 (`KERNEL_CONFLICT`)**       | **方案 C**: 将防陈旧逻辑固化在内核校验器中，减轻 Agent 编写心智负担。 |
| **并发冲突 (Version Conflicts)** | 高频触发，导致应用层异常风暴   | 低（单 Agent 串行）                     | **极低且可控（排队接入 + 乐观并发重试）**              | **方案 C**: 兼顾多 Agent 并发吞吐与单 Agent 行为安全。                |
| **运行与 Token 成本**            | 高（无序冲突引发频繁无效重试） | 中（单实体单任务，偶有 OCC 冲突）       | **可控（支持 Intelligence LOD，低价值思考直接截断）**  | **方案 C**: 具备与算力调度结合的扩展弹性。                            |

---

## 3. 镜界最终推荐架构设计（建议蓝图）

```text
+-------------------------------------------------------------+
|                      Agent Runtime Pool                     |
|  (LLM Calls / Memory Retrieval / Strategy / Multi-turn)     |
+-------------------------------------------------------------+
                              | (Produces ActionIntent)
                              v
+-------------------------------------------------------------+
|                 Ingress Queue (Redis / BullMQ)              |
|        (Rate Limiting / Priority Lanes / Concurrency Cap)   |
+-------------------------------------------------------------+
                              | (Transforms to ActionRequest)
                              v
+-------------------------------------------------------------+
|              World Gateway / ActionRequest Store            |
|         (Persists Idempotency Key & SHA-256 Fingerprint)    |
+-------------------------------------------------------------+
                              | (Passes into Transaction)
                              v
+-------------------------------------------------------------+
|                  World Kernel Core Arbiter                  |
|    - Validates: World Status & Clock                        |
|    - Validates: expectedActorVersion == actor.version       |
|    - Validates: Location, Inventory, Balance                |
|    - Commits: State Mutation + world_events in ONE SQL Tx   |
+-------------------------------------------------------------+
```

### 关键约束备忘

1. **Agent 思考期间不持有任何数据库锁**：严禁在开启数据库事务的同时发起 LLM HTTP 请求。
2. **Intent 必须显式携带基准版本号**：意图一旦发出，若现实世界版本已跃迁，内核判定为合法冲突，不产生脏写入。
3. **世界时钟推进绝不等待任何 Agent**：时间如常流动，Agent 思考过慢是其自身“发呆”或“犹豫”，世界不会因某人思考而冻结。
