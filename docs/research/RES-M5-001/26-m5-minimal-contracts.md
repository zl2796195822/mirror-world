# 26 - M5 最小概念接口契约草案 (M5 Minimal Conceptual Contracts Draft)

> **注**：本文件同时作为 `M5-MINIMAL-CONTRACTS.md` 归档。本文件仅定义未来 M5 概念数据契约草案，**不修改任何现有生产代码，不向 `@mirror/contracts` 添加代码**。

---

## 1. 契约定义清单

本草案定义 8 大核心领域契约：

1. `AgentWakeRequest` (唤醒触发请求)
2. `AgentObservationSnapshot` (观察感知快照)
3. `AgentOperation` (认知操作运行态)
4. `ModelRequest` (模型请求抽象)
5. `StructuredIntent` (结构化意图)
6. `AgentCompletion` (操作完成载荷)
7. `KernelActionOutcome` (内核执行结果)
8. `AgentTrace` (运维审计跟踪)

---

## 2. 概念契约 TypeScript 规格草案

```typescript
/**
 * 1. Agent 唤醒请求契约 (AgentWakeRequest)
 */
export interface AgentWakeRequest {
  readonly wakeId: string;
  readonly worldId: string;
  readonly residentId: string;
  readonly triggerKind: "SCHEDULE" | "WORLD_EVENT" | "PLAYER_INTERACTION";
  /** 触发唤醒的原始事件 ID (若为事件驱动) */
  readonly sourceEventId?: string;
  /** 触发时刻的世界时钟 */
  readonly triggeredAtWorldTime: string;
  /** 调度优先级车道 */
  readonly suggestedLane:
    | "FOREGROUND"
    | "CRITICAL_SOCIAL"
    | "SCHEDULED_PLANNING"
    | "BACKGROUND_SUMMARY";
  /** 预评估的智能细节层级 */
  readonly intelligenceLod: "LOD_I1" | "LOD_I2" | "LOD_I3";
}

/**
 * 2. 观察感知快照契约 (AgentObservationSnapshot)
 */
export interface AgentObservationSnapshot {
  readonly snapshotId: string;
  readonly worldId: string;
  readonly worldTime: string;
  readonly worldSeq: number;

  /** 实体视角自身状态与版本 */
  readonly self: {
    readonly residentId: string;
    readonly actorId: string;
    readonly actorVersion: number; // 关键版本栅栏
    readonly locationId: string;
    readonly balanceCents: number;
    readonly inventory: Readonly<Record<string, number>>;
    readonly needSignals: {
      readonly hunger: number;
      readonly fatigue: number;
    };
    readonly currentRoutineGoal: string;
  };

  /** 受限空间感知 */
  readonly nearby: {
    readonly accessibleLocations: readonly { id: string; name: string }[];
    readonly otherResidents: readonly { residentId: string; name: string }[];
    readonly availableItems: readonly { itemId: string; priceCents: number }[];
  };

  /** 检索召回的记忆与关系 (受限 Top-K) */
  readonly retrievedMind: {
    readonly memories: readonly { id: string; summary: string }[];
    readonly relations: readonly {
      targetResidentId: string;
      affinity: number;
    }[];
    readonly lastActionFeedback?: { actionType: string; reasonCode?: string };
  };
}

/**
 * 3. 认知操作生命周期契约 (AgentOperation)
 */
export interface AgentOperation {
  readonly operationId: string;
  readonly residentId: string;
  readonly worldId: string;
  readonly status:
    | "PENDING"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "TIMED_OUT"
    | "CANCELLED"
    | "STALE"
    | "REJECTED";
  readonly wakeRequestId: string;
  readonly snapshotId: string;
  readonly startedAtWallTime: string;
  readonly timeoutAtWallTime: string;
  readonly completedAtWallTime?: string;
}

/**
 * 4. 模型调用请求抽象 (ModelRequest)
 */
export interface ModelRequest {
  readonly operationId: string;
  readonly capabilityTier:
    | "TIER_1_LIGHT"
    | "TIER_2_STANDARD"
    | "TIER_3_ADVANCED";
  readonly messages: readonly {
    readonly role: "system" | "user";
    readonly content: string;
  }[];
  readonly temperature: number;
  readonly maxTokens: number;
  readonly timeoutMs: number;
}

/**
 * 5. 结构化意图契约 (StructuredIntent)
 */
export interface StructuredIntent {
  readonly intentId: string;
  readonly residentId: string;
  readonly worldId: string;
  /** 关键版本溯源：基于哪个观察状态得出 */
  readonly basedOn: {
    readonly actorVersion: number;
    readonly worldSeq: number;
  };
  readonly actionType: "MOVE" | "EAT" | "SLEEP" | "WORK" | "TALK" | "BUY";
  readonly parameters: Record<string, unknown>;
  readonly confidence: number;
  readonly reasonCategory: string;
  readonly expiresAtWorldTime?: string;
}

/**
 * 6. 操作完成回传载荷 (AgentCompletion)
 */
export interface AgentCompletion {
  readonly operationId: string;
  readonly residentId: string;
  readonly success: boolean;
  readonly producedIntent?: StructuredIntent;
  readonly failureReason?: string;
  readonly tokenUsage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly costUnits: number;
  };
}

/**
 * 7. 内核执行结果闭环契约 (KernelActionOutcome)
 */
export interface KernelActionOutcome {
  readonly requestId: string;
  readonly worldId: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly status:
    | "ACCEPTED"
    | "REJECTED"
    | "CONFLICT"
    | "DUPLICATE"
    | "TIMED_OUT";
  readonly reasonCode?: string;
  readonly committedFacts?: {
    readonly committedEventIds: readonly string[];
    readonly committedWorldSeq: number;
    readonly resultingActorVersion: number;
  };
  readonly traceId: string;
}

/**
 * 8. 认知运维审计日志契约 (AgentTrace)
 */
export interface AgentTrace {
  readonly traceId: string;
  readonly operationId: string;
  readonly worldId: string;
  readonly residentId: string;
  readonly triggerKind: string;
  readonly modelTier: string;
  readonly providerName: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly latencyMs: number;
  readonly status: string;
  readonly intentActionType?: string;
  readonly resultingOutcomeStatus?: string;
  readonly recordedAt: string;
}
```
