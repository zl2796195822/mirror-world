# 03 - a16z AI Town 深度源码剖析与技术审查 (AI Town Analysis)

- **研究对象**: `a16z-infra/ai-town`
- **审计版本 Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **许可证**: MIT
- **核心文件证据**:
  - `ARCHITECTURE.md`
  - `convex/engine/abstractGame.ts`
  - `convex/engine/historicalObject.ts`
  - `convex/engine/schema.ts`
  - `convex/aiTown/main.ts`
  - `convex/aiTown/game.ts`
  - `convex/aiTown/agent.ts`
  - `convex/aiTown/agentOperations.ts`
  - `convex/aiTown/conversation.ts`
  - `convex/agent/conversation.ts`
  - `convex/agent/memory.ts`

---

## 核心技术问题深度解答 (17项专题)

### 1. AI Town 的权威状态在哪里？

- **代码事实**: 权威状态位于 Convex 数据库的文档集合中，由引擎独占的表组成：
  - `engines`：保存当前时钟 `currentTime`、处理进度 `processedInputNumber`、代数计数 `generationNumber`（`convex/engine/schema.ts`）。
  - `worlds`、`players`、`agents`、`conversations`、`conversationMemberships`（`convex/aiTown/schema.ts`）。
- **运行特征**: 权威状态虽然持久化在 Convex，但**在每个 Step 执行期间，整个活跃世界的所有对象会被全量反序列化加载进服务器内存**（`Game.load()` in `convex/aiTown/game.ts`）。内存对象（Plain JavaScript Objects / Classes）在 Step 期间充当临时权威，Step 结束时通过 Diff 计算写回 Convex。

### 2. 谁可以修改 Simulation State？

- **代码事实**: **严格只有单一的游戏引擎主循环（Game Engine Step）可以修改 Simulation State**。
- `ARCHITECTURE.md` 明确指出：游戏引擎对存储引擎状态的表拥有**排他性独占权（Exclusively owns the tables）**。任何外部主体（人类玩家客户端、后台异步 LLM Action）绝对不能直接发起 Mutation 修改 `players` 或 `worlds` 表。
- 外部所有修改意图必须作为数据行插入 `inputs` 表，排队等待引擎在下一 Step 中按单线程顺序消费。

### 3. 输入如何进入 simulation？

- **代码事实**:
  1. 客户端或 Agent 异步任务调用 Mutation（例如 `api.aiTown.main.sendInput` 或 `insertInput`）。
  2. `engineInsertInput`（`convex/engine/abstractGame.ts:133-154`）获取递增序号 `number = prevInput.number + 1`，打上服务器接收时间戳 `received: Date.now()`，写入 `inputs` 表。
  3. 此时并没有修改世界，输入处于待消费状态。
  4. 引擎在执行 `runStep` 时通过 `loadInputs` 读取未处理输入。

### 4. input queue 如何工作？

- **代码事实**:
  - **基于数据库表的持久队列**：不是内存通道，而是持久化在 `inputs` 集合中，带有索引 `byInputNumber`。
  - **按接收时间与 Tick 对齐**：在 `AbstractGame.runStep`（`convex/engine/abstractGame.ts:39-75`）内部，按 Tick 步进时间 `currentTs` 遍历输入队列。只有满足 `input.received <= currentTs` 的输入才会被取出并喂给 `handleInput`。
  - **结果写回与客户端轮询**：输入执行完成后，无论成功（`kind: 'ok', value`）或异常（`kind: 'error', message`），都会暂存在 `completedInputs` 数组中，并在 Step 结束时批量更新回 `inputs` 表对应行的返回值字段。客户端通过 `inputStatus` 订阅或轮询得知结果。

### 5. tick / step 如何推进？

