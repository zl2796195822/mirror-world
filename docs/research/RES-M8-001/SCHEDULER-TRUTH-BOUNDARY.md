# SCHEDULER-TRUTH-BOUNDARY

## Hard Invariant

> Scheduler is not Truth.  
> Queue is not Truth.  
> Redis is not Truth.  
> In-memory wake index is not Truth.

If the entire scheduler queue is lost, the system **must** recover due work from PostgreSQL durable world state.

## What Is Truth

| Artifact | Truth? |
| -------- | ------ |
| `worlds` (time, status, seq, seed) | Yes |
| `world_events` | Yes |
| `resident_runtime_states` (location, activity, due) | Yes |
| `action_requests` + `kernel_action_outcomes` | Yes |
| Future durable economic journal/inventory (M6) | Yes when implemented |
| Checkpoint | No — rebuildable |
| Wake index / due queue | No — rebuildable |
| Redis lease/queue/cache | No |
| Decision traces / replan directives | No (orchestration, not facts) |
| Digest / narrative | No |

## Delivery Semantics

```text
Scheduler delivery:     at-least-once
World effect via Kernel: effectively-once
```

Mechanisms already in place:

- `(worldId, idempotencyKey)` uniqueness
- Request fingerprint → REUSED
- One durable outcome per ActionRequest
- Completion idempotent when already completed (`REUSED`)
- `stateVersion` CAS on runtime

Do **not** assume distributed exactly-once messaging as a foundation.

## Scheduler May

- Observe durable state
- Compute due order
- Call Kernel APIs (`syncWorldClock`, `executeResidentActionRequest`, `completeResidentAction`, future decision submits)
- Hold disposable memory structures
- Use Redis for multi-instance lease (cache-grade)

## Scheduler Must Not

- Write `world_events` directly
- Write `resident_runtime_states` directly
- Advance `worlds.world_time` without Kernel clock path
- Complete activities by mutating rows outside Kernel transaction
- Own Need values as facts
- Survive only in queue memory as the sole record of due work

## Crash Classes (summary)

See `CRASH-RECOVERY.md` for A–E detail. Principle:

Every crash class recovers by:

1. Durable outcome lookup (idempotency)
2. Runtime state truth
3. Event Ledger continuity (`world_seq`)
4. Wake index rebuild

## Multi-Instance

If multiple driver instances exist later:

- One active driver lease per `worldId` (Redis or DB advisory — ops choice)
- Lease loss → stop; another instance rebuilds from durable state
- Never two writers committing conflicting completions for the same activity instance without Kernel conflict detection

## PRE-AL-07 Alignment

RES-M3-003 `FOR_PRE_AL_07.md` already requires:

- Explicit World-Time simulation driver
- Not TestKernel
- No own seq allocation
- No direct runtime/resource writes
- Pause/lease/fence
- Deterministic due key

M8 inherits that boundary. Offline catch-up is a driver mode (`runUntil(target)`), not a second authority.

## Test Obligation (future Gate)

**Queue-loss test:**

1. Run world to some state with in-flight due work
2. Destroy scheduler queue / Redis / process
3. Restart
4. Rebuild wake index
5. Complete catch-up
6. Assert: no duplicate completions; same canonical state as uninterrupted run (under determinism assumptions)
