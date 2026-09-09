# HISTORICAL-QUERY

## Product Question

> “我离开的这段时间发生了什么？”

Must be answered from **committed history**, not live invention.

## Query Dimensions

| Dimension | Use |
| --------- | --- |
| `worldSeq` range | Replay / audit slices |
| World Time range | “While I was away” |
| `actorId` | Resident personal history |
| `locationId` | Street/venue history (needs event location payload — future) |
| `event type` | Filter moves/sleeps/work/social |
| Relationship pair (future M4) | A↔B interactions |

## Index Proposal (research — no migration here)

```text
world_events (world_id, seq)                    -- existing PK/unique
world_events (world_id, occurred_at, seq)       -- time range
world_events (world_id, type, seq)              -- type filter
world_events (world_id, actor_id, seq)          -- actor history
world_events (world_id, target_id, seq)         -- optional
```

Digest path should avoid full table scans: always constrain `world_id` + time/seq range.

## Importance Is Not a World Fact

Do **not** stamp `importance=0.8` as durable truth on events.

Importance is perspective-dependent:

| Perspective | Example |
| ----------- | ------- |
| Digest ranking | Friend’s major event > stranger’s minor event |
| Memory salience (M4) | Resident-specific |
| Observer relevance | Location / subscription |

Event row records **facts only**. Ranking lives in digest/memory projections.

## Digest Query Sketch

```text
1. cursor = product.lastSeenWorldTime | lastDigestSeq  (product state)
2. select events where world_id=W and occurred_at > cursor
3. filter relevance (actor, relationships, home/work, subscriptions)
4. rank (structured rules; optional LLM narrative later)
5. emit structured digest
6. advance product cursor (not a World Fact)
```

## Performance Rules

1. Never `SELECT * FROM world_events` unbounded.
2. Paginate by seq.
3. Use projection tables only if they are rebuildable caches.
4. Deleting digest must not delete events.

## Replay Coupling

Historical query is **read**. Replay verification uses the same events. A query bug cannot rewrite history; a ranking bug cannot change canonical hashes.

## Future Location Column Gap

P1 gap from M4 research: `world_events` may lack first-class location. Digest “what happened on First Street” may need payload extraction or future schema. M8 v1 personal digest can start with actor/time/type without location authority.
