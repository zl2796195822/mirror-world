# 03 · Intelligence LOD Model v1

## 0. 命名与 RES-M5 冲突登记

RES-M5-001 曾提出 I0=dormant、I1=rules、I2=SLM、I3=flagship。该编号把 **Execution/Dormancy** 与 **Intelligence** 混在同一轴上，且 I0 被描述为「不思考」，与 M10「I0 仍必须完成合法世界行为」冲突。

**M10 v1 推荐重命名（研究层，待正式 ADR）**：

| M10 | Name | 近似对应 M5（非正式） |
| --- | ---- | --------------------- |
| I0 | `RULE_ONLY` | M5 I1（规则）+ 部分 I0 的确定性推进 |
| I1 | `LIGHT_COGNITION` | M5 I1/I2 边界（heuristic / 可选本地小模型） |
| I2 | `STRUCTURED_COGNITION` | M5 I2/I3 的结构化部分 |
| I3 | `HIGH_VALUE_REASONING` | M5 I3 |

休眠/后台推进属于 **W1/W2**，不是 I0 的定义。

PENDING：`P-M10-009` 正式统一编号 ADR。

## 1. 公理

1. Intelligence LOD 只能改变：计算深度、候选丰富度、模型成本、延迟、思考频率。
2. Intelligence LOD **不能**改变：Kernel authority、资源守恒、权限、身份、Event Ledger、世界规则、真实价格、事实合法性。
3. 所有层的输出统一收敛为：
   `Observation → Candidate/Intent → ActionRequest → Kernel → Outcome`
4. Zero-LLM 生存：I0 必须在无任何 Provider 时仍使居民合法存在并推进生活。
5. Replay：LOD 历史不得通过「重新调模型」重建。

## 2. 四层定义

### I0 · RULE_ONLY

| 项 | 内容 |
| -- | ---- |
| 能力 | Needs evaluator、Goal evaluator、routine、work obligation、`m3-replan-v1` 分类、确定性候选选择、合法 ActionRequest 构造（从规则候选集） |
| 模型 | 无 LLM、无网络 Provider |
| 输出 | 规则候选 / 直接 ActionRequest / STOP / DEFER |
| Zero-LLM | **必须成立** |
| 权威 | 与 I3 相同：只能提出请求，不能写事实 |
| 禁止 | 编造记忆、伪造关系事件、跳过 Kernel、修改资源 |
| 失败行为 | 按 replan policy：STOP / DEFER_UNTIL_WORLD_TIME / 有界重试 |
| Replay | 完全确定性；与是否曾有 I3 无关 |

当前 main 的 Life Engine（needs/goals/replan）**已经接近 I0 正式能力面**；I0 正式化时应复用而非重写。

### I1 · LIGHT_COGNITION

| 项 | 内容 |
| -- | ---- |
| 能力 | 在 I0 之上做有限结构化选择：小候选集打分、简单路径/对话模板、bounded multi-step planner |
| 模型 | 默认无 LLM；可选本地小模型 / 确定性 heuristic |
| 输出 | **必须**结构化：ActionIntent-like 或候选排序 |
| Zero-LLM | **可以成立**（heuristic 路径） |
| 预算 | 上下文与步数有硬上界 |
| 禁止 | 自由文本直接变事实；无限 replan |
| 失败 | 降回 I0 规则候选 |
| Replay | heuristic 路径确定性；若用本地随机性必须注入 seed 或保存 envelope |

### I2 · STRUCTURED_COGNITION

| 项 | 内容 |
| -- | ---- |
| 能力 | 复杂 Intent、社交决策、有限谈判、多约束计划、关系敏感措辞 |
| 模型 | 受限 Provider 或强本地模型 |
| 输出 | 严格 schema（对齐 M5 ActionIntent 方向）：类型、参数、基于的 worldSeq/actorVersion、expires、reasonCategory |
| Zero-LLM | 可降级 I1/I0 |
| 预算 | token / wall-time / retry 均有界；超时 fail-closed |
| 禁止 | 非结构化 CoT 写入 ledger；越权参数；绕过 expectedActorVersion |
| 失败 | Schema 失败最多有界修复；否则 I0 fallback |
| Replay | **保存 envelope**，不重调模型 |

