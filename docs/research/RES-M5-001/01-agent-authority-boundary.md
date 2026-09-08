# 01 - Agent 权限边界与事实权威隔离 (Agent Authority Boundary)

## 1. 架构定位与最高宪法

在「镜界 / Persistent Digital Society」中，**世界内核（World Kernel）是世界事实的唯一裁决者与写入口**，**PostgreSQL 是唯一持久事实源（Durable Truth）**。

与传统以 LLM 为核心的单体 Agent 架构（如 AutoGPT、BabyAGI）或让 LLM 充当裁判的模拟系统（如 Concordia Game Master）有着本质区别：

> **大语言模型（LLM）永远不拥有任何客观世界事实权威（Zero Fact Authority）。**
> **Agent Runtime 只是一个认知决策管道，其产生的一切输出在通过内核裁决之前，均属于主观期望（Putative Intent）。**

```mermaid
flowchart TD
    subgraph Cognitive Layer [认知层 (Agent Runtime)]
        OBS[WorldObservationSnapshot] --> LLM[LLM Reasoning]
        MEM[Allowed Memory / Relations] --> LLM
        LLM --> INTENT[ActionIntent]
    end

    subgraph Gateway Layer [网关安全门禁]
        INTENT --> GATE[Validation & Fencing Gateway]
        GATE --> REQ[ActionRequest<br/>idempotencyKey + expectedActorVersion]
    end

    subgraph Kernel Layer [世界事实内核 (World Kernel - ACID Single Tx)]
        REQ --> VAL{Kernel Pure Validator}
        VAL -->|Reject| REJ[Reject ReasonCode]
        VAL -->|Conflict| CONF[KERNEL_CONFLICT]
        VAL -->|Accept| COMMIT[Commit State & Append world_events]
        COMMIT --> DB[(PostgreSQL Durable Truth)]
    end

    classDef cognitive fill:#e1f5fe,stroke:#0288d1;
    classDef gateway fill:#fff3e0,stroke:#f57c00;
    classDef kernel fill:#e8f5e9,stroke:#388e3c;
    class OBS,LLM,MEM,INTENT cognitive;
    class GATE,REQ cognitive;
    class VAL,REJ,CONF,COMMIT,DB kernel;
```

---

## 2. Agent 权威白名单：Agent 被允许做什么

Agent Runtime 被严格限制在**只读感知（Read-Only Perception）**与**主观意图表达（Intent Formulation）**的沙箱之内。

### 2.1 允许读取的数据资产

1. **读取受限的观察快照 (`WorldObservationSnapshot`)**：
   - 只能读取当前居民在物理视野或感知半径内的局部环境、地标建筑、可交互物品与在场其他居民的基础公开状态。
   - 快照具有严格的版本号（`worldSeq`、`worldTime`、`actorVersion`）。
2. **读取授权的主观记忆 (`Resident Memory Projection`)**：
   - 只能通过 M4 记忆引擎的检索端口（`MemoryRetrievalPort`），读取与当前情境语义相关、属于该居民自身的记忆条目（Top-K 剧集记忆与语义记忆）。
   - 严禁跨居民非法读取他人的私有记忆。
3. **读取授权的社交关系投影 (`Relationship Projection`)**：
   - 只能读取该居民对视野内特定居民的有向社交认知数值（如亲密度、信任度、好感度、主观印象标签）。
4. **读取生命状态与生理驱动信号 (`Life State & Need Signals`)**：
   - 读取 M3 生命引擎计算出的生理需求状态（如饥饿值、疲劳值、精力值、当前作息目标）。
5. **读取经济资源快照 (`Resource Snapshot`)**：
   - 读取该居民拥有的现金余额快照（整数分 `balanceCents`）以及背包/橱柜中的可用物品清单。

### 2.2 允许执行的计算与行为

1. **调用模型推理 (`Invoke LLM / SLM`)**：
   - 在严格的 Token 预算和时间限制内，将组装好的有限上下文发送给 Provider Port。
2. **形成候选结构化意图 (`Formulate Candidate Intent`)**：
   - 基于推理结果，构造符合类型定义的 `ActionIntent`（例如：“意图走向蓝瓶咖啡馆”、“意图向王雪打招呼并询问租金”）。
