# 11 - 关键源码证据清单 (Source Evidence)

本文件详实记录在源码对照审查过程中提取的 19 条核心技术证据。每一个建议均有明确的代码位置、函数符号、实测行为记录及镜界映射指引，坚决杜绝“凭印象猜测源码”。

---

### FIND-AT-001: 数据库持久化输入队列

- **Project**: AI Town (`a16z-infra/ai-town`)
- **Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **Source File**: `convex/engine/abstractGame.ts`
- **Symbol / Module**: `engineInsertInput` (Lines 133-154)
- **Observed Behavior**: 输入不进入易失的进程内存队列，而是作为文档插入数据库 `inputs` 表，打上自增序号 `number` 与接收时间戳 `received: Date.now()`。
- **Mirror Implication**: 验证了“输入先持久化为数据行，再进入引擎消费”的合理性。镜界应将 `action_requests` 作为事实持久化队列底座。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH

---

### FIND-AT-002: 双层时间步进模型 (Tick & Step)

- **Project**: AI Town (`a16z-infra/ai-town`)
- **Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **Source File**: `convex/engine/abstractGame.ts`
- **Symbol / Module**: `AbstractGame.runStep` (Lines 22-88)
- **Observed Behavior**: 60Hz 的连续 Tick 在单个 1Hz Step 内部被批量循环推进，一次性消耗时间戳匹配的输入并产出状态 Diff，极大节省数据库事务开销。
- **Mirror Implication**: 提示镜界在 M3/M7 实时化改造中，不应为高频移动发起高频独立 SQL 事务，而应采用周期性批处理步进。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH

---

### FIND-AT-003: 异步智能体操作挂起与完成闭环

- **Project**: AI Town (`a16z-infra/ai-town`)
- **Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **Source File**: `convex/aiTown/agent.ts` & `agentOperations.ts`
- **Symbol / Module**: `Agent.startOperation` (Lines 238-250) & `agentDoSomething` (Lines 93-160)
- **Observed Behavior**: Agent 需要调用 LLM 时，在自身状态挂载 `inProgressOperation` 锁并由调度器在主循环外派发异步 Action；主模拟循环绝不等待；Action 完成后调用 `sendInput('finishDoSomething')` 送回输入队列，由引擎核验 `operationId` 后收敛状态。
- **Mirror Implication**: 彻底解决了 LLM 耗时导致的世界主循环卡死问题。镜界未来 M3/M5 的 Agent 决策应当深度复用此模式。
- **Reuse Class**: REFERENCE (PORT PATTERN)
- **Confidence**: HIGH

---

### FIND-AT-004: 基于 Generation Number 的引擎单例调度防并发锁

- **Project**: AI Town (`a16z-infra/ai-town`)
- **Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **Source File**: `convex/engine/abstractGame.ts`
- **Symbol / Module**: `loadEngine` (Lines 112-131)
- **Observed Behavior**: 引擎维护自增的 `generationNumber`，所有被调度的 Step 执行必须携带预期的代数。若被新调度挤占或超时取消，代数递增直接使旧调用失效，防范两个引擎实例重叠。
- **Mirror Implication**: 对镜界设计后台 Simulator 单例 Lease 提供了极佳参考。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH

---

### FIND-AT-005: 全量内存加载导致的大规模扩展硬瓶颈

- **Project**: AI Town (`a16z-infra/ai-town`)
- **Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **Source File**: `ARCHITECTURE.md`
- **Symbol / Module**: Section `Design goals and limitations` (Lines 285-302)
- **Observed Behavior**: 架构官方坦承：每个 Step 必须把所有活跃世界对象全量载入内存，且状态必须控制在几十 KB 以内。因此不适合成千上万个对象交互的大型社会。
- **Mirror Implication**: 明确警示镜界绝对不能采取“每秒把整个城市所有居民全量读出、计算 Diff 再全量写回”的路线；镜界必须走空间分片与局部按需加载。
- **Reuse Class**: DO NOT USE
- **Confidence**: HIGH

---

### FIND-AT-006: 散落的非受控随机性破坏重放

- **Project**: AI Town (`a16z-infra/ai-town`)
- **Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **Source File**: `convex/aiTown/agentOperations.ts`
- **Symbol / Module**: Lines 34, 116, 130, 159
- **Observed Behavior**: 代码中大量直接使用 `sleep(Math.random() * 1000)`、随机数组索引与现实时间戳，缺乏确定性伪随机种子生成器。
- **Mirror Implication**: 镜界必须维持 `worlds.seed` 并使用可注入 PRNG，禁止在内核与生命周期中调用原生 `Math.random()`。
- **Reuse Class**: DO NOT USE
- **Confidence**: HIGH

---

### FIND-AT-007: 对话文本与核心物理状态物理隔离

- **Project**: AI Town (`a16z-infra/ai-town`)
- **Commit**: `8e05997f2409275669c8344b84a51692e83f3f33`
- **Source File**: `ARCHITECTURE.md`
- **Symbol / Module**: Section `Message data model` (Lines 95-113)
- **Observed Behavior**: 聊天消息表完全独立于游戏引擎状态，流式输出直接入库；引擎只管理两人的对话成员状态（`conversationMemberships`）。
- **Mirror Implication**: 镜界的对谈动作（`TALK`）也应遵循：内核只确立对谈事实与参与者权限，长篇聊天内容由内容服务流式存取，避免膨胀世界事实。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH

