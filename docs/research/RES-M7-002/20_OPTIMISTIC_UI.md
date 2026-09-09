# 20 Optimistic UI

## Three layers

| Layer                         | Meaning                                  | Durability           | Allowed?        |
| ----------------------------- | ---------------------------------------- | -------------------- | --------------- |
| Visual anticipation           | short local cue before/while intent sent | none                 | YES, bounded    |
| Optimistic UI state           | client pretends action succeeded         | none, must reconcile | CONDITIONAL     |
| Authoritative committed state | Kernel COMMITTED projection              | durable truth        | source of truth |

## Recommendation for important world actions

For embodied MOVE / SLEEP / BUY / identity-affecting actions:

- **No long-lived fake success.**
- Visual anticipation OK (button press, small lean, path preview).
- If optimistic avatar start-walk is used, it must be clearly provisional and roll back on REJECTED/CONFLICT.
- Committed projection always wins.

## Example: “进入咖啡店”

### Safe anticipation

1. User clicks enter
2. UI shows intent pending
3. Optional camera pre-move or highlight
4. ActionRequest submitted
5. On COMMITTED STARTED: begin walk animation from TRAVELING intent
6. On COMPLETED: interior/arrival presentation

### Unsafe optimistic

1. Immediately set location=cafe in local authoritative store
2. Hide pending state
3. Kernel rejects (world paused / invalid location / conflict)
4. UI forgets to roll back
5. User believes world changed when it did not

## Rollback rules

- store `lastCommittedProjection` and `pendingIntents`
- pending visuals are keyed by `activityInstanceId` / requestId
- on REJECTED/CONFLICT: remove pending visual, restore committed
- on timeout: mark unknown, resync snapshot; do not keep success

## Where optimism is fine

- camera smoothing
- hover highlights
- local LOD prefetch
- non-world UI (filter panels, map pan)
- cosmetic emotes that are not world actions (if product allows pure client cosmetics)

## Where optimism is dangerous

- location change
- money/inventory
- relationship/memory
- identity/proxy status
- anything later shown in history timeline

## Gate

Inject forced REJECTED MOVE and verify:

- no permanent scene divergence
- history contains no fake event
- next snapshot converges
