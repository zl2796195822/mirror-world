# 02 - Agent 观察切片契约与感知隔离 (Agent Observation Contract)

## 1. 为什么禁止 Agent 直连数据库执行全库 SQL？

在传统脆弱的 Agent 原型中，常有赋予 Agent 数据库只读连接直接执行 SQL（`SELECT * FROM ...`）的错误做法。在持久数字社会中，这种做法存在致命缺陷：

1. **破坏认知局部性（Locality of Cognition）**：居民不应具备上帝视角（God Mode），他不能瞬间获知城市另一端私人住宅里的抽屉有什么物品，也不能知道另一个居民银行账户里有多少钱。
2. **连接池风暴与长事务慢查询**：数百个 Agent 并发执行复杂的 `JOIN` 查询，将迅速消耗 PostgreSQL 连接与 CPU，严重拖慢 World Kernel 的核心写入事务。
3. **缺乏版本栅栏（No Version Fencing）**：直接查询数据库无法原子性地捕获“该居民在决定时刻的因果一致视图”，导致 Agent 决策基于混乱的交错时间切片。
4. **越权与注入风险**：即使只读连接，也存在通过 SQL 函数或递归查询探测系统底表、泄露其他世界隔离区数据的安全漏洞。

因此，**Agent 只能读取由系统裁切装配好的只读数据结构：`WorldObservationSnapshot`**。

---

## 2. 观察快照设计原则

`WorldObservationSnapshot` 必须满足五大不变式约束：

1. **World Scoped (世界作用域隔离)**：绝对严格归属于单一 `worldId`，绝不跨世界渗透。
2. **Actor Scoped (行动者感知隔离)**：严格以该居民的物理位置、感官半径和社交认知为中心进行几何与语义裁切。
3. **Versioned (严格版本化)**：必须显式携带 `worldSeq`、`worldTime` 以及 `actorVersion`，作为后续行为判定的版本栅栏令牌。
4. **Bounded (严格容量受限)**：附近实体数量、物品数量、记忆条目和关系条目均设有硬性上限（如最多 Top-5 附近实体、Top-3 关联记忆），防止上下文无限膨胀。
5. **Read-Only & Immutable (纯只读与不可变)**：快照是冻结的纯数据传输对象（DTO），Agent 对其任何就地修改均不会写回系统。

---

## 3. WorldObservationSnapshot 概念数据契约

