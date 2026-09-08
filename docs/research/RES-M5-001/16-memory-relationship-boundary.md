# 16 - 记忆与社交关系边界架构 (Memory & Relationship Boundary)

## 1. 概念澄清：四大信息载体的严格隔离

在许多开源 AI 原型中，最常见的架构谬误是把大模型的“会话上下文（Chat Context）”等同于居民的“个人记忆（Memory）”，甚至荒谬地认为：

> 错误反模式：“聊天 Session 维持得越久，居民的记忆就越强、人设就越丰满。”

在「镜界」持久数字社会中，**坚决否定这种将瞬态会话当做持久心智的伪 Agent 架构**。
必须严格区分四大概念边界：

```mermaid
flowchart TD
    subgraph Level1 [1. LLM Conversation Context (大模型会话上下文)]
        C1[单次 HTTP 请求的输入 Tokens<br/>寿命: 秒级瞬态, 随调用结束即焚]
    end

    subgraph Level2 [2. Agent Operation Context (运行时操作上下文)]
        C2[单次决策组装的快照数据 DTO<br/>寿命: 任务级瞬态, 决策完成即释放]
    end

    subgraph Level3 [3. Resident Memory (居民持久记忆 - M4 范畴)]
        C3[主观持久记忆库: 剧集/语义/印象<br/>寿命: 居民终生持久, 支持衰减与遗忘]
    end

    subgraph Level4 [4. World Event History (客观世界历史 - Kernel 范畴)]
        C4[客观世界不可变事件账本: world_events<br/>寿命: 宇宙永存, 绝对单调全序, 事实真理]
    end

    Level4 -->|发生客观事件| Level3
    Level3 -->|M4 检索提取 Top-K| Level2
    Level2 -->|Composer 压缩装配| Level1
    Level1 -.->|严禁跨层直接逆向写入!| Level4

    classDef l1 fill:#ffebee,stroke:#c62828;
    classDef l2 fill:#fff3e0,stroke:#ef6c00;
    classDef l3 fill:#e8f5e9,stroke:#2e7d32;
    classDef l4 fill:#e1f5fe,stroke:#0277bd;
    class Level1 l1;
    class Level2 l2;
    class Level3 l3;
    class Level4 l4;
```

### 1.1 四大载体权威对比矩阵

| 特性维度                 | 1. 大模型会话上下文      | 2. 运行时操作上下文      | 3. 居民持久记忆 (M4)       | 4. 客观世界事件账本                |
| :----------------------- | :----------------------- | :----------------------- | :------------------------- | :--------------------------------- |
| **持久性 (Durability)**  | **纯瞬态 (秒级即焚)**    | **纯瞬态 (毫秒级即焚)**  | **持久 (持久化数据库)**    | **绝对不可变 (永久永存)**          |
| **所属主体 (Ownership)** | 计算硬件/网关 Worker     | 临时任务线程             | 属于特定 `resident_id`     | 属于宇宙全局 `world_id`            |
| **主客观属性 (Reality)** | 无主观概念，纯计算矩阵   | 只读视图投影             | **强主观 (允许偏见/失真)** | **强客观 (物理世界唯一真理)**      |
| **对 Replay 的影响**     | **重放时不发生任何调用** | **重放时不发生任何组装** | 可由历史事件完全重算重建   | **重放的唯一核心输入源**           |
| **修改权限 (Authority)** | 代码组装，用后丢弃       | 代码组装，用后丢弃       | 由 M4 记忆提取管道写入     | **仅由 World Kernel 事务独占追加** |

---

## 2. 记忆边界铁律：Agent Runtime 绝不拥有 Memory 事实主权

基于 `RES-M4-001` 的五层现实架构，M5 Agent Runtime 与 M4 记忆系统之间的交互被严格限定在**消费者接口（Consumer Interface）**：

1. **只读消费（Read-Only Consumption）**：
   - Agent Runtime 只能通过 `MemoryRetrievalPort.query(residentId, contextQuery)` 获取只读的记忆切片。
   - Agent 绝对没有权限直接对 `memories` 表执行 `INSERT`、`UPDATE` 或 `DELETE`。
2. **记忆提炼的异步解耦（Asynchronous Memory Pipeline）**：
   - 当对话或重大动作在世界中完成并生成权威事件（如 `CONVERSATION_COMPLETED`）后；
   - 由 M4 专属的后台记忆分析 Worker（离线异步通道）负责提炼剧集摘要、生成向量 Embedding 并写入持久记忆库；
   - 决策 Worker **绝不一边做决策一边同步写记忆库**，彻底杜绝认知死锁与超时。

---

## 3. 社交关系边界铁律：禁止 LLM 直接操控关系真理数值

在许多恋爱模拟或简单 RPG 游戏中，存在极其业余的设计：

```text
大模型内心独白: "林默觉得王雪很善良，因此王雪的好感度 +20。"
系统直接执行: UPDATE relationships SET affinity = affinity + 20 WHERE ...
```

在持久数字社会中，**这种由大模型直接随意修改数值的机制被严厉定性为非法越权（Illegal Authority Hijacking）**！

### 3.1 社交关系流转的法定因果链条

大模型只能表达**主观社交意图（Social Intent）**，绝不能直接修改关系真理：

```text
[ 大模型推理产生意图 ] ──► "我想夸赞王雪的衣品, 并主动为她点一杯咖啡" (ActionIntent: TALK / BUY)
                                  │
                                  ▼
[ 提交 World Kernel 仲裁 ] ──► 核验: 金钱是否扣除? 双方是否同在一室? (ActionRequest 提交)
                                  │
                                  ▼
[ 事实成立并追加账本 ] ──► 生成世界事件: CONVERSATION_COMPLETED & PURCHASE_COMPLETED
                                  │
                                  ▼
[ M4 关系引擎确定性判定 ] ──► 监听世界事件, 触发确定性社会学规则与亲密度函数:
                             Δaffinity = f(性格相性, 既有印象, 礼物价值, 场景气氛)
                                  │
                                  ▼
[ 提交关系变更事件 ] ────► 生成世界事件: RELATIONSHIP_CHANGED (由系统权威提交)
                                  │
                                  ▼
[ 刷新有向关系物化视图 ] ──► 写入/更新 relationships 投影表 (作为下次决策的只读输入)
```

### 3.2 关系边界核心防线原则：

1. **意图不等于结果**：林默即使在大模型中表达了“深情告白”，王雪是否接受完全取决于王雪的自主意识、双方关系历史与性格相性，林默的 Agent 无法单方面决定好感度是否上升。
2. **关系变化可解释、可审计、可重放**：所有亲密度与信任度的变化，必须严格有对应的底层世界事件（`world_events`）作为因果支撑；当世界从头重放时，相同的事件序列必然 100% 还原出完全相同的关系数值！