3. **向网关提交动作请求 (`Submit ActionRequest`)**：
   - 将结构化意图转换为标准的 `ActionRequest` 契约格式，通过异步队列提交给 World Gateway。

---

## 3. Agent 严禁操作黑名单：绝对不可跨越的架构红线

下表详列了 Agent Runtime 绝对禁止执行的操作及其系统性破坏后果：

| 严禁操作类型             | 具体违规行为示例                                     | 为什么绝对禁止（违规灾难后果）                                                             |
| :----------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **直接修改空间位置**     | `UPDATE residents SET location_id = 'cafe'`          | 绕过世界地图拓扑与连通性校验；导致瞬移穿墙，破坏物理时序与碰撞逻辑。                       |
| **直接修改资产与金钱**   | `UPDATE accounts SET balance_cents = balance + 100`  | 破坏复式记账法（Double-Entry）；凭空印钞或吞币，破坏经济闭环（RES-M6-001）。               |
| **直接增减背包与库存**   | `UPDATE inventory SET quantity = quantity + 1`       | 绕过商店库存可用性核查；产生负库存与物品所有权竞态。                                       |
| **直接覆写社交关系真理** | `UPDATE relationships SET affinity = 100`            | 社交关系必须由经过仲裁的交互事件（`CONVERSATION_COMPLETED`）驱动；禁止大模型直接操控数值。 |
| **直接追加世界事件**     | `INSERT INTO world_events ...`                       | 破坏内核对 `worldSeq` 单调连续递增的物理独占权；造成事件溯源断裂与不可重放。               |
| **推进或修改世界时钟**   | `UPDATE worlds SET world_time = ...`                 | 世界时钟（World Clock）是受控单例；禁止 Agent 私自加速、倒流或冻结世界时间。               |
| **直接开启数据库事务**   | `db.transaction(async (tx) => { ... })`              | Agent 思考可能耗时 5~30 秒，持有数据库事务锁将直接耗尽连接池，引发全服宕机。               |
| **自然语言直通世界事实** | 将 LLM 输出的“我说服了李明借我100元”直接视为借贷成立 | 纯文本幻觉不等于合约事实；对方居民可能并未同意，且必须满足转账校验。                       |

---

## 4. 意图提出与事实裁决的因果漏斗

为了在代码级与契约级落实上述边界，系统采用**因果收敛漏斗（Causal Convergence Funnel）**模型：

```text
[ 1. Objective Reality ]  World Kernel 持久化事实 (PostgreSQL world_events / state)
           │
           ▼ (过滤、投影、空间裁切)
[ 2. Subjective Perception ]  WorldObservationSnapshot (只读数据切片, 携带 actorVersion=N)
           │
           ▼ (Prompt 拼装与大模型推理)
[ 3. Cognitive Output ]  ActionIntent (主观期望, basedOnActorVersion=N)
           │
           ▼ (Schema 校验、权限门禁、防重签名)
[ 4. Formal Request ]  ActionRequest (携带 idempotencyKey, traceId, expectedActorVersion=N)
           │
           ▼ (World Kernel 事务单线程/行锁严格原子判定)
[ 5. Authoritative Verdict ]
           ├── 状态版本冲突 (actorVersion !== N) ─────────► [ KERNEL_CONFLICT ] (安全丢弃/重规划)
           ├── 校验不通过 (如金钱不足/位置不可达) ────────► [ REJECT ] (记录审计, 不改状态)
           └── 校验全部通过 (原子扣款、位移、写事件) ──────► [ COMMIT ] ──► 生成世界事件 (SEQ=M+1)
```

### 关键约束断言：

1. **主客观严格分离**：第 1、2、4、5 步完全由确定性 TypeScript / SQL 逻辑驱动，第 3 步是唯一允许包含非确定性 LLM 计算的环节。
2. **失败不对世界产生副作用**：当意图被内核拒绝或因陈旧而冲突时，物理世界毫发无损，内核只返回拒绝代码，由 Agent 决定是否重新观察。
3. **重放免疫大模型波动**：当重放系统回放第 1 步的 `world_events` 时，系统从第 5 步生成的历史事件直接还原状态，根本无需、也绝不能重新执行第 3 步的模型推理。