- **代码事实**:
  - **双层时间模型（Two-tiered Cadence）**：
    - **Tick（高频模拟步）**：`tickDuration` 默认为 16ms（即 60Hz），负责连续平滑物理、路径点步进（`Player.tickPathfinding`）、碰撞与简单状态机演进。
    - **Step（低频事务步）**：`stepDuration` 默认为 1000ms（即 1Hz）。
  - **批处理循环**：Convex 调度器每秒唤醒一次 `runStep` Action。在一次 `runStep` 中，引擎在内存里循环执行多次 Tick（直到达到 `maxTicksPerStep` 或当前批次时间窗口耗尽），交替处理符合该 Tick 时间戳的输入并调用 `this.tick(currentTs)`。
  - **提交与代数锁**：Tick 全部结束后，`this.engine.generationNumber += 1`，调用 `saveStep` 一次性将差异写回数据库。通过 `generationNumber` 乐观锁确保没有并发两个 `runStep` 同时运行。

### 6. agent async operation 与 simulation tick 如何隔离？

- **代码事实**:
  - 这是 AI Town 最具借鉴价值的设计（`ARCHITECTURE.md` & `convex/aiTown/agentOperations.ts`）。
  - **禁止在 Tick 内直接调用 LLM**：LLM 推理动辄耗时数秒，若在 Tick 内同步等待，整个单线程模拟世界将被冻结。
  - **状态机标记与操作解耦**：当 `Agent.tick` 发现需要 LLM 决策或访问外部向量库时，调用 `startOperation(game, now, name, args)`（`convex/aiTown/agent.ts:238-250`）。
  - `startOperation` 在 Agent 内存状态中记录 `inProgressOperation = { name, operationId, started: now }`。
  - 随后在 Step 结束提交时，Convex 异步调度器派发独立的 `internalAction`（如 `agentGenerateMessage`、`agentDoSomething`、`agentRememberConversation`）。
  - **模拟继续前行**：在 LLM 推理期间，主模拟循环依然每秒正常运行 Step 和 60Hz Tick。Agent 在世界中处于等待或播放对应动作状态。
  - **输入反馈闭环**：LLM 完成后，Action 并不写库，而是调用 `sendInput('finishDoSomething', { operationId, ... })`，由引擎在下一 Tick 中验证 `operationId` 并安全收敛状态。

### 7. agent 什么时候提出动作？

- **代码事实**:
  - 在两类场景提出动作：
    1. **Tick 驱动的规则层**（`Agent.tick`）：在每个模拟 Tick 中，Agent 根据局部状态提出简单几何动作（如向对话同伴移动、走向目标、超时退出等），这些在 Tick 内直接转换为移动请求。
    2. **异步操作完成时**（`internalAction` 返回）：当 LLM 完成思考，在 Action 内部通过发送 `finishDoSomething`、`finishRememberConversation` 等输入，向引擎提出高级决策。

### 8. 动作什么时候真正改变世界？

- **代码事实**:
  - **只有当输入被引擎消费，或者 Tick 完成了状态更新，并在 Step 结束完成数据库事务提交（`saveWorld`）的那一刻，动作才真正改变世界**。
  - 在此之前，Agent 内部的任何计算或 LLM 输出都只是“意图”。若 Step 执行中途服务器崩溃或 `generationNumber` 冲突回滚，所有未持久化的状态彻底作废。

### 9. conversation 是：world fact / agent state / 还是 application state？

- **代码事实**: AI Town 的 Conversation 呈现**分层异构**特征：
  - **Conversation Membership & Status（世界事实）**：位于 `convex/aiTown/conversation.ts` 与 `conversationMemberships.ts`。谁和谁在谈话、距离是否合法、是否正在走到一起（`invited`, `walkingOver`, `participating`），属于**世界状态（World Fact）**，由引擎强一致维护。
  - **Typing Indicator（半世界/协调状态）**：`conversation.isTyping` 记录在世界表中，用于防止 Agent 彼此抢话。
  - **Message Content（文本内容 / Application State）**：`convex/schema.ts` 中的 `messages` 表**完全独立于游戏引擎**！文字内容由流式接口直接写入，不经过引擎 Tick。这是为了极低延迟流式打字与减少引擎状态体积而作的工程妥协。

### 10. memory 如何与 simulation state 交互？

