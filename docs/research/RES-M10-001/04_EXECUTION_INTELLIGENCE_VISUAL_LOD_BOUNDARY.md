# 04 · Execution / Intelligence / Visual LOD Boundary

## 三个正交维度

```text
                    ┌─────────────────────────────┐
                    │     World Execution LOD     │
                    │   W0 ACTIVE / W1 BG / W2    │
                    │   owner: M8 research + driver│
                    └──────────────┬──────────────┘
                                   │ orthogonal
                    ┌──────────────┴──────────────┐
                    │      Intelligence LOD       │
                    │   I0 RULE … I3 HIGH_VALUE   │
                    │   owner: M10 policy + M5 exec│
                    └──────────────┬──────────────┘
                                   │ orthogonal
                    ┌──────────────┴──────────────┐
                    │         Visual LOD          │
                    │   V0 none … V* full render  │
                    │   owner: M7 presentation    │
                    └─────────────────────────────┘
```

**禁止**建立一个巨大的全局 `LODLevel = 3` 同时控制一切。

## 各维度回答的问题

| 维度 | 问题 | 不回答 |
| ---- | ---- | ------ |
| W | 这个世界切片现在如何推进模拟？ | 居民想得多深；画面多细 |
| I | 这次居民 wake 的认知深度？ | 是否渲染；due 如何排序 |
| V | 如何呈现给观察者？ | 世界事实是否合法 |

## 合法性矩阵（示例）

| 组合 | 合法？ | 含义 |
| ---- | ------ | ---- |
| W1 + I0 + V0 | 是 | 无观察者，规则推进，无渲染 |
| W0 + I3 + V2 | 是 | 人类焦点互动，高保真画面与深思 |
| W0 + I0 + V2 | 是 | 在看，但该居民此刻只需规则动作（路过） |
| W2 + I0 + V0 | 是 | 追赶：事件跳跃，无认知、无渲染 |
| W2 + I3 + V0 | **默认否** | 追赶期不应新发昂贵认知；见 `13` |
| 任意 W + 任意 I + 违反 Kernel 的动作 | **否** | LOD 不授予权限 |

## 谁决定

| LOD | 决策者 | 输入 | 输出 |
| --- | ------ | ---- | ---- |
| W | World Execution Policy / Driver（M8/PRE-AL-07） | 人类相关性、lag、进程状态、world status | W0/W1/W2 |
| I | Cognition Policy Engine（M10） | wake reason、failure class、budget、fairness、attention bonus、policy version | I0–I3 |
| V | Presentation（M7） | 观察者、距离/AOI、设备、性能 | V 档 |

三者可以通信，但**不得互相覆盖 authority**：

- V 不能把 I0 画成「正在深思」的世界事实
- I 不能因为「要好看」而写不同事实
- W 不能把 I3 任务在 W1 静默改成「伪 I3 无结果」

## 与 RES-M8 的对齐

RES-M8 `WORLD-EXECUTION-LOD` 明确：

> World Execution LOD is **not** Visual LOD and **not** Intelligence LOD.

M10 全文继承该分离，并补充：

- W1 下允许 **optional low-LOD cognition**（I0/I1）
- W2 默认 **cognition off**；若 catch-up 触发新 boundary，按 `13` 的 evidence / degrade 规则处理
- W0 不等于全员 I3；只是「可以」给附近居民更高 I 档与更高 V 档

## 反模式

| 反模式 | 为何禁止 |
| ------ | -------- |
| `globalLod=3` | 耦合渲染与事实，不可审计 |
| 看不见就 I0 且不完成 due | 违反 Persistent World |
| 用户靠近自动永久 I3 | 破坏公平与成本 |
| 追赶时重新调用 LLM 补历史 | 破坏 Replay 与唯一历史 |
| Visual 层直接提交 ActionRequest | 绕过人类/代理控制权威 |

## 操作化提示（未来实现，非本研究）

```text
onWake(resident, reason):
  w = executionPolicy(worldSlice)          # W*
  i = cognitionPolicy(resident, reason, budget, fairness)
  # v is presentation-only, not used for commit
  runCognition(lod=i, execution=w)         # M5 mechanism
  → Intent/Request → Kernel
```

V 变化绝不进入该函数的 commit 路径。