```typescript
/**
 * 镜界居民 Agent 观察切片契约 (DTO)
 * 纯概念契约：用于规定认知层读取边界，不修改 packages/contracts
 */
export interface WorldObservationSnapshot {
  /** 1. 基础时空与版本元数据 */
  readonly snapshotMeta: {
    readonly worldId: string;
    readonly worldTime: string; // ISO 8601 UTC
    readonly worldSeq: number; // 观察时的世界事件单调序号
    readonly snapshotCreatedAt: string; // Wall-clock 时间戳，用于检测感知排队延迟
  };

  /** 2. 居民主体自身状态 (Self Perspective) */
  readonly self: {
    readonly residentId: string;
    readonly actorId: string;
    readonly actorVersion: number; // 实体版本号，用于 Fencing 校验
    readonly name: string;
    readonly locationId: string;
    readonly locationName: string;
    readonly locationCapabilities: readonly (
      | "SLEEP"
      | "WORK"
      | "EAT"
      | "SHOP"
    )[];
    readonly balanceCents: number; // 资产整数分
    readonly inventory: Readonly<Record<string, number>>; // itemId -> quantity
    readonly needSignals: {
      readonly hungerLevel: number; // 0-100 (由 Life Engine 计算)
      readonly fatigueLevel: number; // 0-100
      readonly socialNeed: number; // 0-100
    };
    readonly currentRoutineGoal: {
      readonly goalId: string;
      readonly goalType: "EAT" | "SLEEP" | "WORK" | "WANDER" | "SOCIAL";
      readonly deadlineWorldTime?: string;
    };
  };

  /** 3. 视野内局部感知 (Bounded Nearby Reality) */
  readonly nearby: {
    /** 空间连通性：居民当前位置可直接移动到达的目的地 (最多 5 个) */
    readonly accessibleLocations: readonly {
      readonly id: string;
      readonly name: string;
      readonly travelMinutes: number;
    }[];

    /** 同一空间/视口内的其他居民 (按物理距离排序，硬上限 Top-8) */
    readonly otherResidents: readonly {
      readonly residentId: string;
      readonly actorId: string;
      readonly name: string;
      readonly currentAction:
        | "IDLE"
        | "MOVING"
        | "TALKING"
        | "WORKING"
        | "EATING"
        | "SLEEPING";
      readonly isEngagedInDialogue: boolean;
    }[];

    /** 当前地点货架或环境中可见的合法物品 (硬上限 Top-10) */
    readonly availableItems: readonly {
      readonly itemId: string;
      readonly name: string;
      readonly isFood: boolean;
      readonly priceCents: number;
      readonly stockQuantity: number;
    }[];
  };

  /** 4. 检索注入认知 (Retrieved Mind Assets - 严格受限) */
  readonly cognitiveContext: {
    /** 从 M4 检索出的与当前地点/在场人员语义相关的长期记忆 (硬上限 Top-5) */
    readonly relevantMemories: readonly {
      readonly memoryId: string;
      readonly memoryType: "EPISODIC" | "SEMANTIC";
      readonly summary: string;
      readonly importanceScore: number;
      readonly occurredAtWorldTime: string;
    }[];

    /** 对当前在场其他居民的有向社交关系认知切片 (仅限 nearby.otherResidents 中的实体) */
    readonly relationshipProjections: readonly {
      readonly targetResidentId: string;
      readonly affinity: number; // -100 ~ 100
      readonly trust: number; // 0 ~ 100
      readonly conflict: number; // 0 ~ 100
      readonly impressionSummary?: string;
    }[];

    /** 最近一次执行的动作结果反馈 (用于处理失败后重规划) */
    readonly lastActionOutcome?: {
      readonly actionType: string;
      readonly status: "ACCEPTED" | "REJECTED" | "CONFLICT";
      readonly reasonCode?: string;
    };
  };

  /** 5. 权限与合法指令集沙箱 */
  readonly capabilitySandbox: {
    readonly allowedActionTypes: readonly (
      | "MOVE"
      | "EAT"
      | "SLEEP"
      | "WORK"
      | "TALK"
      | "BUY"
    )[];
    readonly maxBudgetSpendingCents: number; // 当前单次动作允许支配的最大金额
  };
}
```

---

## 4. 观察快照装配管道 (Snapshot Assembly Pipeline)

观察快照不由 Agent 自行拼接，而是由专门的轻量服务 **`ObservationComposer`** 按照如下纯只读流水线组装：

```text
[ Trigger: Agent Wake Request ]
             │
             ├──► 1. 读取 Actor 与 Location 基础投影缓存 (Redis / Read Replica)
             │
             ├──► 2. 空间局部性裁切 (Spatial Filter: 取同 LocationId 或 AOI 半径内实体)
             │
             ├──► 3. 异步调用 M4 Memory Query Port (输入 Query Key: 当前地点 + 附近实体ID, Limit=5)
             │
             ├──► 4. 批量查询关联 Relationship 物化视图 (输入: selfId -> [targetIds])
             │
             ├──► 5. 组装 WorldObservationSnapshot 结构体
             │
             └──► 6. 计算 SHA-256 签名并打上快照版本号 ──► 注入 Agent Operation
```

### 关键防线与防膨胀约束：

1. **零 N+1 查询**：`ObservationComposer` 必须通过批量 DataLoader 或物化 Projection 表一次性获取所需字段，严禁循环查库。
2. **严禁包含大段历史对话全文**：若附近发生过对话，只允许摘要或最近 3 句公开对话进入快照，绝对不将长篇多轮聊天记录全量塞入。
3. **不可见字段物理剔除**：其他居民的真实银行余额、私密背包道具、隐藏性格参数以及系统 Prompt，严格在装配层被物理过滤，绝不出现在快照 JSON 中。
