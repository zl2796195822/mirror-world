# 05 - OpenClaw World 实时体系深度源码剖析 (OpenClaw World Analysis)

- **研究对象**:
  - `ChenKuanSun/openclaw-world` (Commit `65a576ab27005ff3aa5f101a059786a338c40244`)
  - `Two-Weeks-Team/openClawWorld` (Commit `4f17dd5f24367dfcf0f57838f9cec9cfc64f8210`)
  - `openclaw/openclaw` 核心运行时 (v2026.9.2 本地参考)
- **许可证**: 全部为 MIT
- **核心文件证据**:
  - `openclaw-world-chenkuansun/server/command-queue.ts`
  - `openclaw-world-chenkuansun/server/game-loop.ts`
  - `openclaw-world-chenkuansun/server/spatial-index.ts`
  - `openclaw-world-chenkuansun/server/world-state.ts`
  - `openclaw-world-chenkuansun/server/client-manager.ts`
  - `openClawWorld-two-weeks/packages/server/src/aic/idempotency.ts`
  - `openClawWorld-two-weeks/packages/server/src/replay/input-recorder.ts`
  - `openclaw-main/src/process/command-queue.ts` & `lanes.ts`

---

## 核心技术问题深度解答 (14项专题)

### 1. Tick 如何驱动世界？

- **代码事实**:
  - 在 `ChenKuanSun/openclaw-world`（`server/game-loop.ts:9-45`）中：
    - 服务端固定以 **20Hz（`TICK_RATE = 20`，每 50ms 一次）** 运行 Node.js 定时器 `setInterval(() => this.tick(), 50)`。
    - 每次 Tick 递增 `tickCount++`，按序执行 5 个流水线步骤：
      1. 从 `commandQueue` 队列排干待处理命令（`drain()`）；
      2. 将命令顺序应用到内存中的 `worldState`，产出当前 Tick 的事件列表 `tickEvents`；
      3. 基于当前所有实体的最新坐标全量重建空间索引（`spatialGrid.rebuild(...)`）；
      4. 刷新客户端视口坐标（关注跟随的 Agent）；
      5. 遍历客户端，结合 AOI 空间半径过滤，通过 WebSocket 下发 Tick 事件切片或定期全局快照（每 5 秒一次全量同步）。

### 2. Command Queue 如何消费？

- **代码事实**:
  - `command-queue.ts:17-75` 实现了一个内部数组队列 `private pending: WorldMessage[] = []`。
  - 外部 Agent 或网络消息通过 `enqueue(msg)` 进入队列（在入队时同步执行基础限流与物理边界/碰撞初筛）。
  - Game Loop 在每个 Tick 开始时执行原子排干：
    ```typescript
    drain(): WorldMessage[] {
      const cmds = this.pending;
      this.pending = [];
      return cmds;
    }
    ```
  - 取出的命令在单线程 Tick 内被同步、依次遍历消费。

### 3. 一个 command 的生命周期是什么？

- **时序生命周期**:
  1. **生成（Generation）**：Agent 进程或前端客户端发出 JSON 消息（如 `PositionMessage`、`ActionMessage`）。
  2. **入队检验（Ingress Validation）**：`enqueue()` 检查每秒频率限制（20 次/秒）、世界外边界（`WORLD_HALF = 50`）、静态障碍物碰撞（`Obstacle` 半径）及文本长度。非法直接抛弃并返回拒绝理由。
  3. **暂存（Pending Buffer）**：保存在 `pending` 数组中等待下一个 50ms 周期。
  4. **主循环消费（Settlement / Apply）**：在下一个 Tick 中被 `drain()` 取出，执行 `worldState.apply(cmd)` 改变内存中的坐标或状态映射。
  5. **广播分发（Broadcast）**：加入 `tickEvents`，由 `GameLoop` 根据客户端 AOI 判定是否广播给各 WebSocket 连接；可选异步推送到 Nostr 中继。
  6. **销毁（Eviction）**：命令对象本身不进入持久数据库，仅在 `WorldState` 的 200 条环形缓冲区（`eventBuf`）中被后序事件循环覆盖。