- **代码事实**:
  - **离线写入**：对话结束后，调度异步任务 `agentRememberConversation`（`convex/aiTown/agentOperations.ts:18-44`），调用 LLM 提炼对话摘要，计算 Embedding，写入 Convex Vector Index。
  - **按需检索注入 Prompt**：当 Agent 准备开启新对话时，在异步 Action 中执行 Vector Query（例如针对对话目标查询历史评价），组装进 LLM Prompt。
  - **完全不阻塞世界**：Memory 的存取完全发生在 Agent 异步 Action 中，与世界物理模拟隔离。

### 11. 是否存在类似 command / action / event / transaction 的结构？

- **对比分析**:
  - **Command**：对应其 `inputs` 表及 `inputHandler`。
  - **Action**：包含两层——游戏内部的 `moveTo`, `startConversation`，以及 Convex 框架的 `internalAction`（处理 LLM IO）。
  - **Event**：**没有结构化的 Event Ledger**。AI Town 没有全局唯一的顺序事件账本，状态变化以覆盖更新和状态 Diff（`Game.saveStep`）持久化。
  - **Transaction**：依赖 Convex 函数的单表/多表原子事务能力。

### 12. 是否具有 deterministic replay？

- **代码事实**: **完全不具备确定性重放能力（Non-deterministic）**。
  - 输入只记录接收时间戳 `received: Date.now()`，依赖网络波动。
  - 代码大量使用未固定 seed 的原生 `Math.random()`（如 `sleep(Math.random() * 1000)`、随机游走挑选目标、随机活动等）。
  - 核心状态推进严重依赖服务器物理时钟 `Date.now()`。
  - 无法通过输入重新推演得出完全一致的状态。

### 13. 随机性在哪里？

- **代码事实**:
  - `convex/aiTown/agentOperations.ts:34, 116, 130, 159`：`sleep(Math.random() * 1000)`（用来打散并发 OCC 冲突）。
  - `wanderDestination`：随机生成坐标点。
  - `ACTIVITIES[Math.floor(Math.random() * ...)]`：随机选择行为。
  - LLM 调用的非确定性输出（Temperature > 0）。

### 14. 时间模型是什么？

- **代码事实**:
  - **混合型 Wall-clock 驱动**。
  - 引擎维护一个内部时钟 `this.engine.currentTime`，但在每个 Step 启动时，使用当前现实时间 `now = Date.now()` 作为目标边界，并据此计算需要补齐多少个 Tick。若服务器负载高，Tick 步长与实际时间可能漂移。

### 15. 数据库/持久化模型是什么？

- **代码事实**: 基于 **Convex Document Database**（JSON-like Documents + 自动响应式订阅 + 乐观并发控制 OCC）。所有实体是 Document ID 驱动的文档对象。

### 16. 哪些设计适合 30 residents？

- **良好表现**:
  - 30 个实体的全局状态在内存中仅有数十 KB，每秒全量加载（`Game.load()`）与 Diff 序列化耗时极低（< 5ms）。
  - 1Hz Step + 60Hz 内部 Tick 配合客户端 `HistoricalObject` 插值，能在极小开销下呈现极其流畅的 2D 走动表现。
  - 异步 Agent 操作隔离（`startOperation`）保证 30 个居民偶尔对话时，主世界毫不卡顿。

### 17. 哪些设计在 1000+ / 10000+ 会出现严重崩溃？

- **致命瓶颈清单**:
  1. **全量内存加载与写回**：`ARCHITECTURE.md` 坦承其设计要求全部活跃状态小于几十 KB。10,000 个居民的完整属性、背包、社交关系达到数十 MB，每秒反序列化和写回将直接拖垮 CPU 和数据库带宽。
  2. **单线程 World 引擎**：单世界单线程无法利用分布式多核；当 1,000+ 实体同时触发碰撞与路径规划时，Tick 计算超时，导致 Simulation 严重落后现实时间。
  3. **基于数据库的 Input Queue 与 OCC 冲突**：当大量 Agent 和玩家高频提交 Input 时，频繁写 `inputs` 表和并发触发引擎，将产生海量 OCC（Optimistic Concurrency Control）事务冲突重试（源码自身注记：`TODO: We hit a lot of OCC errors on sending inputs`）。
  4. **缺乏空间分区（No Spatial Partitioning）**：没有 Spatial Grid 或 AOI，全图所有实体在一个数组里线性遍历与广播。
