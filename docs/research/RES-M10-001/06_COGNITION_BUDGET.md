# 06 · Cognition Budget

## 问题

谁拥有「这次 cognition 值不值得执行、用哪一层、花多少预算」？

## M5 / M10 边界（研究推荐）

| 模块 | 拥有 | 不拥有 |
| ---- | ---- | ------ |
| **M10 Cognition Policy** | 是否 wake、I 层、配额、降级、公平、attention bonus、紧急预留 | 不直接调 Provider；不改世界事实 |
| **M5 Agent Runtime** | 给定 I 层与预算后：context 组装、schema、provider 调用、解析、有界重试 | 不自行升级到 I3；不扩大预算；不写事实 |
| **M2 Kernel** | 事实合法性 | 不感知预算 |

```text
M10: shouldWeThink? howDeep? howMuchBudget?
M5:  given depth+budget → one bounded cognition
M2:  is this world-fact legal?
```

兼容性：当前 main 尚无 M5/M10 包；该切分与现有
`Observation → (future cognition) → ActionRequest → Kernel` 完全兼容，
不预设 M5 内部队列实现。

## 预算维度

| 维度 | 含义 | 防什么 |
| ---- | ---- | ------ |
| per resident | 单居民单位时间 I2/I3 次数与 token | poison / 戏剧性居民吸干 |
| per world | 世界总 cognition 吞吐 | 单世界拖垮全局 |
| per time window | 滑动窗口（world-time 或 wall ops） | 突发雪崩 |
| per provider | 提供商配额 / QPS / 成本 | Denial-of-Wallet、封禁 |
| per interaction | 单次人类会话/代理会话 | 对话刷爆 I3 |
| per priority class | FOREGROUND/CRITICAL/… | 后台饿死前台或相反 |
| global emergency reserve | 预留人类关键互动 | 全员升级吃光 |

## 权威结构（研究）

```text
GlobalBudget
  └─ WorldBudget
       ├─ PriorityClassBudget
       └─ ResidentQuota (aging + burst)
            └─ InteractionBonus (bounded, audited)
```

规则：

1. 世界预算耗尽 → 新 cognition 降级，不暂停世界。
2. 居民配额耗尽 → 该居民降至 I0/I1，**不删除、不冻结存在**。
3. Emergency reserve 只服务明确的人类/运维关键路径，有上限。
4. 所有扣减可审计；失败的 Provider 调用是否扣减必须定义（建议：预留 + 按实际成功/计费回写）。

## 「1000 人被 3 个高戏剧性居民占满」防护

多层同时生效：

1. resident hard cap（如单位 world-day I3 次数）
2. aging：等待中的合法高优先 wake 逐渐升权，但不能无限插队 due 排序
3. world I3 concurrency cap（对齐 M5 hard concurrency）
4. 公平：同 trigger class 先比配额与 wakeKey，不比「谁更会写故事」
5. operator 可见：starvation / top consumers 指标（见 `17`）

## 人类观察者是否给额外预算？

可以，但必须：

| 允许 | 禁止 |
| ---- | ---- |
| 有界 attention bonus | 无限 I3 |
| 提高 presentation fidelity | 改变 Kernel 规则 |
| 计入该居民配额 | 偷其他居民配额且无记录 |
| 可关闭 | 成为默认永久能力 |

详见 `14_HUMAN_ATTENTION_BIAS.md`。

## 与 `m3-replan-v1` 的关系

`m3-replan-v1` 的 `DecisionAttemptBudget`（submission / conflict / replan）是 **decision cycle 内** 的执行恢复预算。

M10 预算是 **cognition 选择层** 预算。二者不合并：

- M10：允许这次做 I2
- replan：I2 产出的 request 失败后还能重试/重规划几次

禁止用「还有 replan 预算」自动升级 I 层。

## 计量单位（研究建议）

| 单位 | 用途 |
| ---- | ---- |
| wake count | 公平与饥饿 |
| model tokens | 成本 |
| wall-time | 延迟与超载 |
| provider credits | 商务配额 |

正式实现前统一换算系数 = 配置，不是 World Fact。

## 失败与预留

| 情况 | 行为 |
| ---- | ---- |
| 预算算子不可用 | fail-closed 到 I0 |
| 配额账本落后 | 保守降级，不超发 |
| 紧急预留被误用 | 审计告警 + 上限 |
| 成本 cap exceeded | 全局/世界 I2+ 停新，I0 继续 |

## 非目标

- 不在本研究实现 Redis/DB 配额存储
- 不给出现网价格承诺
- 不把预算写入 Event Ledger 作为世界事实
