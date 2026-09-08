# RES M3 002 研究导读

## 结论先行

本审查以 `origin/main` 的 `6d123bc9eb797a15a6d382d0f1e91c5c747a70aa` 为最终 M2 基线，并以实际 TypeScript、migration、PostgreSQL integration test、M2 报告和 ADR 为准。

结论是：M2 的 World Clock、Action Contract、纯 snapshot validator、请求幂等、append-only Event Ledger、world-local `world_seq`、full replay、checkpoint suffix replay、稳定摘要 hash 和 world isolation 已有实现与验证证据；但 M2 仍不是可执行动作闭环。当前 `accepted` 只表示 ActionRequest metadata 已写入 `action_requests`，不表示动作已执行、事实已提交或事件已产生。

因此本任务判定：`READY_FOR_M3_T01`。这里的 T01 仅限正式任务定义的固定 seed fixture generator，不提交 ActionRequest、不读取正式居民表、不创建 migration。`ActionResult`、最小 Observation Snapshot、Actor/Resident 关联、MOVE 完成语义和 scheduler 必须在真实 Life Engine Action Loop 或 M3 Gate 前按本文矩阵关闭；本任务不实施任何修复，也不执行 M3-T01。

## 范围与禁止事项

- 研究编号：`RES-M3-002`。
- 类型：research / gate only。
- 读取：最终 M2 代码、M2-T01～T05 报告、M2 ADR、RES-M3-001、RES-M2-OSS-001、正式 M3 文档库。
- 写入：仅本目录。
- 未修改：`apps/`、`packages/`、`migrations/`、`PROJECT_STATE.md`、`MEMORY.md`、main 和两个历史研究分支。
- 未执行：Pre-M3 fix、M3-T01、M3-T02+、Life/Resident 正式实现、数据库 migration、Memory、Relationship、Economy、AI、3D。

## 证据等级

| 标记            | 含义                                                       |
| --------------- | ---------------------------------------------------------- |
| `IMPLEMENTED`   | 当前代码存在，并有对应测试或验证报告证据                   |
| `PARTIAL`       | 有底层能力或研究形状，但缺少完整业务/持久化/执行闭环       |
| `NOT AVAILABLE` | 当前代码、schema 和报告均未提供                            |
| `UNVERIFIED`    | 历史报告有证据，但本任务未重新执行该边界；不升级为当前实测 |

## 来源锁定

### Git 基线

- 最终基线：`origin/main` → `6d123bc9eb797a15a6d382d0f1e91c5c747a70aa`。
- RES-M3-001：`research/m3-life-engine-v1` → `7cc36a3f3e0afc013f997acdc051f272401746a5`。
- RES-M2-OSS-001：`research/m2-oss-world-kernel` → `f6c3fd4576827584a18a08df4e96a5925924a8fb`。

### 正式规格

- `文档/镜界_完整开发文档库_v1.2/00_顶层与索引/镜界_Codex里程碑任务书_v1.0.docx`
- `文档/镜界_完整开发文档库_v1.2/07_实施与Codex/镜界_M0-M13实施规格与依赖矩阵_v1.0.docx`
- `文档/镜界_完整开发文档库_v1.2/03_数字生命与AI/镜界_LifeEngine详细规格_v1.0.docx`
- `文档/镜界_完整开发文档库_v1.2/02_核心世界/镜界_WorldKernel详细规格_v1.0.docx`
- `文档/镜界_完整开发文档库_v1.2/02_核心世界/镜界_时间模拟事件与重放规格_v1.0.docx`
- `文档/镜界_完整开发文档库_v1.2/05_3D与数据接口/镜界_数据库设计与数据字典_v1.0.docx`

## 研究文件导航

| 文件                                     | 用途                                      |
| ---------------------------------------- | ----------------------------------------- |
| `01-final-m2-capability-matrix.md`       | 最终 M2 逐项能力矩阵                      |
| `02-res-m3-001-assumption-review.md`     | 旧研究假设逐项复核                        |
| `03-action-result-gap.md`                | ActionResult/feedback gap 与 blocker 结论 |
| `04-observation-snapshot-contract.md`    | M3 最小只读观察边界                       |
| `05-resident-actor-mapping.md`           | Resident、Actor、Identity 映射            |
| `06-resident-state-authority-review.md`  | 最小 Resident state 权威归属              |
| `07-needs-spec-conflict.md`              | Needs 4/6/7 来源冲突                      |
| `08-move-travel-semantics.md`            | MOVE 与 travel 方案审查                   |
| `09-hybrid-simulation-compatibility.md`  | Hybrid scheduler 与规模边界               |
| `10-30x30-final-test-matrix.md`          | 30×30 与 M2/M3/M4/M6 的边界               |
| `11-m3-v1-invariants-final.md`           | M3 v1 MUST/SHOULD/DEFER invariants        |
| `12-life-engine-event-replay-mapping.md` | Event、Trace、Ephemeral 边界              |
| `13-determinism-contract.md`             | Life Engine 确定性契约                    |
| `14-m3-minimal-port-contracts.md`        | 最小端口草案，不是生产代码                |
| `15-pre-m3-blocking-matrix.md`           | Pre-M3 blocker 处理时点                   |
| `RESULT.md`                              | 综合研究结果                              |
| `DECISION.md`                            | Gate 决策                                 |
