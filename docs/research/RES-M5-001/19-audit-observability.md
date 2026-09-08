# 19 - 审计可观测性与思维链隐私隔离 (Audit & Observability Architecture)

## 1. 概念分界线：世界事件账本 vs 认知运行态审计追踪

在「镜界」中，必须严格区分面向不同受众、拥有不同生命周期的两套记录体系：

```mermaid
flowchart TD
    subgraph WorldDomain [客观世界事件账本 (World Event Ledger)]
        direction TB
        E1[(PostgreSQL world_events 表)]
        E2[特性: 永久保存, 绝对单调全序, 用于状态重建与重放]
        E3[内容: 仅记录客观发生的事实, 如 RESIDENT_MOVED, WAGE_PAID]
    end

    subgraph TraceDomain [认知运行态审计追踪 (Agent Operation Trace)]
        direction TB
        T1[(时序/日志库 / ai_traces 表)]
        T2[特性: 滚动生命周期 30~90 天, 异步批量写入, 运维诊断]
        T3[内容: 记录 Prompt 长度, 耗时, Token 消耗, 模型版本, 错误码]
    end

    WorldDomain -.->|绝对物理隔离! 严禁瞬态审计写入核心账本| TraceDomain
```

### 1.1 两大账本核心属性对比

| 评估维度               | 世界事件账本 (`world_events`)             | 认知运行态审计追踪 (`ai_traces`)              |
| :--------------------- | :---------------------------------------- | :-------------------------------------------- |
| **存储载体**           | PostgreSQL 核心主表（强一致性单调全序）   | 分离的专用时序库 / ClickHouse / 异步日志表    |
| **数据性质**           | **客观物理与社会真理（World Facts）**     | **工程运维与成本指标（Operational Metrics）** |
| **写入时机**           | 内核事务提交成功的一瞬间同步追加          | Worker 任务结束时通过缓冲队列异步批量刷盘     |
| **对 Replay 的影响**   | **世界回放的唯一输入源，决定世界状态**    | **回放时完全不参与计算，零重现依赖**          |
| **数据保留周期**       | **宇宙永存（永久保留）**                  | **按策略归档或自动清理（如保留 30 天）**      |
| **是否包含大模型开销** | **绝对禁止包含任何 Token / Latency 字段** | **详尽记录 Token 计数、提供商耗时与费率**     |

---

## 2. 思维链（Chain-of-Thought）隐私与反污染铁律

在以大模型为核心的推理过程中，模型通常会产生冗长的内心思考文本（Thinking Tokens / Chain-of-Thought）。

> **架构最高铁律：严禁将大模型的私有思维链（Chain-of-Thought）持久化至 `world_events` 或 `memories` 表！**

### 2.1 为什么必须封杀原始思维链入库？

1. **防止海量文字垃圾拖垮主库**：一段决策的 CoT 可能长达 1,000~3,000 字，若每次决策都存入 PostgreSQL，一个月内数据库体积将迅速膨胀数十 GB，导致索引碎片化与备份困难。
2. **破坏可审计性与因果确定性**：CoT 中充斥着随机、跳跃、可能自相矛盾的拟人化杂念，不能作为法律级的因果归因凭证。
3. **主观隐私与安全合规**：思考过程中可能暂存未经过滤的敏感词或推理碎片，直接入库存在数据安全隐患。

### 2.2 允许持久化的合法归因结构

系统仅允许提取**结构化因果凭证（Categorical Intent Evidence）**：

- **`reasonCategory`**：标准枚举（如 `NEED_SATISFACTION`、`ESCAPE_CONFLICT`）；
- **`inputRefs`**：本次决策所依赖的关键观察要素 ID 列表（如引用的 `memoryId`、在场的 `targetActorId`）；
- **`decisionSummary`**：面向人类观众公开的 20 字以内高阶行为意图短语（如“打算去买一杯咖啡提神”）。

---

## 3. Agent 运行态可观测性指标规范 (Agent Trace Schema)

用于工程运维诊断与成本监控的专用数据结构如下：

```typescript
/**
 * 认知运行态审计日志规范 (投递至运维分析流，不入世界事件账本)
 */
export interface AgentOperationTrace {
  /** 操作流水唯一标识 */
  readonly traceId: string;
  readonly operationId: string;
  readonly worldId: string;
  readonly residentId: string;

  /** 触发与调度元数据 */
  readonly triggerKind: "SCHEDULE" | "WORLD_EVENT" | "PLAYER_INTERACTION";
  readonly triggerEventId?: string;
  readonly queueLane: string;
  readonly queueWaitTimeMs: number;

  /** 算力与模型开销指标 */
  readonly modelTier: string;
  readonly providerName: string;
  readonly modelIdentifier: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly costUnits: number;
  readonly inferenceLatencyMs: number;

  /** 业务执行与结果状态 */
  readonly operationStatus:
    | "COMPLETED"
    | "FAILED"
    | "TIMED_OUT"
    | "CANCELLED"
    | "STALE"
    | "REJECTED";
  readonly intentActionType?: string;
  readonly resultingRequestId?: string;
  readonly kernelOutcomeStatus?: string;
  readonly kernelReasonCode?: string;

  /** 关键输入版本指纹 (用于排查快照陈旧问题) */
  readonly snapshotActorVersion: number;
  readonly snapshotWorldSeq: number;

  /** 物理记录时间戳 */
  readonly recordedAtWallTime: string;
}
```

### 3.1 核心可观测性监控看板指标（Metrics & Alerts）

通过上述 Trace 数据流，Prometheus / Grafana 建立实时监控大盘：

1. **LOD 算力分布比**：实时统计各车道 QPS 与各 Tier 模型流量占比；
2. **快照冲突率（Stale Conflict Rate）**：监控 `KERNEL_CONFLICT` 占比。若超过 5%，告警提示 Worker 调度延迟过高；
3. **提供商延迟分布（P50 / P95 / P99 Latency）**：实时反映外部大模型网络抖动，超过阈值自动触发降级熔断；
4. **实时 Token 预算消耗曲线**：小时级/天级费用走势与预算告警。