### I3 · HIGH_VALUE_REASONING

| 项 | 内容 |
| -- | ---- |
| 适用 | 重大关系转折、长期目标改变、复杂谈判、重要社会事件、异常冲突、关键人类互动 |
| 模型 | 昂贵模型（稀有） |
| 输出 | 仍是结构化 Intent/Plan，不是直接事实 |
| Zero-LLM | 必须可降级 |
| 预算 | 全局/世界/居民多层配额；并发硬顶 |
| 禁止 | 「我很重要所以升级」的自我授权；无限多轮 |
| 失败 | 降 I2/I1/I0；不得卡死世界 |
| Replay | frozen output envelope 优先 |

## 3. 能力矩阵（能否形成世界后果）

| 能力 | I0 | I1 | I2 | I3 |
| ---- | -- | -- | -- | -- |
| 推进 Needs/Goals（规则） | Y | Y | Y | Y |
| 提交 MOVE/SLEEP/WORK/EAT | Y（规则合法时） | Y | Y | Y |
| TALK 简单寒暄模板 | Y（模板） | Y | Y | Y |
| 复杂谈判 / 长程社交 | N | 有限 | Y | Y |
| 改变长期 Goal（通过 Goal 事件，若未来存在） | 仅规则触发 | 有限 | Y | Y |
| 直接写 `world_events` | **N** | **N** | **N** | **N** |
| 直接改 cash/inventory | **N** | **N** | **N** | **N** |
| 直接改 Memory/Relationship truth | **N** | **N** | **N** | **N** |
| 跳过 Kernel 校验 | **N** | **N** | **N** | **N** |

**推论**：不存在「I3 特权动作」。I3 只是在**同一动作空间**内产生更好的候选。

## 4. 升级 / 降级（摘要，详见 `08`）

升级信号必须来自**可审计输入**，不是模型自述：

- need threshold / conditionBand
- failure class（`m3-replan-v1`）
- unexpected observation（未来）
- relationship / economic event（未来）
- human interaction present（有界）
- goal terminal / commitment due
- rarity / world consequence class（policy 定义，不是 World Fact）

降级信号：

- budget exhausted
- provider unavailable
- max duration
- fairness quota
- successful terminal
- world overloaded / lag

## 5. 持续时间与预算

| 层 | 单次 wake 目标时延（研究值） | 最大连续 | 典型 token 上界（研究值） |
| -- | ---------------------------- | -------- | ------------------------- |
| I0 | < 5ms 计算 | N/A | 0 |
| I1 | < 50ms（本地） | 短 | 结构体级 / 数百 |
| I2 | < 5s wall | 中 | context 预算内（M5 建议 ~1.3k 量级） |
| I3 | < 30s wall | 极短 | 更大但仍 bounded |

以上为设计参考，**UNVERIFIED**；正式数值属未来 M10/M5 配置。

## 6. Provider 不可用行为

| 当前层 | Provider down | 行为 |
| ------ | ------------- | ---- |
| I0 | 无影响 | 继续 |
| I1 | 无影响（若 heuristic） | 继续；若有本地模型失败则 I0 |
| I2 | defer / degrade | 转 I1/I0 或 DEFER_UNTIL_WORLD_TIME |
| I3 | 强制降级 | I2/I1/I0；有界 queue，不阻塞世界 |

## 7. 与「重要性」概念的分离

| 概念 | 是否 World Fact | 用途 |
| ---- | --------------- | ---- |
| World Fact | 是 | Kernel / Ledger |
| Scheduler Input | 否 | due / wake index |
| Cognition Policy Input | 否 | LOD 升降 |
| Digest Importance | 否 | 摘要读模型 |
| Memory Salience | 否 | M4 检索 |

M10 不得把「promoted_to_I3」写成世界事实事件，除非未来有正式事件类型与 replay 合同。

## 8. 结论

Intelligence LOD 是**认知策略轴**，不是权力轴。  
人口规模化 = 降低「无意义思考」比例 + 提高「有意义边界」上的认知质量 + 保证 I0 永续。