---

### FIND-CON-001: 实体提议与中介仲裁模式 (Putative Event)

- **Project**: Concordia (`google-deepmind/concordia`)
- **Commit**: `9e4173f64a9f6c7990d2f5f52a11bc8e1f3aa61c`
- **Source File**: `concordia/environment/engines/sequential.py`
- **Symbol / Module**: Lines 317-333
- **Observed Behavior**: Agent 调用 `act()` 仅仅产出自然语言文本，被引擎包装为 `[putative_event]`。只有当 Game Master 调用 `resolve()` 完成裁决后，它才被确认为不可变事实 `[event]`。
- **Mirror Implication**: 完美契合镜界的 `ActionRequest != Event` 原则。Agent 无论智商多高，永远只能提出假定动作。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH

---

### FIND-CON-002: LLM 作为世界事实裁决者的系统性风险

- **Project**: Concordia (`google-deepmind/concordia`)
- **Commit**: `9e4173f64a9f6c7990d2f5f52a11bc8e1f3aa61c`
- **Source File**: `concordia/components/game_master/event_resolution.py`
- **Symbol / Module**: `EventResolution.pre_act` (Lines 141-217)
- **Observed Behavior**: 动作仲裁完全依赖向大模型发送 Prompt（_"Because of all that came before, what happens next?"_），模型推理出的文本直接成为不可逆的世界事实。
- **Mirror Implication**: 镜界严正拒绝此模式。数字社会的资产转移、物理移动与权限控制必须由确定性代码与数据库把关，绝不能使用 LLM 作为事实法官。
- **Reuse Class**: DO NOT USE (FORBIDDEN)
- **Confidence**: HIGH

---

### FIND-CON-003: 实体组件化观察生成机制

- **Project**: Concordia (`google-deepmind/concordia`)
- **Commit**: `9e4173f64a9f6c7990d2f5f52a11bc8e1f3aa61c`
- **Source File**: `concordia/environment/engine.py` & `engines/sequential.py`
- **Symbol / Module**: `make_observation` (Lines 93-104)
- **Observed Behavior**: 世界状态变化后，引擎不向全局盲目广播统一数据，而是调用 GM 的 `make_observation` 为每个实体单独生成契合其感官和位置的观察。
- **Mirror Implication**: 镜界在未来 M3/M7 向 Agent 提供输入时，应采用观察切片生成器，依据其所处地点只提供其能够感知到的事实。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH

---

### FIND-CON-004: 生成式时钟 (Generative Clock) 的不可控性

- **Project**: Concordia (`google-deepmind/concordia`)
- **Commit**: `9e4173f64a9f6c7990d2f5f52a11bc8e1f3aa61c`
- **Source File**: `concordia/components/game_master/world_state.py`
- **Symbol / Module**: `GenerativeClock` (Lines 405-450)
- **Observed Behavior**: 时钟推进并非数学计数，而是让 LLM 根据上下文剧情自由描述时间经过了多久。
- **Mirror Implication**: 这种设计在学术叙事实验中极富创意，但在工业级模拟中会导致物理时间错乱崩溃。镜界坚持由 PostgreSQL 锚定和确定性毫秒公式推进时钟。
- **Reuse Class**: DO NOT USE
- **Confidence**: HIGH

---

### FIND-CON-005: 内存字符串线性扫描的规模限制

- **Project**: Concordia (`google-deepmind/concordia`)
- **Commit**: `9e4173f64a9f6c7990d2f5f52a11bc8e1f3aa61c`
- **Source File**: `concordia/components/game_master/event_resolution.py`
- **Symbol / Module**: Lines 158-185
- **Observed Behavior**: 通过 `memory.scan(selector_fn=lambda x: PUTATIVE_EVENT_TAG in x)` 在 Python 字符串列表中做 O(N) 遍历查找待处理事件，且源码注释自认依赖插入顺序。
- **Mirror Implication**: 缺乏索引与数据库支撑，在运行数千回合后会发生严重内存退化。证明了镜界采用 PostgreSQL 结构化索引的必要性。
- **Reuse Class**: DO NOT USE
- **Confidence**: HIGH

---

### FIND-OCW-001: 20Hz 服务端固定循环管线

- **Project**: OpenClaw World (`ChenKuanSun/openclaw-world`)
- **Commit**: `65a576ab27005ff3aa5f101a059786a338c40244`
- **Source File**: `server/game-loop.ts`
- **Symbol / Module**: `GameLoop.tick` (Lines 47-105)
- **Observed Behavior**: 固定 20Hz（每 50ms）通过 Node.js 定时器排干命令队列、更新状态、重建空间索引并向客户端分发 AOI 切片。
- **Mirror Implication**: 为镜界 M7 实时 3D 观察层提供了最简洁的服务器节奏参考基线。
- **Reuse Class**: PORT CANDIDATE (FOR REALTIME PROJECTION)
- **Confidence**: HIGH

