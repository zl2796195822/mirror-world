# 28 - 确定性边界与事件重放架构 (Determinism & Replay Architecture)

## 1. 概念破局：不要错误追求大模型的逐比特确定性

在探讨数字社会的确定性（Determinism）与可重放性（Replayability）时，许多工程师容易陷入一个认知误区：

> 误区：“为了保证模拟能够重放，必须强行让大模型（LLM）的输出在两次运行中完全逐字一致（Bit-for-Bit Deterministic）。”

在当代神经网络与云端大模型服务中，由于混合精度浮点计算的非结合律（Floating-point Non-associativity）、GPU 线程块乱序调度、以及商业厂商底层的推测采样（Speculative Decoding）和 MoE 动态路由，即使固定 `seed` 且将 `temperature` 设为 0，**大模型在跨网络、跨硬件甚至同硬件多次调用下，依然存在天然的非确定性微小扰动**。

若将世界的确定性重放寄托于“大模型输出必须完全一致”，整个系统在工程上将是脆弱不可控的。

---

## 2. 镜界确定性分水岭模型 (The Determinism Boundary)

镜界通过**确定性分水岭模型**，彻底解开了这一理论与工程死结：

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 非确定性主观领域 (Non-Deterministic Cognitive Sandbox)                  │
│ - 大语言模型 (LLM) 推理输出                                            │
│ - 允许输出有修辞波动、句式差异或微小决策倾向漂移                        │
│ - 身份: 提出主观建议 (Subjective Proposal), 零事实权威                 │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (通过 结构化网关 与 版本栅栏)
════════════════════════════ 确定性分水岭门禁 ═════════════════════════════
                                    │
                                    ▼ (进入 纯代码原子事务校验)
┌────────────────────────────────────────────────────────────────────────┐
│ 绝对确定性客观领域 (Deterministic Authoritative Domain)                │
│ - World Kernel 状态转移纯函数与业务规则核验                            │
│ - 货币扣减、物品所有权转移、空间位移、时间推进                          │
│ - 身份: 客观宇宙事实 (Objective Fact), 写入 world_events 账本          │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 确定性双重原则定义

1. **输入建议可发散，事实裁决永不漏（Permissive Suggestion, Strict Admission）**：
   - 大模型输出的内容可以千变万化，甚至充满文学想象力；
   - 但它一旦转化为 `ActionRequest`，就必须接受 World Kernel 冰冷无情的数学校验；
   - **任何违规事实（如穿墙、负数金额、幽灵物品）永远无法穿透分水岭！**
2. **已入账事实全序确定（Immutable Linear Fact Ordering）**：
   - 只要某个动作成功通过了内核校验，并写入了 PostgreSQL `world_events` 表，它就获得了唯一的单调递增全局序号 `worldSeq`，成为绝对确定性的宇宙历史。

---

## 3. M5 事件重放模型：Replay 绝对不重调大模型！

当开发运维人员需要复现一个 Bug、回溯某场经济危机、或者对过去 30 天的世界历史进行快照重放（Checkpoint Replay）时：

> **最高铁律：历史事件重放（World Replay）绝对不能、也绝不允许重新调用任何大模型！**

```mermaid
flowchart LR
    subgraph LiveMode [正常运行模式 (Live Simulation)]
        A1[LLM Provider] -->|异步思考产生| B1[ActionIntent]
        B1 -->|网关裁决提交| C1[Kernel Commit]
        C1 -->|生成权威事件| D1[(world_events 表)]
        C1 -->|异步记入| E1[(ai_traces 表)]
    end

    subgraph ReplayMode [历史重放模式 (Deterministic Replay - M2-T05)]
        D2[(world_events 表)] -->|直接顺序读取| R1[Replay Engine 状态机]
        R1 -->|纯确定性内存计算还原| R2[World State Checkpoint]
        R1 -.->|零网络 IO, 零大模型调用!| A2[LLM Provider (静默隔离)]
    end

    classDef live fill:#e1f5fe,stroke:#0288d1;
    classDef rep fill:#e8f5e9,stroke:#2e7d32;
    class A1,B1,C1,D1,E1 live;
    class D2,R1,R2 rep;
```

### 3.1 为什么重放绝不重调 LLM 的四大理由：

1. **重现成本为零**：回放 10,000 居民一整年的历史可能产生数千万条事件。如果回放要重调大模型，将产生数十万美元的重复成本；纯读事件账本重放，单机几分钟即可完成全量回放。
2. **数学重放自洽性（Replay Reproducibility）**：如果重放时重新调用大模型，模型由于温度或网络波动给出不同回答（如上次林默买了咖啡，这次模型决定不买），因果链条将瞬间分叉断裂，导致历史无法收敛。
3. **极速灾难恢复（Disaster Recovery）**：当服务器宕机重启时，内核利用 Checkpoint + Event Ledger 进行重放还原内存状态，必须在毫秒级完成，不可能承受等待大模型响应的网络延迟。
4. **历史追溯的证据链隔离**：
   - **历史做决定的来源**：记录在 `ai_traces` 中，供人类工程师溯源“当时模型为什么产生这个意图”；
   - **历史执行的真理事实**：记录在 `world_events` 中，用于支撑物理与经济世界的前进与重放。
   - 两者分工明确，互不污染。
