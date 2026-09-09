# OFFLINE-DIGEST

## What It Is

A **read model** answering: *What happened while I was away?*

## What It Is Not

- Not World Truth
- Not Memory (M4)
- Not required for continuity
- Not safe as a history source of record

Deleting all digests must not change the world. Digest errors cannot rewrite events.

## Pipeline

```text
Committed World History
        ↓
Digest Query (world + time/seq + relevance)
        ↓
Importance Ranking (perspective rules)
        ↓
Structured Digest (machine-readable)
        ↓
Optional LLM Narrative Summary
```

LLM may **narrate** structured digest content. LLM may **not** add uncommitted events or invent missing days.

## Scope Tiers

| Tier | Content | M8 v1 |
| ---- | ------- | ----- |
| Resident personal | My moves, sleep, work, needs highlights | **Yes** |
| First Street important events | High-signal local events | **Yes (simple)** |
| Relationship digest | Friend major events | Later (needs M4) |
| Economy digest | Pay/purchases | Later (needs M6) |
| World news | Global newspaper | **Defer** |

## Ranking Without M4

M4 Relationship is not implemented. M8 v1 uses **structured fallback ranking**:

```text
score =
  w_self * is_about_me
+ w_home_work * involves_my_locations
+ w_type * eventTypeWeight
+ w_recency * recencyDecay
+ w_magnitude * payloadMagnitude
```

No relationship graph required to start. When M4 lands, ranking can add `w_rel * relationshipStrength`.

## Digest Cursor

```text
ProductUserState {
  userId
  worldId
  lastSeenWorldTime
  lastSeenWorldSeq
  lastDigestAt
}
```

Not in Event Ledger. Not a World Fact.

## Structured Digest Shape (research)

```text
ReturnDigest {
  worldId
  fromWorldTime
  toWorldTime
  fromSeq
  toSeq
  worldStatus
  items[] {
    eventId, seq, type, occurredAtWorldTime,
    actorId, summaryKey, payloadRef, rankScore
  }
  residentSnapshot {
    location, activity, needsBand, sourceWorldSeq
  }
  generatedAtWallTime  # audit only
}
```

## Failure Isolation

| Failure | Behavior |
| ------- | -------- |
| LLM down | Structured digest only |
| Ranking error | Fallback chronological list |
| Query timeout | Partial page + cursor |
| Digest store down | Rebuild from events |

## Non-Goals

- Perfect “newspaper”
- Emotional voice as truth
- Digest as replay input
