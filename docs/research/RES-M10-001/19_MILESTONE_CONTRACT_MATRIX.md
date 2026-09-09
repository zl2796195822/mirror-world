# 19 · Milestone Contract Matrix

M10 与各正式里程碑的合同。每项列出 owns / consumes / must not own / pending / blocking。

## M2 World Kernel

| 项 | 内容 |
| -- | ---- |
| M10 owns | 无 Kernel 写权；LOD 不进入事实权威 |
| M10 consumes | ActionRequest/Outcome 语义；Event Ledger 原则；World Clock；Replay 权威 |
| M10 must not own | validator、seq、checkpoint 真理 |
| pending | typed event payload registry（若 envelope 要挂事件） |
| blocking | 无（Kernel 已 PASS） |

## M3 Life Engine

| 项 | 内容 |
| -- | ---- |
| M10 owns | 何时/多深思考的 policy |
| M10 consumes | Needs/Goals/replan signals；Observation 契约；runtime 观测 |
| M10 must not own | Needs 计算、Goal stability、action semantics |
| pending | PRE-AL-07 driver；full domain replay；30×30 |
| blocking | 部分：无完整 action loop 时 M10 只能做 policy 研究级集成 |

## M4 Memory / Relationship

| 项 | 内容 |
| -- | ---- |
| M10 owns | 将 salience/relationship class 作为 **promotion signal** 的使用规则 |
| M10 consumes | 只读 relationship/memory projection（未来） |
| M10 must not own | memory truth、forgetting、relationship 数值 |
| pending | M4 正式包；salience ranking |
| blocking | 非 v1 硬阻塞；S-REL 可后置 |

## M5 Agent Runtime

| 项 | 内容 |
| -- | ---- |
| M10 owns | should/think/how deep/budget/fairness |
| M10 consumes | M5 在给定 lod+budget 下的 bounded cognition 执行 |
| M10 must not own | ProviderPort 实现细节、队列实现、context 拼装机制 |
| pending | 正式 M5；I-LOD 编号统一 ADR（`P-M10-009`） |
| blocking | 正式 I2/I3 实现依赖 M5；I0 不依赖 |

## M6 Economy

| 项 | 内容 |
| -- | ---- |
| M10 owns | 经济事件作为 promotion signal 的使用 |
| M10 consumes | 资源快照、经济 due/事件 |
| M10 must not own | 价格、账户、复式记账 |
| pending | M6 正式；economic event density |
| blocking | 否 |

## M7 Realtime / Presentation

| 项 | 内容 |
| -- | ---- |
| M10 owns | cognition LOD 边界（与 V 分离） |
| M10 consumes | 可选：visibility/attention 信号 |
| M10 must not own | 渲染、AOI、WebSocket |
| pending | Visual LOD owner contract |
| blocking | 否 |

## M8 Persistent World

| 项 | 内容 |
| -- | ---- |
| M10 owns | Intelligence LOD 与 catch-up 中的 cognition 规则 |
| M10 consumes | W0/W1/W2；event-jump；due ordering；S0；fairness 原则 |
| M10 must not own | downtime policy 真理、wake index 存储实现 |
| pending | PRE-AL-07 freeze；defer wake durability |
| blocking | 正式等价 Gate 依赖 M8 正式化 |

## M9 Human / Proxy Identity

| 项 | 内容 |
| -- | ---- |
| M10 owns | 预算/LOD 与身份交叉的机制边界 |
| M10 consumes | CognitionSource、Proxy Charter 允许范围 |
| M10 must not own | 身份真值、控制权威、接管流程 |
| pending | **PENDING_RES_M9_001** 全量身份合同 |
| blocking | PROXY/HUMAN 细则；NATIVE 主路径不阻塞 |

## 汇总

| 里程碑 | 对 M10 v1 的阻塞级别 |
| ------ | -------------------- |
| M2 | 无 |
| M3/PRE-AL-07 | 高（正确集成） |
| M4 | 低 |
| M5 | 高（I2/I3 实现） |
| M6 | 低 |
| M7 | 低 |
| M8 | 中高（持久与等价） |
| M9 | 中（非 NATIVE） |
