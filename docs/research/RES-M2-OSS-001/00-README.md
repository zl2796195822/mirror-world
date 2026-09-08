# RES-M2-OSS-001: World Kernel / Event Ledger / Simulation 开源源码对照研究

- **任务编号**: RES-M2-OSS-001
- **任务类型**: RESEARCH ONLY（独立开源源码研究）
- **基线起点**: Commit `b96c04982486f34aeedb07eb2c4265c4ff024076`（M2-T04 Milestone Gate 通过状态）
- **研究工作区**: `mirror-world-m2-oss-research`（独立 worktree / 分支 `research/m2-oss-world-kernel`）
- **完成日期**: 2026-09-08

---

## 1. 任务背景与核心使命

镜界（Mirror World）定位为 **Persistent Digital Society（持续运行的数字社会）**，而非短周期的多智能体玩具（AI Town Clone）或叙事聊天室。

在 M2 阶段，镜界确立了核心架构底线：

1. **PostgreSQL 是唯一长期持久事实源（Durable Truth）**；Redis 仅作为 Cache、Lease、Queue。
2. **World Kernel 是世界事实的唯一写入口**；所有业务事实写入必须穿透 Kernel 校验与事务。
3. **LLM 永远不能直接修改世界事实**；LLM 仅可作为认知侧产出意图（Intent / Proposal）。
4. **核心模拟必须基于固定 Seed 并支持确定性重放（Replay）**。
5. **ActionRequest ≠ Event**：外部请求是意图，事件是已被世界承认的不可变事实。

本研究任务（RES-M2-OSS-001）的核心目的不是将外部开源项目的代码整体搬迁到镜界，而是利用业界已验证的成熟开源项目与学术框架（**AI Town**、**Concordia**、**OpenClaw World** 及相关 Agent 运行时），**反向审查和强化**镜界自研的核心机制：

- World Clock（世界时钟推进、多倍率与锚点隔离）
- Action Contract（结构化动作契约与未知字段防御）
- ActionRequest & Idempotency（持久幂等、并发去重与冲突判定）
- Kernel Validator（领域快照校验与防 God-Object 结构）
- Event Ledger（追加写账本、World-Local 序号与数据库级防跳序/防篡改）
- Transaction Boundary（状态更新与事件追加的原子性）
- Deterministic Replay / Checkpoint / Projection 准备度
- 异步 AI Agent 与确定性 World Kernel 的解耦架构

---

## 2. 最高限制与安全边界

本任务严格遵守以下限制：

- **禁止修改 main 分支**，禁止向 main 发起 merge 或 push。
- **禁止修改正式代码**：不修改 World Kernel、Event Ledger、数据库 schema/migration、`@mirror/contracts`、`apps/`、`packages/`。
- **禁止实现未解锁任务**：不实现 M2-T05（Checkpoint/Replay）、M3（Life Engine）、M5（AI Agent Runtime）或任何后续任务。
- **禁止整体移植外部内核**：不把 Convex、Generative Game Master、Phaser 运行时等强耦合架构移植入镜界。
- **严格遵循许可证审计**：所有外部引用均明确记录仓库、Commit、文件、符号与许可证，不引入未审计或专有协议源码。
- **本报告不能成为正式架构事实源**：任何架构修改建议均须通过后续 ADR 与技术设计评审后，由对应里程碑正式任务落地。

---

## 3. 文档体系导引

本研究目录包含完整的对照研究成果矩阵：

| 编号  | 文档名                                                                                 | 核心内容                                                                      |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `00`  | [00-README.md](./00-README.md)                                                         | 任务总览、最高边界、研究目标与导读指南                                        |
| `01`  | [01-current-mirror-architecture.md](./01-current-mirror-architecture.md)               | 镜界当前代码真实架构（基于真实代码核实已实现/未实现边界）                     |
| `02`  | [02-source-register.md](./02-source-register.md)                                       | 开源项目资产登记与许可证审计（AI Town, Concordia, OpenClaw 等）               |
| `03`  | [03-ai-town-analysis.md](./03-ai-town-analysis.md)                                     | a16z AI Town 深度源码剖析（Engine, Input Queue, Step/Tick, Memory）           |
| `04`  | [04-concordia-analysis.md](./04-concordia-analysis.md)                                 | Google DeepMind Concordia 深度源码剖析（Game Master, Putative Event, Clock）  |
| `05`  | [05-openclaw-world-analysis.md](./05-openclaw-world-analysis.md)                       | OpenClaw World 实时世界体系深度剖析（ChenKuanSun, Two-Weeks, OpenClaw Core）  |
| `06`  | [06-comparison-matrix.md](./06-comparison-matrix.md)                                   | 30 维度全景技术对照矩阵（镜界 vs AI Town vs Concordia vs OpenClaw）           |
| `07`  | [07-concordia-game-master-mapping.md](./07-concordia-game-master-mapping.md)           | Concordia Game Master 与镜界 World Kernel 逐项深度对照与映射                  |
| `08`  | [08-async-agent-vs-deterministic-world.md](./08-async-agent-vs-deterministic-world.md) | 异步 AI 决策与确定性事务内核解耦架构（3种方案比较与推荐模式）                 |
| `09`  | [09-tick-event-model.md](./09-tick-event-model.md)                                     | Tick vs Event 驱动模型研究（Fixed Tick, Variable, Event-driven, Hybrid）      |
| `10`  | [10-event-replay-review.md](./10-event-replay-review.md)                               | 镜界 Event Ledger 对未来 Replay / Checkpoint 的充分性审查                     |
| `11`  | [11-source-evidence.md](./11-source-evidence.md)                                       | 关键源码证据清单（Finding ID, Repo, Commit, Symbol, Observed, Mirror Impact） |
| `12`  | [12-mirror-findings.md](./12-mirror-findings.md)                                       | 镜界现有代码审查缺陷与风险清单（P0/P1/P2/P3 分级与处置时机）                  |
| `13`  | [13-reuse-recommendations.md](./13-reuse-recommendations.md)                           | 复用分级推荐（REFERENCE, PORT, DEPENDENCY, DO NOT USE）                       |
| `14`  | [14-open-questions.md](./14-open-questions.md)                                         | 未决开放问题、架构权衡与技术债务备忘                                          |
| `RES` | [RESULT.md](./RESULT.md)                                                               | 研究综合成果与核心技术结论总览                                                |
| `DEC` | [DECISION.md](./DECISION.md)                                                           | 最终战略决策建议（PROCEED / PROCEED_WITH_FIXES / STOP_AND_REVIEW 判定）       |

---

## 4. 核心工作流程与方法论

1. **真实代码基线复核**：基于当前 Clean Worktree 的实际 TypeScript/SQL 代码，界定已实现的真实能力，拒绝将未落地的文档蓝图误当作已有事实。
2. **源码级克隆与静态分析**：克隆官方真实仓库与锁定 Commit，跟踪核心函数、数据结构、调用栈与时序。
3. **技术边界反思与审查**：以外部系统的成熟经验和已知缺陷反观镜界设计，寻找在并发、幂等、账本连续性、序列化开销、长程回放上的潜在隐患。
4. **分级收敛与治理沉淀**：形成证据明确、分级清晰、可逐步排期落地（Before M2 Gate / Before M3 / Future）的技术资产。