### 4. command 是否具有：id / ordering / status / result？

- **代码事实**:
  - **ID**: `ChenKuanSun` 实现中**完全没有 Command ID**（仅有 `agentId` 和 `timestamp`）。
  - **Ordering**: 仅依赖单进程内存数组 `pending` 的 FIFO 入队先后顺序；无全局序列号。
  - **Status**: 无状态跟踪机制（无 PENDING / APPLIED / FAILED 状态机）。
  - **Result**: `enqueue` 只返回 `{ ok: boolean, reason?: string }`；一旦进入队列，处理过程无任何执行结果（ActionResult）回调给发送者。
  - _注_: `Two-Weeks-Team` 在 AIC 协议层引入了 `txId`（见下题）。

### 5. 重复 command 如何处理？

- **代码事实**:
  - 在 `ChenKuanSun` 实现中，**对重复命令完全无感知**。若 Agent 连续发送两次相同的坐标移动，只要未触发 20 次/秒速率限制，两次命令都会被送入循环执行，后一次静默覆盖前一次。

### 6. 是否有 idempotency？

- **对照分析**:
  - `ChenKuanSun` 版本：**无幂等机制**。
  - `Two-Weeks-Team/openClawWorld`（`packages/server/src/aic/idempotency.ts:24-80`）：
    - 实现了内存级 `IdempotencyStore<T>`。
    - 组合 Key 为 `${agentId}:${roomId}:${txId}`。
    - 对 Payload 做 `JSON.stringify` 哈希对比。
    - 若 Key 相同且 Hash 相同，返回状态 `'replay'` 并直接返回内存缓存的 Result；若 Hash 不同返回 `'conflict'`。
    - 设置 600 秒 TTL，定时每分钟扫描删除过期键。
    - **重大缺陷**：完全基于 Node.js 内存 Map，服务重启全部丢失，多实例无法共享。

### 7. 多个 agent 是否并发？

- **代码事实**:
  - 外部 Agent 往往作为独立的子进程或网络客户端并发运行、并发通过 HTTP/WebSocket 提交命令。
  - 但在**核心世界消费侧**，所有命令被集中汇入主线程的单队列中，**在主游戏循环内部完全是单线程串行处理**。

### 8. 如何防止并发修改同一状态？

- **代码事实**:
  - 依赖 Node.js 单线程事件循环的天然特性（Single-threaded Tick）。所有的状态读写集中在 `GameLoop.tick` 同步代码块内完成，不存在多线程内存竞态，因此无需对内存变量加锁。

### 9. Spatial Grid 如何组织位置数据？

- **代码事实**:
  - `openclaw-world-chenkuansun/server/spatial-index.ts:7-52`:
    - 将 100×100 的二维平面切分成网格（Cell），每个 Cell 边长 10 单位（默认 10×10 共 100 个格子）。
    - 索引存储为哈希表：`Map<string, Set<string>>`，键为 `"${cx},${cz}"`，值为位于该格子内的 `agentId` 集合。
    - **极简重建策略**：每个 Tick（每 50ms）先执行 `this.cells.clear()`，然后线性遍历当前在线 Agent 坐标并重新分配到网格中。这种策略在小规模（< 100 实体）下速度极快，无需复杂的动态增量树维护。

### 10. AOI 如何减少计算与网络广播？

- **代码事实**:
  - `SpatialGrid.queryRadius(x, z, radius)`（`spatial-index.ts:30-46`）：
    - 根据客户端视口或跟随实体的坐标，计算其视锥覆盖的网格包围盒 `[minCx..maxCx, minCz..maxCz]`。
    - 仅取出落在这些格子中的 Agent 集合。
  - 在 `GameLoop.sendTickEvents` 中：
    - 判定事件发生地的 Agent 是否在客户端关心的集合中。如果在，才向该 WebSocket 发送 JSON；如果不在，直接在服务端剔除。
    - **效果**：将广播带宽与序列化开销从 $O(N^2)$ 降低到接近 $O(N 	imes k)$（$k$ 为局部视野内的实体数）。

