# RES-M4-002: M4 记忆与关系系统和当前正式世界架构兼容性复审

## 1. 任务元数据

- **任务编号**: RES-M4-002
- **任务名称**: Memory & Relationship Compatibility Review
- **任务类型**: `RESEARCH ONLY` / `ARCHITECTURE COMPATIBILITY REVIEW`
- **绝对禁止**: 实现正式 M4、修改 main、修改 `PROJECT_STATE.md` / `MEMORY.md`、新增 production dependency、写 migration
- **Baseline main SHA**: `1359cd91317352ac8268cd7220a3abc9aa8e832f`（`git fetch origin` 后 `git rev-parse origin/main`）
- **Isolation branch**: `research/m4-memory-relationship-compatibility-v2`
- **Worktree**: `/Users/alin/AI项目/mirror-world-m4-compat-res-m4-002`
- **输入研究**: RES-M4-001（`research/m4-memory-relationship-v1`，worktree `/Users/alin/AI项目/mirror-world-m4-research`）
- **最终状态**: 见 `DECISION.md` / `RESULT.md`

## 2. 为什么做这次复审

RES-M4-001 完成时，正式主线尚停在 M2 已过、M3 未开工。其后 main 已真实落地：

- `KernelActionOutcome`（COMMITTED / REJECTED / CONFLICT，0/1/N event association）
- `WorldObservationSnapshot` / `ObservationQueryPort`（Decision Observation，`m3-observation-v1`）
- `ResidentActorResolver` / `ResourceReadPort` / `ActorRef`
- `resident_runtime_states`（current location / activity / stateVersion / sourceWorldSeq）
- MOVE / SLEEP 两阶段 Kernel lifecycle（`m3-action-semantics-v1`）

这些实现改变了 M4 的输入事实与约束。本任务以 **production reality 覆盖旧 research assumption**，回答：未来正式 M4 开工时，RES-M4-001 哪些 **KEEP / ADAPT / REJECT / DEFER**。

## 3. 当前正式里程碑事实（baseline 时点）

| 项                 | 状态                                  |
| ------------------ | ------------------------------------- |
| M0 / M1 / M2       | PASS                                  |
| M3                 | IN_PROGRESS                           |
| M3-T01 / T02 / T03 | PASS                                  |
| M3-T04             | BLOCKED_BY_PRE_ACTION_LOOP_GATE       |
| PRE-AL-00～05      | PASS                                  |
| PRE-AL-06          | **PENDING_PRE_AL_06**（本研究不等待） |

## 4. 文档索引

| 文件                                                                                 | 内容                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------- |
| `CURRENT-MAIN-AUDIT.md`                                                              | 当前 main 生产事实审计                        |
| `RES-M4-001-COMPATIBILITY-MATRIX.md`                                                 | KEEP / ADAPT / REJECT / DEFER 矩阵            |
| `DECISION-OBSERVATION-VS-PERCEPTION.md`                                              | Decision Observation ≠ Perception Observation |
| `EVENT-TO-PERCEPTION.md`                                                             | 正式感知链建议                                |
| `EVENT-PERCEPTION-ELIGIBILITY.md`                                                    | 事件可感知资格矩阵                            |
| `MEMORY-TAXONOMY-V2.md`                                                              | M4 v1 记忆类型裁决                            |
| `EPISODIC-MEMORY.md` / `SEMANTIC-MEMORY.md` / `MEMORY-LINEAGE.md`                    | 记忆结构与溯源                                |
| `MEMORY-REPLAY.md` / `OBSERVATION-PERSISTENCE.md`                                    | 重放与观测持久化                              |
| `RETENTION-FORGETTING.md` / `RETRIEVAL.md` / `PGVECTOR-BOUNDARY.md`                  | 遗忘/检索/向量边界                            |
| `RELATIONSHIP-MODEL-V2.md` / `RELATIONSHIP-PROJECTION.md` / `RELATIONSHIP-REPLAY.md` | 关系模型                                      |
| `SOCIAL-NEED-BOUNDARY.md`                                                            | SocialPressure ≠ Relationship                 |
| `EVENT-REQUIREMENTS.md` / `CAUSATION-M4-DECISION.md` / `TYPED-EVENT-MATRIX.md`       | 事件侧缺口                                    |
| `MEMORY-STORAGE-STRATEGY.md` / `RELATIONSHIP-STORAGE-STRATEGY.md`                    | 存储策略研究                                  |
| `CONCURRENCY-IDEMPOTENCY.md` / `ZERO-LLM-BASELINE.md`                                | 并发与零 LLM                                  |
| `M4-GATE-PROPOSAL.md` / `M4-FORMAL-SCOPE.md` / `PREREQUISITES.md`                    | 门禁/范围/前置                                |
| `M4-TO-M5-CONTRACT.md` / `M4-TO-M6-CONTRACT.md`                                      | 与 M5/M6 边界                                 |
| `PORT-PLAN.md` / `RISKS.md` / `RESULT.md` / `DECISION.md`                            | 移植计划/风险/结论                            |

## 5. 铁律（复审中继续坚持）

```text
World Event ≠ Observation ≠ Memory
World Fact ≠ Resident Belief
WorldObservationSnapshot ≠ M4 PerceptionObservation
No Global Event Broadcast
LLM Zero Fact Authority
Memory / Relationship 不得反向覆写 World Kernel Truth
```

## 6. FREEZE

本任务完成后 `FREEZE = ON`。不进入 M4-T01、不写 migration、不实现 Memory/Relationship runtime。等待 `M3 = PASS` 后，对当时最新 main 做一次短 **M4 Formal Readiness Review**，再 ADR → Formal M4 Task → TDD → Migration。
