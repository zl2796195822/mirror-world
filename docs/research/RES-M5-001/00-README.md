# RES-M5-001: AI Agent Runtime / Intent / Cost & Determinism Architecture Research

- **任务编号**: RES-M5-001
- **任务名称**: AI Agent Runtime / Intent / Cost & Determinism Architecture Research
- **任务类型**: RESEARCH ONLY (架构与运行时前置专项研究)
- **基线版本**: `origin/main` (`aa156aa56e2bc509f31bf6c8bc5234bc1c157928`)
- **分支**: `research/m5-agent-runtime-v1`
- **工作区**: `../mirror-world-m5-agent-research`
- **当前正式项目状态**:
  - M0: PASS
  - M1: PASS
  - M2: PASS
  - M3: IN_PROGRESS (M3-T01 PASS)
  - M4 / M5: 尚未正式实现
- **关联前序研究**:
  - `RES-M2-OSS-001`: 开源世界内核与模拟架构对照研究
  - `RES-M3-001`: 最小居民状态与生命引擎确定性规格研究
  - `RES-M3-002`: M3-T01 边界与 M2 兼容性验证研究
  - `RES-M4-001`: 记忆分层与关系网络架构研究
  - `RES-M6-001`: 闭环经济系统与货币主权研究

---

## 1. 研究使命与核心问题

镜界（Mirror World）的愿景是构建**持久数字社会（Persistent Digital Society）**，绝不是一个供数百人并发闲聊的大型聊天室（Massive Chat Room），也不是脆弱瞬态的 AI Town Clone。

在镜界中：

1. **镜界居民什么时候真正需要 AI？**
2. **AI 到底被允许决定什么？**

本研究彻底粉碎“每个居民都是 Agent $\implies$ 每个居民 24 小时常驻独立 LLM Session 进程”的荒谬假设，为未来的正式 M5 里程碑构建一套：

- **可扩展 (Scalable)**: 支持 30 $\to$ 100 $\to$ 1,000 $\to$ 10,000 居民平滑演进；
- **成本可控 (Cost-Bounded)**: 严格执行基于事件重要性与感知距离的 Intelligence LOD；
- **异步解耦 (Async & Non-blocking)**: 世界时钟单调向前，绝对不等待任何 LLM 外部调用；
- **可审计 (Auditable)**: 决策意图有据可查，但严禁将大模型思维链污染进核心世界事实账本；
- **零事实权威 (Zero Fact Authority)**: LLM 仅负责提出结构化意图（`ActionIntent`），世界内核（World Kernel）独占仲裁与提交事实（`WorldEvent`）；
- **高弹性容灾 (Graceful Degradation)**: 在外部大模型供应商全面宕机时，确定性生命引擎（Life Engine）托底维系社会运转。

---

## 2. 绝对不可逾越的六大红线

1. **严禁修改主仓核心源码**：不得修改 `apps/`、`packages/`、`migrations/`、`PROJECT_STATE.md`、`MEMORY.md`，严禁 merge 到 `main`。
2. **严禁实现正式业务**：不接入真实 LLM Provider，不实现正式 Agent UI / 聊天应用，不启动长期常驻守护进程。
3. **LLM 永远不是事实权威**：Agent 只能通过观察生成意图，严禁以任何方式直接执行 `UPDATE` 或直接将自然语言输出当做世界事实。
4. **确定性重放绝对不重调大模型**：历史事件账本是自包含且确定性的；Replay 仅重放已经裁决提交的权威事件。
5. **记忆与事实严格分层**：居民主观记忆（`memories`）允许偏差与遗忘，严禁越界充当客观世界事件（`world_events`）。
6. **经济与资产零篡改**：货币与背包完全受 Kernel 与复式记账法管辖，LLM 绝无直接加减余额的权限。

---

## 3. 研究成果文档索引

