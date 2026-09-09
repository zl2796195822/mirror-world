# RES-M7-002 First Street Integration & Projection Contract v1

- Task: RES-M7-002
- Title: 第一条街集成与世界投影合同研究
- Nature: RESEARCH ONLY — Architecture / Contract / Proposal
- Status: `READY_WITH_PENDING_CONTRACTS`
- Baseline: `b3229aef5b820fc261443c7f6d8a50f9c3b473c6` (`origin/main`)
- Branch: `research/m7-first-street-integration-projection-v1`
- Worktree: `/Users/alin/AI项目/mirror-world-m7-first-street-integration-research`
- Date: 2026-09-09
- FREEZE: ON

## Product North Star

镜界 = The Second Human World / A Persistent Parallel Human Civilization.

第一条街 + 30 固定居民，是验证第二人类世界最小闭环的受控样本。

本研究回答：

> 当第一条街真正接上 World Kernel 后，浏览器怎样看到一个活着的世界，同时确保浏览器、Realtime、3D、Avatar 永远不会成为第二套世界真相？

## Scope Discipline

### Forbidden

- 实现正式 M7
- 修改 `main` / `PROJECT_STATE` / `MEMORY`
- 正式 migration / formal production schema
- 建立第二套 World Truth
- 让 Realtime / Web3D / Avatar 拥有世界事实
- cherry-pick 到 main
- 把实验 FPS 写成正式 Gate
- 提前实现 M8 / M9 / PRE-AL-07

### Allowed

- 仅 `docs/research/RES-M7-002/`
- 研究性 diagram / schema proposal / example payload / contract draft
- PENDING CONTRACT / GAP / ADR CANDIDATE 记录

## Formal State at Baseline

| Milestone                  | Status                                                          |
| -------------------------- | --------------------------------------------------------------- |
| M0                         | PASS                                                            |
| M1                         | PASS                                                            |
| M2                         | PASS                                                            |
| M3                         | IN_PROGRESS                                                     |
| PRE-AL-00..06              | PASS                                                            |
| PRE-AL-07 Scheduler/Driver | PENDING (other session)                                         |
| M3-T04                     | BLOCKED_BY_PRE_ACTION_LOOP_GATE                                 |
| M7 formal                  | NOT STARTED                                                     |
| M8 / M9 research           | Parallel branches, not frozen into this doc as production truth |

## Document Index

| File                                     | Purpose                            |
| ---------------------------------------- | ---------------------------------- |
| `00_EXECUTIVE_SUMMARY.md`                | 收敛结论                           |
| `01_CURRENT_BASELINE.md`                 | CURRENT MAIN FACTS                 |
| `02_EXISTING_EXPERIMENT_EVIDENCE.md`     | EXPERIMENTALLY PROVEN / UNVERIFIED |
| `03_PROJECTION_ARCHITECTURE.md`          | Truth → User 单向投影栈            |
| `04_TRUTH_BOUNDARY.md`                   | 所有权与禁止回写                   |
| `05_RESIDENT_RUNTIME_PROJECTION.md`      | runtime → scene 合同               |
| `06_MOVE_PRESENTATION_SEMANTICS.md`      | MOVE 事实 vs 走路动画              |
| `07_SPATIAL_FACT_VS_VISUAL_TRANSFORM.md` | locationId vs x/y/z                |
| `08_WORLD_TIME_PRESENTATION.md`          | World Time → visual                |
| `09_EVENT_TO_VISUAL_PIPELINE.md`         | Event → 可见世界                   |
| `10_AOI.md`                              | Area of Interest                   |
| `11_SNAPSHOT_AFTERSEQ.md`                | 快照与增量恢复                     |
| `12_REALTIME_RECOVERY.md`                | Realtime 崩溃重建                  |
| `13_M8_PERSISTENCE_COMPATIBILITY.md`     | W0/W1/W2 与 catch-up               |
| `14_VISUAL_LOD.md`                       | Visual LOD 独立层                  |
| `15_AVATAR_CONTRACT.md`                  | Avatar 最小正式合同                |
| `16_ASSET_PIPELINE.md`                   | 第一条街资产管线                   |
| `17_FIRST_STREET_TOPOLOGY.md`            | 逻辑空间合同                       |
| `18_LOCATION_IDENTITY.md`                | Place/Asset/Geometry 版本          |
| `19_USER_INTERACTION_BOUNDARY.md`        | 观察 → Intent                      |
| `20_OPTIMISTIC_UI.md`                    | 乐观表现边界                       |
| `21_ANIMATION_SEMANTICS.md`              | 动画 ≠ 世界动作                    |
| `22_30_RESIDENT_RENDER_MODEL.md`         | 30 居民渲染模型                    |
| `23_PERFORMANCE_EVIDENCE_CONTRACT.md`    | 未来验证矩阵                       |
| `24_OFFLINE_RECONNECT_UX.md`             | 断线/离线返回                      |
| `25_EVENT_HISTORY_UX.md`                 | 历史只读证据 UX                    |
| `26_FUTURE_M4_M6_M9_CONTRACTS.md`        | 未来兼容合同                       |
| `27_FAILURE_MATRIX.md`                   | 失败矩阵                           |
| `28_SECURITY.md`                         | Client untrusted                   |
| `29_PROJECTION_REPLAY.md`                | 投影可删除重建                     |
| `30_MILESTONE_CONTRACT_MATRIX.md`        | M1–M12 合同矩阵                    |
| `31_FORMAL_M7_SCOPE_PROPOSAL.md`         | 正式 M7 v1 最小范围提案            |
| `32_GATE_PROPOSAL.md`                    | Hard Gate 提案                     |
| `33_RISK_REGISTER.md`                    | 风险登记                           |
| `34_PENDING_CONTRACTS.md`                | 待关闭合同                         |
| `35_PORT_PLAN.md`                        | 未来 port 计划                     |
| `36_SOURCES_AND_EVIDENCE.md`             | 来源与证据索引                     |

## Final Status Constraint

本研究最终状态只能是：

- `READY_WITH_RISKS`
- `READY_WITH_PENDING_CONTRACTS`
- `BLOCKED`

**不得** 宣布 `PASS` / `M7 COMPLETE` / `IMPLEMENTED`。

## FREEZE

`FREEZE = ON` after research completion.
