# CURRENT-MAIN-AUDIT

Baseline: `1359cd91317352ac8268cd7220a3abc9aa8e832f`（origin/main）

本文件只记录 **代码/报告中真实存在** 的事实。缺失项显式标记 `UNAVAILABLE`。

## 1. World Event / Event Ledger

**事实**（`packages/db/src/schema.ts` `worldEvents`，`packages/world-kernel/src/world-events-store.ts`）：

| 字段             | 现状                                                              |
| ---------------- | ----------------------------------------------------------------- |
| `id`             | UUID PK，world-scoped unique `(id, worldId)`                      |
| `worldId`        | 有                                                                |
| `seq`            | world-local `world_seq`，unique `(worldId, seq)`                  |
| `type`           | text；union 见 `WORLD_EVENT_TYPES`                                |
| `actorId`        | nullable UUID                                                     |
| `targetId`       | nullable UUID                                                     |
| `payload`        | jsonb，必须含 `schemaVersion >= 1`                                |
| `occurredAt`     | world time                                                        |
| `correlationId`  | UUID **not null**（当前等于 ActionRequest id 或等价 correlation） |
| `location_id` 列 | **UNAVAILABLE**（表级无；MOVE/SLEEP location 仅在 payload）       |
| `causation_id`   | **UNAVAILABLE**                                                   |
| append-only      | 通过 DB triggers / 设计约定保持；无业务 UPDATE 路径               |

**已注册 event types**（`WORLD_EVENT_TYPES`）：

- 已真正写入：`WORLD_TIME_ADVANCED`、`RESIDENT_MOVE_STARTED`、`RESIDENT_MOVE_COMPLETED`、`RESIDENT_SLEEP_STARTED`、`RESIDENT_SLEEP_COMPLETED`
- 仅预留未实现：`RESIDENT_MOVED`、`NEED_CHANGED`、`WORK_SHIFT_COMPLETED`、`WAGE_PAID`、`RENT_PAID`、`PURCHASE_COMPLETED`、`CONVERSATION_COMPLETED`、`RELATIONSHIP_CHANGED`、`MEMORY_CREATED`、`GOAL_CHANGED`、`EMPLOYMENT_CHANGED`、`PROXY_ACTION_DECIDED`、`WORLD_DIGEST_CREATED`

> **M4 含义**：类型名预留 ≠ 已实现权威事实。`RELATIONSHIP_CHANGED` / `MEMORY_CREATED` 不得默认当作已存在的正式世界事实通道。

## 2. ActionRequest / KernelActionOutcome

- `action_requests`：world-scoped idempotency、fingerprint、payload、`requestedBy ∈ {HUMAN,RULE,AI,PROXY}`、action types 含六类。
- `kernel_action_outcomes`：durable status 仅 `COMMITTED | REJECTED | CONFLICT`；reason codes 固定枚举；COMMITTED 必须 `eventCount > 0` 且有 `worldSeqStart/End`。
- `kernel_action_outcome_events`：有序 `0/1/N` association；同一 event 只挂一个 outcome。
- **DUPLICATE / TIMED_OUT** 不是 durable Kernel outcome status。

## 3. World Clock / Replay / Checkpoint

- World Time 由 Kernel store 推进；`PAUSED/MAINTENANCE` 不推进；生产 1x。
- Replay：按 `world_events` 有序重放 + checkpoint suffix；canonical hash。
- Checkpoint 是可删除重建的加速数据；**Event Ledger 是 durable truth**。
- 当前 replay 对 MOVE/SLEEP lifecycle payload 做 schema validation；**完整 resident cognitive projection replay 未实现**。

## 4. Decision Observation（PRE-AL-02）

`WorldObservationSnapshot`（`m3-observation-v1`）是 **Life Engine 当前决策用只读快照**：

