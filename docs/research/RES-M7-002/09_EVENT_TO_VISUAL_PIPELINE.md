# 09 Event → Visual Pipeline

## Principle

Not every Event Ledger event is user-visible. Not every event should be broadcast to every client.

```text
Committed World Event
  → Projection fold
  → (optional) Projection delta
  → AOI / interest filter
  → Client representation
```

## Event visibility policy (v1 proposal)

| Event type                       | Scene change                        | UI marker                   | Animation        | Timeline                           | Broadcast       |
| -------------------------------- | ----------------------------------- | --------------------------- | ---------------- | ---------------------------------- | --------------- |
| `WORLD_TIME_ADVANCED`            | lighting/time HUD (coalesced)       | no                          | no               | no (except major boundaries later) | header only     |
| `RESIDENT_MOVE_STARTED`          | start walk intent                   | no                          | walk start       | optional                           | AOI residents   |
| `RESIDENT_MOVE_COMPLETED`        | location commit                     | no                          | arrive/idle      | optional                           | AOI             |
| `RESIDENT_SLEEP_STARTED`         | sleep pose                          | no                          | sleep            | optional                           | AOI             |
| `RESIDENT_SLEEP_COMPLETED`       | wake/idle                           | no                          | wake             | optional                           | AOI             |
| Future `PURCHASE_COMPLETED`      | bag/prop optional                   | store toast if user related | optional         | yes if authorized                  | actor + related |
| Future `CONVERSATION_COMPLETED`  | optional talk anim already finished | no                          | already happened | yes                                | participants    |
| Future `NEED_CHANGED`            | usually none                        | no                          | no               | no                                 | none by default |
| Future `GOAL_CHANGED`            | none                                | debug only                  | no               | no                                 | none            |
| Future `MEMORY_CREATED`          | none                                | no                          | no               | private/pending M4                 | none            |
| Future `RELATIONSHIP_CHANGED`    | none                                | no                          | no               | pending M4 privacy                 | none            |
| Future `WAGE_PAID` / `RENT_PAID` | none                                | optional finance UI later   | no               | economy UI                         | actor           |
| Future `PROXY_ACTION_DECIDED`    | maybe action already projected      | honesty label               | maybe            | yes                                | pending M9      |
| Future `WORLD_DIGEST_CREATED`    | none                                | digest UI                   | no               | product feed                       | M8              |

## Hard rules

1. **Do not broadcast raw Event Ledger to all clients.**
2. Domain fact events are not animation scripts.
3. Animation is a reaction to projected state, not a second event stream of truth.
4. High-frequency/low-value events (clock ticks, need pressure) must not spam sockets.
5. Privacy-sensitive future events need redaction policy before any UI.

## Pipeline stages

### 1. Committed event

Kernel transaction committed; `world_seq` advanced.

### 2. Projection fold

Update projection read model:

- resident activity/location
- world header time
- optional place aggregates later

### 3. Delta emission

Emit compact projection deltas with seq range.

### 4. Interest filter

AOI / role / self-related filters.

### 5. Client apply

Update scene state machine; spawn/move UI markers if allowed.

## Anti-patterns

- Sending `world_events.payload` blobs directly to browser as the protocol
- Triggering animations solely from untrusted client timers with no state check
- Showing every ledger event on the street as floating text
- Using rejected outcomes as world changes

## Example client event handler (conceptual)

```ts
onProjectionDelta(delta) {
  if (gapDetected(cursor, delta)) return resync();
  for (const r of delta.residentUpserts) {
    scene.upsertResidentProjection(r); // updates logical + presentation intent
  }
  worldHeader.apply(delta.header);
}
```

No direct DB access. No local authority override.
