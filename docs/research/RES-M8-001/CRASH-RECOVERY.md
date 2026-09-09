# CRASH-RECOVERY

## Crash Cases

| Case | Moment | Risk |
| ---- | ------ | ---- |
| **A** | Before Kernel commit | No world effect; safe retry |
| **B** | Mid Kernel transaction | Full rollback; no partial events |
| **C** | After Kernel commit, before scheduler ack | Effect exists; scheduler may re-deliver |
| **D** | After dequeue, before execute | Work not done; must re-deliver |
| **E** | Mid offline catch-up | Partial progress; resume from last commit |

## Case A — Before Commit

**State:** ActionRequest may or may not be recorded; no outcome; no events.

**Recovery:**

- If request row absent: safe to resubmit with same idempotency key (or new decision cycle).
- If request row present, no outcome: treat as unfinished; either complete via executor or replan.

**World effect:** none.

## Case B — Mid Transaction

PostgreSQL atomicity:

- Event insert + `world_seq` bump + runtime update + outcome insert **all or nothing**.
- DB triggers reject inconsistent `world_seq` without matching event.

**Recovery:** retry whole command; no partial MOVE completion.

## Case C — Commit Done, Ack Lost

**State:** Outcome `COMMITTED`, events exist, runtime updated. Scheduler never recorded success.

**Recovery:**

1. Reconciliation by `(worldId, idempotencyKey)` / requestId → find outcome → `REUSED`.
2. Completion path: if already IDLE and events > 1 → completion `REUSED`.
3. Never re-execute same start; never duplicate `RESIDENT_*_COMPLETED`.

Aligned with PRE-AL-01/06: timeout ≠ failure; reconciliation required.

## Case D — Dequeued, Not Executed

**State:** Work removed from queue (or process died holding it); durable state unchanged.

**Recovery:**

- Queue is not truth → rebuild wake index from runtime due times.
- Redeliver `completeResidentAction` / decision cycle.
- If another instance already completed, idempotency absorbs it.

## Case E — Mid Catch-up

**State:** World Time advanced partway; some activities completed; some not.

**Recovery:**

1. Load `worlds.worldTime` / `worldSeq` / status.
2. Recompute `targetWorldTime` from policy + wall now.
3. Rebuild due work for remaining span.
4. Continue event-jump from current durable point.

Do **not** restart from genesis. Do **not** roll back committed events.

## Domain-Specific Duplicate Guards

| Action | Guard |
| ------ | ----- |
| MOVE start | Requires `IDLE`; one in-flight activity |
| MOVE complete | `activityInstanceId` match; completion REUSED if done |
| SLEEP start/complete | Same as MOVE |
| Future payroll | Deterministic system idempotency key per shift/period |
| Future rent | Same |

## worldSeq Integrity

Corruption classes:

| Symptom | Severity |
| ------- | -------- |
| Gap in seq | World-fatal (stop catch-up; ops) |
| `world_seq` ≠ max(event.seq) | World-fatal (DB trigger should prevent) |
| Checksum mismatch on checkpoint | Recoverable (drop checkpoint; full replay) |
| Resident action permanent reject loop | Resident-scoped isolate |

See `FAILURE-ISOLATION-MATRIX.md`.

## Process Restart Checklist (short)

1. Load world row
2. Verify ledger continuity
3. Optionally load checkpoint (validate checksum)
4. Rebuild projections / wake index
5. Compute lag / target
6. Catch up if needed (case E)
7. Enter ACTIVE/BACKGROUND

Full flow: `WORLD-BOOT-RECOVERY.md`.

## What We Explicitly Do Not Pursue

- Distributed exactly-once message bus as correctness root
- Two-phase commit across Redis + PostgreSQL as truth
- Scheduler-side “exactly once” without Kernel idempotency
