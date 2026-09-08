# RESULT - RES-M2-OSS-001 开源源码对照研究综合成果报告

- **任务编号**: RES-M2-OSS-001
- **研究课题**: World Kernel / Event Ledger / Simulation 开源源码对照研究
- **任务类型**: RESEARCH ONLY
- **工作区 / 分支**: `mirror-world-m2-oss-research` (`research/m2-oss-world-kernel`)
- **审计基线**: Commit `b96c04982486f34aeedb07eb2c4265c4ff024076` (M2-T04 Gate 通过状态)
- **完成日期**: 2026-09-08

---

## 1. 核心研究发现总览

本次研究对业界主流多智能体模拟与空间系统（a16z AI Town、Google DeepMind Concordia、OpenClaw World 系列）进行了细致到代码行号与类模块的深度源码剖析，得出五大核心支柱结论：

### 结论一：镜界的底层原则经受住了外部源码检验，无需推倒重来

- **World Kernel 唯一写入口 + PostgreSQL Durable Truth + ActionRequest != Event + LLM 零权威** 的根基架构完全正确。外部项目要么因放弃关系数据库而失去扩展性（AI Town），要么因放弃确定性规则而陷入 Prompt 幻觉（Concordia），要么因纯内存运行而缺乏持久化（OpenClaw World）。镜界的综合架构路线是目前唯一具备长期严密商业化运营潜力的设计。

### 结论二：AI Town 提供了极佳的“异步操作挂起闭环”范式

- AI Town 的 `Agent.startOperation -> inProgressOperation -> 异步 Action -> sendInput 闭环` 证明了：**LLM 推理可以完全与世界模拟循环在时间上解耦**。模拟时钟正常前行，智能体异步思考，完成后通过意图队列重新接入。镜界未来 M3/M5 应将此模式吸收为标准设计。

### 结论三：Concordia 验证了“意图-中介-事件”模式，但其“LLM 仲裁”是致命毒药

- Concordia 的 `putative_event`（假定动作）概念深刻阐明了 Agent 绝不能直接修改世界的哲学。然而，其利用大模型在思维链中判定物理后果与时钟的做法，彻底摧毁了工业系统的确定性与审计能力。镜界必须坚守“纯代码规则内核”。

### 结论四：OpenClaw World 为 M7 表现层提供了小巧成熟的“网格空间索引与 AOI 过滤”

- `ChenKuanSun/openclaw-world` 的 10×10 `SpatialGrid` 与半径查询算法（约 50 行无依赖代码）以及 AOI 视口裁剪广播，能直接解决上百实体在线时的网络带宽爆炸问题。

### 结论五：Event Ledger 表结构与事务保证已足够进入下一阶段

- 经逐字段深度核验，当前落地的 `world_events` 表结构（UUID, World-Local Seq, Type, Actor/Target, JSONB Payload, SchemaVersion, OccurredAt, CorrelationId）与数据库触发器防跳序/防修改机制，已完全具备事件溯源确定性重放所需的一切信息。M2-T04 无需任何回滚或破坏性改动。

---

## 2. 成果文档清单与索引

所有 17 份研究文档已全量产出并保存在 `docs/research/RES-M2-OSS-001/`：

1. `00-README.md` - 任务总览、最高边界、研究目标与导读指南
2. `01-current-mirror-architecture.md` - 镜界当前代码真实架构核验（准确界定已实现/未实现）
3. `02-source-register.md` - 开源项目资产登记与许可证审计
4. `03-ai-town-analysis.md` - a16z AI Town 深度源码剖析（17项专题解答）
5. `04-concordia-analysis.md` - Google DeepMind Concordia 深度源码剖析（13项专题解答）
6. `05-openclaw-world-analysis.md` - OpenClaw World 实时体系深度源码剖析（14项专题解答）
7. `06-comparison-matrix.md` - 30 维度全景技术对照矩阵
8. `07-concordia-game-master-mapping.md` - Concordia Game Master 与镜界 World Kernel 逐项深度对照
9. `08-async-agent-vs-deterministic-world.md` - 异步智能体与确定性内核解耦架构（3种方案对比与推荐蓝图）
10. `09-tick-event-model.md` - 仿真驱动机制研究：Tick 与 Event 的权责边界与三级 LOD 规划
11. `10-event-replay-review.md` - 事件账本与重放能力专项审查报告
12. `11-source-evidence.md` - 19 项关键源码证据清单（带 Commit 与代码行号）
13. `12-mirror-findings.md` - 镜界代码与架构审查缺陷清单（P0=0, P1=1, P2=3, P3=1）
14. `13-reuse-recommendations.md` - 开源技术复用分级与架构裁决建议
15. `14-open-questions.md` - 未决开放问题与技术债务备忘
16. `RESULT.md` - 综合成果总结报告（本文）
17. `DECISION.md` - 最终战略决策建议书