---

### FIND-OCW-002: 网格化空间划分与半径检索 (Spatial Grid)

- **Project**: OpenClaw World (`ChenKuanSun/openclaw-world`)
- **Commit**: `65a576ab27005ff3aa5f101a059786a338c40244`
- **Source File**: `server/spatial-index.ts`
- **Symbol / Module**: `SpatialGrid.queryRadius` (Lines 30-46)
- **Observed Behavior**: 将 100×100 区域切分为 10×10 网格，基于计算包围盒格子快速检索半径内的所有 Agent ID。
- **Mirror Implication**: 该算法代码量仅 50 行，完全无外部依赖，极其适合在 M7 中作为轻量级 AOI 广播过滤器直接 Port。
- **Reuse Class**: PORT CANDIDATE
- **Confidence**: HIGH

---

### FIND-OCW-003: AOI 过滤的 WebSocket 广播优化

- **Project**: OpenClaw World (`ChenKuanSun/openclaw-world`)
- **Commit**: `65a576ab27005ff3aa5f101a059786a338c40244`
- **Source File**: `server/game-loop.ts`
- **Symbol / Module**: `sendTickEvents` (Lines 131-154)
- **Observed Behavior**: 服务端根据客户端视口计算 `nearbyAgents`，只有落在视野内的实体移动事件才通过网络下发，全局事件（如聊天/进出）则广播。
- **Mirror Implication**: 将客户端网络流量与前端渲染负载限制在常数级别，是支撑百人同屏的基础模式。
- **Reuse Class**: PORT CANDIDATE
- **Confidence**: HIGH

---

### FIND-OCW-004: 纯内存 WorldState 缺乏持久化与事务

- **Project**: OpenClaw World (`ChenKuanSun/openclaw-world`)
- **Commit**: `65a576ab27005ff3aa5f101a059786a338c40244`
- **Source File**: `server/world-state.ts`
- **Symbol / Module**: `WorldState` (Lines 7-30)
- **Observed Behavior**: 所有状态仅仅保存在 Node.js 原生 `Map` 中，事件历史为固定 200 条的环形数组，没有任何数据库持久化或异常回滚保障。
- **Mirror Implication**: 证实了实时小项目无法直接作为持续社会的底座。镜界必须由 PostgreSQL 作为持久主权，实时层只能做只读投影（Read-only Projection）。
- **Reuse Class**: DO NOT USE (FOR KERNEL AUTHORITY)
- **Confidence**: HIGH

---

### FIND-OCW-005: 基于内存 TTL 的脆弱幂等存储

- **Project**: OpenClaw World (`Two-Weeks-Team/openClawWorld`)
- **Commit**: `4f17dd5f24367dfcf0f57838f9cec9cfc64f8210`
- **Source File**: `packages/server/src/aic/idempotency.ts`
- **Symbol / Module**: `IdempotencyStore` (Lines 24-80)
- **Observed Behavior**: 幂等键与请求结果缓存在单机内存 Map 中，依靠 600 秒 TTL 定时清除。若服务重启或多实例部署，幂等保证彻底失效。
- **Mirror Implication**: 对比印证了镜界 M2-T03 坚持采用 PostgreSQL 唯一约束与持久 `action_requests` 表的正确性。
- **Reuse Class**: REFERENCE ONLY (DO NOT USE IN-MEMORY CACHE FOR FACTS)
- **Confidence**: HIGH

---

### FIND-OCW-006: 最小输入录制器与回放元数据格式

- **Project**: OpenClaw World (`Two-Weeks-Team/openClawWorld`)
- **Commit**: `4f17dd5f24367dfcf0f57838f9cec9cfc64f8210`
- **Source File**: `packages/server/src/replay/input-recorder.ts`
- **Symbol / Module**: `InputRecorder` (Lines 22-75)
- **Observed Behavior**: 结构化记录 `{ seed, startTime, endTime, tickRate, roomId }` 及逐个 Tick 的 `{ tick, clientId, type, payload, timestamp }`。
- **Mirror Implication**: 为镜界 M2-T05 的 Checkpoint 元数据结构和 Replay 测试用例设计提供了极其简洁的标准数据参考。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH

---

### FIND-OCC-001: 命令通道隔离与容量预算分配 (Command Lanes)

- **Project**: OpenClaw Core (`openclaw/openclaw`)
- **Commit**: 本地 v2026.9.2
- **Source File**: `src/process/lanes.ts` & `command-queue.types.ts`
- **Symbol / Module**: `CommandLane` & `CommandLaneSnapshot`
- **Observed Behavior**: 将命令划分为 `main`、`system-agent`、`cron`、`background`、`subagent` 等独立通道，配置每通道最大并发和全局组预算（`groupBudget`），防止后台次要任务饿死主干交互。
- **Mirror Implication**: 镜界未来面对玩家交互、系统自动调度与多 Agent 并发推理时，网关层应当采用通道划分与容量预算。
- **Reuse Class**: REFERENCE
- **Confidence**: HIGH
