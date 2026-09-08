# DECISION - RES-M2-OSS-001 最终战略决策建议书

- **任务编号**: RES-M2-OSS-001
- **任务结论**: **PROCEED (建议当前路线继续推进)**
- **决策基准 Commit**: `b96c04982486f34aeedb07eb2c4265c4ff024076` (M2-T04 Gate 通过状态)
- **审查日期**: 2026-09-08

---

## 核心决策问题逐项回答 (14项硬性答卷)

### 1. 镜界当前 World Kernel 根原则是否正确？

**回答**: **YES (完全正确)**。

- 外部源码实践证明：由 **PostgreSQL 作为持久事实源**、由 **World Kernel 作为唯一确定性写入口**、**LLM 零事实裁决权**、**ActionRequest != Event** 以及 **单世界单调递增序号与数据库防跳序触发器** 构筑的防线，是避免系统沦为玩具 Demo 的核心基石。

### 2. M2 Gate 前是否存在必须修复项？

**回答**: **不存在 (0 项)**。

- 当前仓库在 M2-T04 阶段产出的代码完全通过了全仓质量门禁、双次干净 DB Setup、真实 PostgreSQL 事务与回滚断言以及 GitHub Actions 远程 CI。没有发现任何导致死锁、数据损坏或阻塞 M2 Gate 的缺陷。

### 3. Event Ledger 是否足以进入 Replay / Checkpoint 阶段？

**回答**: **足以进入 (YES)**。

- 当前 `world_events` 表具备世界隔离、严格连续单调自增 `seq`、强类型常量表、JSONB Payload（含 `schemaVersion`）、世界逻辑时间戳 `occurred_at` 与关联跟踪 ID。结合 `worlds.seed`，已完整具备事件溯源与状态机重放的数学充要条件。

### 4. 当前 ActionRequest / Idempotency 模型是否合理？

**回答**: **基础架构完全合理，后续需增强结果回填**。

- 基于 `(world_id, idempotency_key)` 唯一约束与规范化 SHA-256 指纹匹配的幂等判定安全可靠。
- 唯一待增强点在于：未来进入 M3 构建完整动作闭环时，建议在持久表中回填 `committed_event_id` 或执行状态，使重试客户端能直接取回历史执行结果。

### 5. 哪些 AI Town 模式值得采用？

**回答**:

1. **异步操作挂起与完成闭环机制** (`Agent.startOperation` -> `inProgressOperation` -> 异步调用 -> `sendInput` 闭环收敛)。
2. **Step / Tick 双层时间模型**（低频事务步内推进高频连续平滑步）。
3. **对话文本与核心物理状态解耦**（文本流式读写，世界内核只管资格与距离）。

### 6. 哪些 AI Town 模式不应该采用？

**回答**:

1. **每秒全量从数据库加载所有活跃世界对象并反序列化**（无法支撑千人扩展）。
2. **深度绑定 Convex 私有文档数据库**。
3. **散落于业务逻辑中的非受控 `Math.random()`**。

### 7. Concordia Game Master 哪些思想值得进入镜界？

**回答**:

1. **Putative Event 假定事件模式**（实体仅能提出假定动作意图，必须经中介裁决才成为事实）。
2. **面向实体的差异化观察切片生成**（根据空间与感知能力定向过滤信息）。

### 8. 哪些部分因为 LLM authority 不适合镜界？

**回答**:

1. **利用大模型思维链判定事实合法性、物理碰撞与扣费**（存在严重的幻觉、提示词注入越狱风险）。
2. **生成式时钟 (Generative Clock)**（由 LLM 猜测时间推移破坏物理严谨性）。
3. **纯内存无索引字符串搜索**。

### 9. OpenClaw World 哪些 runtime / queue / spatial 思想值得保留？

**回答**:

1. **10×10 Spatial Grid 网格划分与半径查询算法**（轻量无依赖，M7 Web 3D 表现层 Port 候选）。
2. **AOI 视口半径裁剪广播**（将网络广播限制在常数级）。
3. **Command Queue Lanes 通道分组与容量预算**（防范后台次要任务饿死主干）。

### 10. 哪些实现不能进入 World Kernel？

**回答**:

1. **纯内存无事务的 WorldState 映射**（进程崩溃数据全丢）。
2. **内存 TTL 幂等缓存**（多实例无法共享且重启失效）。
3. **固定 200 条长度的内存环形历史缓冲区**。

### 11. 镜界未来 M3 最适合采用什么：Tick / Event / Hybrid？

**回答**: **Hybrid (分层混合驱动模型)**。

- 严禁对所有居民每秒全频轮询！
- **连续空间走低频 Tick**（10Hz~20Hz）；
- **离散事实（经济、社交、工作、睡眠）走 Event 驱动**；
- **生理需求衰减走“事件时钟锚点懒计算 (Lazy Decay via Event)”**。

### 12. 未来 Async AI Agents 应该如何与 deterministic Kernel 隔离？

**回答**:

- **解耦意图队列 + Fencing Token 栅栏租约模式**：
  - Agent 独立池异步读取只读观察切片；
  - 产出携带实体基准版本号的 `ActionIntent`；
  - 网关负责限流、指纹计算并持久化为 `ActionRequest`；
  - Kernel 在事务内按行锁顺序仲裁，若版本已跃迁（`expectedActorVersion !== actor.version`）则判为 `KERNEL_CONFLICT` 优雅丢弃；
  - Agent 思考期间绝不持有任何数据库连接与行锁。

### 13. M2 Gate 前 P0/P1/P2 数量

**回答**:

- **M2 Gate 前必须阻断修复的 P0 数量**: **0**
- **M2 Gate 前必须阻断修复的 P1 数量**: **0**
- **M2 Gate 前必须阻断修复的 P2 数量**: **0**
- _(全流程排查出 1 项 P1 与 3 项 P2，但处置时机均属于 Before M2-T05 或 Before M3，不阻断当前阶段)_。

### 14. 是否建议 M2 当前路线继续？

**回答**: **PROCEED (建议继续按原定路线推进)**。

- 镜界 World Kernel 地基坚实，无需推倒，无需在 Gate 前非理性扰动代码。后续只需在 M2-T05（Checkpoint/Replay）与 M3（Life Engine）中从容落地本报告建议的增强项。
