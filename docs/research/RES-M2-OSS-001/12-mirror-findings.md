# 12 - 镜界代码与架构审查缺陷清单 (Mirror Findings)

本文件严格按照工程治理要求，将通过本次开源源码对照研究反观镜界自身代码时发现的潜在隐患、架构缺口与演进风险进行分级归档。
**恪守最高限制：本任务不修改任何正式生产代码，所有发现仅作为后续里程碑的技术输入。**

---

## 缺陷分级汇总

- **P0 (阻断级，系统性致命缺陷)**: **0 项**
- **P1 (严重级，关键闭环或幂等缺失)**: **1 项**
- **P2 (中级，契约松散或追踪性不足)**: **3 项**
- **P3 (低级，文档一致性或轻量演进)**: **1 项**

---

## 缺陷明细与改进方案

### MIRROR-FIND-001: 幂等请求表缺少执行结果与关联事件指针

- **严重等级**: **P1**
- **发现来源**: 对照 OpenClaw World AIC (`IdempotencyStore`) 与 AI Town `inputs` 表执行结果写回机制。
- **镜界当前代码**: `packages/db/src/schema.ts` (`actionRequests` 表) 与 `packages/world-kernel/src/action-request-store.ts`。
- **现象与风险分析 (Why & Risk)**:
  - 当前 `persistValidatedActionRequest` 仅将校验通过的请求记录入库。
  - 当外部客户端因网络超时重试相同 `idempotencyKey` 时，内核返回 `{ status: 'duplicate', reasonCode: 'KERNEL_DUPLICATE_REQUEST' }`。
  - **严重缺陷**：调用方只知道“重复了”，但无法获知该请求此前究竟执行成功与否，也无法拿到此前生成的 `event_id` 或业务返回值（`ActionResult`）。这会导致客户端无法对齐状态，甚至误判交易失败。
- **推荐改进方案 (Recommended Action)**:
  - 在后续任务中，为 `action_requests` 增加 `status`（`PENDING` / `COMMITTED` / `REJECTED`）、`committed_event_id`、`committed_seq` 及可选的 `result_payload` 字段。
  - 当重试命中同一指纹时，直接返回历史执行结果，完成幂等语义的真正闭环。
- **处置时机 (When to address)**: **Before M3 (在构建 Action Execution 与 API 时解决)**。

---

### MIRROR-FIND-002: 事件账本缺少显式 `causation_id` 字段

- **严重等级**: **P2**
- **发现来源**: 对照 Event Sourcing 标准最佳实践与大型系统因果链追溯。
- **镜界当前代码**: `packages/db/src/schema.ts` (`worldEvents` 表) 与 `packages/world-kernel/src/world-events-store.ts`。
- **现象与风险分析 (Why & Risk)**:
  - 当前 `world_events` 仅有 `correlation_id: uuid`。
  - 对于单步动作，`correlation_id` 足够将事件与请求关联。
  - 但随着未来 M3/M6 出现级联事件（例如：工作轮班完成事件 `WORK_SHIFT_COMPLETED` 自动派生发薪事件 `WAGE_PAID`，进而自动派生扣税事件），所有衍生事件共享同一个 `correlation_id`，但无法辨别到底是谁触发了谁（无法构建因果 DAG 图）。
- **推荐改进方案 (Recommended Action)**:
  - 在后续数据库演进中，为 `world_events` 增加可选的 `causation_id: uuid`，记录触发本事件的前序事件 ID。
- **处置时机 (When to address)**: **Before M3 或 M6 (经济系统多步流转前)**。

---

### MIRROR-FIND-003: 领域事件 Payload 缺乏细粒度运行时类型约束

- **严重等级**: **P2**
- **发现来源**: 对照 `@mirror/contracts` 对 ActionRequest 的严格 Zod 校验。
- **镜界当前代码**: `packages/world-kernel/src/world-events-store.ts:67-80` (`assertPayload` 函数)。
- **现象与风险分析 (Why & Risk)**:
  - 当前代码仅断言了 `payload.schemaVersion >= 1` 且是 Object，但没有针对 14 种具体事件（如 `RESIDENT_MOVED` 必须包含 `fromLocationId/toLocationId`，`WAGE_PAID` 必须包含 `amountCents`）建立强类型 Zod 守门。
  - 若后续业务开发者传入格式不全的 Payload，依然能写入事件账本，但在未来执行 Replay 时会导致状态还原逻辑抛出 TypeError 异常。
- **推荐改进方案 (Recommended Action)**:
  - 在 `@mirror/contracts` 中建立各领域事件的结构化 Zod Payload Schema，并在 `appendWorldEvent` 入口处执行严格校验。
- **处置时机 (When to address)**: **Before M2-T05 (Replay/Checkpoint 验证前落地)**。

---

### MIRROR-FIND-004: 核心世界缺乏受控单例后台心跳循环

- **严重等级**: **P2**
- **发现来源**: 对照 OpenClaw World 20Hz `GameLoop` 与 AI Town 1Hz `runStep` 调度器。
- **镜界当前代码**: `packages/world-kernel/src/world-clock-store.ts` (`syncWorldClock` 方法)。
- **现象与风险分析 (Why & Risk)**:
  - 目前世界时钟的推进完全依赖被动调用（通过 API 或测试脚本传入 `now`）。
  - 当世界状态为 `RUNNING` 时，如果没有外部请求或定时器周期性触发，世界时钟在数据库中就会保持静止。
- **推荐改进方案 (Recommended Action)**:
  - 后续需要引入轻量级的单例守护进程或分布式调度器（基于 BullMQ / Redis Lease），以固定节奏（如 1Hz 或 10Hz）调用内核时钟推进，并派发世界心跳。
- **处置时机 (When to address)**: **Before M3 (Life Engine 模拟前)**。

---

### MIRROR-FIND-005: 文档库 Manifest 文件名与数量差异

- **严重等级**: **P3**
- **发现来源**: 历史遗留已知问题核查。
- **镜界当前代码**: 文档库 `manifest_v1.2.json` 声明 32 个文件，实际目录有 33 个文件。
- **现象与风险分析**: 纯文档与资产清单标记差异，不影响任何生产构建或单元测试。
- **处置时机 (When to address)**: **Future only**。
