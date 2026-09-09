# MEMORY-LINEAGE

## 1. 目标

每个 Episodic Memory 至少能回答：

- 来自哪个 World Event？
- 通过什么 Perception（channel/role/confidence）？
- 何时被编码？
- 用哪一版 policy？

## 2. 最小 MemorySourceRef

```ts
type MemorySourceRef =
  | {
      kind: "WORLD_EVENT";
      worldId: string;
      eventId: string;
      eventSeq: string;
      eventType: string;
    }
  | {
      kind: "CONVERSATION_UTTERANCE"; // future M5
      conversationId: string;
      utteranceId: string;
    }
  | {
      kind: "SECOND_HAND_REPORT"; // future
      viaResidentId: string;
      originEventId?: string;
    };
```

## 3. 禁止

- 用一列 `sourceText` 解决所有溯源
- 无 eventId 的“我记得好像…”作为唯一 durable truth
- LLM prose 覆盖 lineage

## 4. 与 Observation persistence 的关系

若采用推荐策略 C：

- 成功编码的 memory 保留 compact perception envelope / source refs
- 被丢弃的 perception 可 ephemeral
- 这样 lineage 可审计，又不把所有噪音入库

## 5. Replay 含义

- Historical Cognitive Replay：需要 durable encoding decisions 或足够 lineage。
- Re-derived Projection：可用 world events + pinned policies 重推，但可能与历史真实记忆不完全一致。

二者不可混称“可重放记忆”。