| 编号         | 文档名称                                                                     | 核心研究主题                                                                   |
| :----------- | :--------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **01**       | [`01-agent-authority-boundary.md`](./01-agent-authority-boundary.md)         | Agent 权限边界：只读观察、结构化意图与内核事实裁决绝对隔离                     |
| **02**       | [`02-agent-observation-contract.md`](./02-agent-observation-contract.md)     | 观察切片契约：版本化、受限作用域的只读世界感知快照                             |
| **03**       | [`03-agent-runtime-model.md`](./03-agent-runtime-model.md)                   | 实体分离模型：Resident vs Life Engine vs Agent Runtime vs LLM Session          |
| **04**       | [`04-llm-invocation-policy.md`](./04-llm-invocation-policy.md)               | 大模型唤醒决策策略：NO_LLM / OPTIONAL_LLM / REQUIRED_LLM 矩阵                  |
| **05**       | [`05-intelligence-lod.md`](./05-intelligence-lod.md)                         | 智能细节层次 (Intelligence LOD)：LOD-I0 到 LOD-I3 动态降级与算力配额           |
| **06**       | [`06-agent-operation-lifecycle.md`](./06-agent-operation-lifecycle.md)       | 认知操作生命周期状态机：挂起、异步推理、超时、取消与收敛闭环                   |
| **07**       | [`07-async-intent-pipeline.md`](./07-async-intent-pipeline.md)               | 异步流水线架构：世界事件 $\to$ 唤醒请求 $\to$ 结构化意图 $\to$ 栅栏提交        |
| **08**       | [`08-structured-intent.md`](./08-structured-intent.md)                       | 结构化意图规范：`ActionIntent` vs `ActionRequest` vs `ActionResult` vs `Event` |
| **09**       | [`09-action-outcome-requirements.md`](./09-action-outcome-requirements.md)   | 执行结果闭环需求：解决既有架构缺口，提供 `KernelActionOutcome` 规格            |
| **10**       | [`10-retry-timeout-stale.md`](./10-retry-timeout-stale.md)                   | 异常防御与重试边界：三层重试、双重超时机制与陈旧快照冲突处理                   |
| **11**       | [`11-queue-and-lanes.md`](./11-queue-and-lanes.md)                           | 队列与通道划分：交互、社交、规划、摘要与维护多车道背压隔离                     |
| **12**       | [`12-provider-abstraction.md`](./12-provider-abstraction.md)                 | 统一模型提供商端口：无 SDK 领域泄漏的 Provider 抽象架构                        |
| **13**       | [`13-model-routing.md`](./13-model-routing.md)                               | 智能模型路由策略：按能力层级（Capability Tiers）动态分发                       |
| **14**       | [`14-cost-budget.md`](./14-cost-budget.md)                                   | 规模成本与 Token 预算：30 / 100 / 1,000 / 10,000 居民敏感性数学模型            |
| **15**       | [`15-context-budget.md`](./15-context-budget.md)                             | 上下文组装与预算上限：Context Composer、Token 分箱与动态截断                   |
| **16**       | [`16-memory-relationship-boundary.md`](./16-memory-relationship-boundary.md) | 记忆与社交关系边界：消费 M4 检索投影、禁止伪造事实与反层级污染                 |
| **17**       | [`17-tool-permission-security.md`](./17-tool-permission-security.md)         | 工具调用与权限沙箱：只读感知工具、意图网关工具与严禁 SQL 工具                  |
| **18**       | [`18-prompt-injection.md`](./18-prompt-injection.md)                         | 提示词注入防御：不可信世界内容隔离与结构化输出安全防线                         |
| **19**       | [`19-audit-observability.md`](./19-audit-observability.md)                   | 审计与可观测性：世界事件账本 vs 运维级 `ai_traces` 跟踪体系                    |
| **20**       | [`20-failure-degradation.md`](./20-failure-degradation.md)                   | 故障恢复与优雅降级：AI 全面故障下 M3 Life Engine 确定性托底保活                |
| **21**       | [`21-scale-model.md`](./21-scale-model.md)                                   | 规模扩展模型：30 $\to$ 10,000 规模运行时架构演进路线                           |
| **22**       | [`22-session-strategy.md`](./22-session-strategy.md)                         | Agent 会话策略裁决：永久会话 vs 无状态操作 vs 短暂微会话                       |
| **23**       | [`23-openclaw-reuse.md`](./23-openclaw-reuse.md)                             | OpenClaw 技术复用审查：通道设计参考、会话串行化与单人单进程否定                |
| **24**       | [`24-ai-sdk-bullmq-evaluation.md`](./24-ai-sdk-bullmq-evaluation.md)         | AI SDK 与 BullMQ 选型评估：Provider 规范依赖与调度编排定位                     |
| **25**       | [`25-m5-minimal-components.md`](./25-m5-minimal-components.md)               | 正式 M5 v1 最小组件架构图：精简自洽、拒绝过度工程                              |
| **26**       | [`26-m5-minimal-contracts.md`](./26-m5-minimal-contracts.md)                 | M5 最小概念接口契约（TypeScript Draft）：唤醒、快照、意图与结果                |
| **27**       | [`27-m5-test-matrix.md`](./27-m5-test-matrix.md)                             | M5 自动化验证测试矩阵：覆盖并发、幂等、降级、注入与冲突验证                    |
| **28**       | [`28-determinism-replay.md`](./28-determinism-replay.md)                     | 确定性与重放分界线：非确定性大模型建议 vs 确定性事实重放                       |
| **29**       | [`29-source-register.md`](./29-source-register.md)                           | 开源资产登记册：许可证审计、代码定位与复用分级                                 |
| **30**       | [`30-source-evidence.md`](./30-source-evidence.md)                           | 源码代码级物证考据：AI Town, OpenClaw, AI SDK, BullMQ, Mem0/Letta              |
| **31**       | [`31-open-questions.md`](./31-open-questions.md)                             | 遗留开放性问题与后续跟踪事项                                                   |
| **RESULT**   | [`RESULT.md`](./RESULT.md)                                                   | 研究执行结果综合通报                                                           |
| **DECISION** | [`DECISION.md`](./DECISION.md)                                               | 架构决议：逐一回答 31 项核心问题，正式准入裁决                                 |