- 携带 `worldId / subjectResidentId / worldTime / worldStatus / sourceWorldSeq / seed`
- `self`：NATIVE identity、profile、employment
- capability：`actorRef`、`location`、`activity`、`workObligation`、`resources` 多为 AVAILABLE；`localContext` 仍为 UNAVAILABLE
- 只读、world-scoped、resident-scoped；不直接依赖 Event Ledger 全量流

**明确**：这是 Decision Observation / Query Read Model，**不是** M4 Perception Observation。

## 5. Runtime State Authority（PRE-AL-04/05）

`resident_runtime_states`：

- PK `(worldId, residentId)`
- `currentLocationId`、`currentActivity ∈ {IDLE, TRAVELING, SLEEPING}`
- activity metadata：instanceId、targetLocation、started/due world time
- `stateVersion`、`sourceWorldSeq`、`runtimePolicyVersion = m3-runtime-state-v1`
- bootstrap 幂等；location 初始来自 home fixture

Location authority 已具备 **semantic location**，足以做 M4 v1 场所级感知过滤。

## 6. ActorRef / Resource

- `Resident → ActorRef` 正式映射已存在（PRE-AL-03）
- `ResidentResourceSnapshot` 只读（cash/food 等 fixture）
- Resident / Auth / Digital Identity 概念分离；Memory ownership 必须挂 **Resident**，不得挂 Auth user

## 7. Life Engine Needs / Goals

- CORE Needs：`hungerPressure`、`restPressure`、`socialPressure`（`m3-needs-v1`）
- SocialPressure 是 Need，**不是** Relationship state
- Goals：`SATISFY_HUNGER`、`REST`、`FULFILL_WORK_OBLIGATION`、`MAKE_SOCIAL_CONTACT`、`RETURN_HOME`（`m3-goals-v1`）
- Life Engine 只读 Observation；无 Memory/Relationship 写入口

## 8. MOVE / SLEEP Semantics（PRE-AL-05）

- MOVE payload：`{ destinationId }`；SLEEP payload：`{}`
- 生命周期：`STARTED → COMPLETED`；completion 是显式 Kernel command
- MOVE 完成才切 location；SLEEP 仅 HOME，固定 480 World Minutes
- 事件 payload 含：`schemaVersion`、`phase`、`actionRequestId`、`activityInstanceId`、`sourceLocationId`、可选 `destinationId`、world times、`policyVersion = m3-action-semantics-v1`
- 无 EAT/WORK/TALK/BUY executor

## 9. 当前对 M4 的架构含义

| 已具备                                     | 仍缺失                          |
| ------------------------------------------ | ------------------------------- |
| append-only Event Ledger + world_seq       | 事件表级 location/causation 列  |
| ActionRequest ↔ Outcome ↔ ordered events | 社交/经济事件类型与 executor    |
| semantic location authority                | Perception Observation contract |
| Decision Observation boundary              | Attention/Encoding/Memory store |
| ActorRef / Resource read bridge            | Relationship projection         |
| 30 NATIVE resident deterministic seed      | Memory/Relationship replay      |
| MOVE/SLEEP 可感知候选事件                  | TALK 等互动语义                 |

## 10. 与 RES-M4-001 假设的最大差距

1. RES-M4-001 假设可直接做视觉/听觉物理路由；**当前只有 semantic location**，且 M4 v1 不应依赖 3D raycast。
2. RES-M4-001 把 `RELATIONSHIP_CHANGED` / `MEMORY_CREATED` 写成 World Event；**当前类型仅预留**，且架构上它们更像 cognitive/derived，不应无审查地升格为 Kernel 权威事实。
3. RES-M4-001 的 ObservationEnvelope 未与现有 `WorldObservationSnapshot` 分层命名；正式 M4 必须拆成 Decision Observation 与 Perception Observation 两套契约。
4. World Event 表级缺 location/causation 会使“谁在哪里对谁做了什么”只能依赖 payload 约定，构成 **P1 architecture risk**（见 `EVENT-REQUIREMENTS.md`）。