### 11. 哪些属于 durable state，哪些属于 runtime state？

- **架构划分**:
  - **Durable State（持久事实）**：在 OpenClaw World 这种轻量实现中，**几乎为零**；仅将身份 Profile 登记在内存，或靠外部 Nostr 协议去中心化广播。
  - **Runtime State（运行时状态）**：实时坐标 `positions`、动作标记 `actions`、当前视口 `client.viewX/viewZ`、网格空间索引 `spatialGrid`、200 条环形事件缓冲 `eventBuf`。全部为临时内存态。

### 12. session / runtime 模型是否适合未来镜界 AI Agent Runtime？

- **评估结论**:
  - OpenClaw 核心（`openclaw-main`）的 **Per-session Serialized Run + Command Lanes** 机制极其优秀，非常适合作为镜界未来 M5 的外部 Agent 接入层设计原型。
  - 但**绝对不应让世界中 1000 个普通居民都跑一个完整的 OpenClaw 守护进程**（见后文专题分析）。

### 13. 哪些结构可以未来用于 M3/M7 scaling？

- **值得复用候选**:
  1. **M7 Web 3D 表现层**: `SpatialGrid` 10×10 网格与 AOI 视口广播逻辑（极小、无依赖、效率高）。
  2. **M3/M7 客户端插值与 20Hz 同步节奏**: 服务端固定 20Hz 广播位置增量，客户端执行缓冲与平滑插值。
  3. **M5 Agent 命令网关**: OpenClaw 核心的多通道排队（`CommandLane`：main, background, subagent）。

### 14. 哪些设计不能进入 World Kernel authority？

- **严禁进入内核的设计**:
  1. **纯内存无事务状态表（In-memory Map as World State）**：绝不能成为镜界持久事实源。
  2. **内存 TTL 幂等表**：镜界必须使用 PostgreSQL 唯一约束与持久 `action_requests`。
  3. **环形内存事件缓冲（Circular Buffer）**：镜界必须使用持久追加的 `world_events` 表。
  4. **未持久化的 Command Queue**：镜界的 ActionRequest 是具有持久审计痕迹的实体，不能随服务崩溃而丢弃。

---

## 特别专题评价：为什么不能让每一个居民运行完整 OpenClaw？

若将 OpenClaw 完整 Agent Runtime（包含多 channel 协议栈、session-reaper、cron-manager、插件加载器、完整 Node 进程/容器）为每个镜界居民启动一个实例：

| 评价维度             | 完整 OpenClaw 单人单跑方案                                                                  | 镜界轻量化社会运行方案 (推荐)                                                       | 评价结论                            |
| -------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| **硬件与内存成本**   | 每个 OpenClaw 进程占用 150MB~300MB 内存。1,000 居民需 300GB 内存；10,000 居民需数 TB 内存。 | 居民状态在 PostgreSQL 仅数十 KB；内存中以轻量状态机驻留，仅在思考时申请临时工作池。 | **成本不可承受 (CRITICAL FAILURE)** |
| **并发与调度**       | 1000 个独立异步事件循环争抢 CPU 调度与网络连接，线程上下文切换导致系统瘫痪。                | 集中式调度器（如 BullMQ / Worker Pool），按优先级调度高价值 Agent。                 | **调度雪崩**                        |
| **确定性与重放**     | 每个进程独立使用系统时间与随机数，完全丧失确定性时序。                                      | 统一由 World Clock 与注入 Seed 驱动，输出确定性意图。                               | **破坏 Replay 根基**                |
| **稳定性与故障恢复** | 进程崩溃、端口耗尽、文件描述符耗尽不可避免。                                                | 无状态 Agent 决策器，依靠数据库状态随时拉起。                                       | **单点故障多、无法自愈**            |
