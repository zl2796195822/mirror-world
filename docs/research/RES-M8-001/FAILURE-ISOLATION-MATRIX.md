# FAILURE-ISOLATION-MATRIX

## Goal

One resident bug must not permanently stop the world. True world integrity breaks must stop catch-up loudly.

## Severity Classes

| Class | Scope | World continues? | Example |
| ----- | ----- | ---------------- | ------- |
| **R** Resident-scoped | One resident cycle | Yes, others proceed | Permanent invalid action after replan budget |
| **W** World-fatal | Whole world | **No** — halt catch-up/driver | `world_seq` gap, ledger corruption |
| **O** Operational | Infra/ops | Degraded | Provider down (ignored for continuity), DB briefly unavailable |
| **P** Product-state | UX layer | Yes | Digest generation failure |

## Matrix

| Failure | Class | Isolation | Catch-up behavior |
| ------- | ----- | --------- | ----------------- |
| MOVE rejected permanent invalid | R | Stop that cycle; mark needs re-observe later or idle | Continue others |
| SLEEP not at HOME | R | Reject; replan | Continue |
| Replan budget exhausted | R | STOP for epoch; schedule later reconsideration | Continue |
| Repeated CONFLICT | R | REOBSERVE bounded; then STOP | Continue |
| IDEMPOTENCY_CONFLICT | R/O | STOP cycle; do not mint new key | Continue |
| Executor internal error | R | STOP cycle; alert | Continue |
| `WORLD_NOT_RUNNING` during completion | O | Reject completion; retry after resume | Pause domain processing |
| Activity due missing metadata | R | Isolate resident; repair from ledger if possible | Continue |
| `world_seq` gap / missing event | **W** | Halt world | **Stop** |
| `world_seq` ≠ max(event.seq) | **W** | Halt (DB should prevent) | **Stop** |
| Checkpoint checksum mismatch | O | Drop checkpoint; full verify | Continue if ledger OK |
| Runtime `stateVersion` anomaly | R/W | If single resident: isolate; if systemic: halt | Depends |
| LLM provider down | O | I0/I1 baseline | Continue (required) |
| Redis down | O | Single-process driver fallback / fail lease | Durable state still source |
| Digest/LLM summary fail | P | Show structured digest only | Continue |

## Poison Resident

Definition: a resident whose decision cycle repeatedly fails in a way that would livelock a naive scheduler.

Controls:

1. `m3-replan-v1` budgets (max 2/2/2 per cycle)
2. Terminal STOP does not enqueue infinite retry
3. Next wake uses World-Time defer or later reconsideration — not hot loop
4. Metrics flag high-failure residents for ops/debug
5. Never delete the resident to “fix” the world

## World-Fatal Response Protocol (research)

1. Stop driver / catch-up for that `worldId`
2. Preserve all durable rows; do not auto-repair history
3. Emit ops alert with first divergent `worldSeq` / resident
4. Human/ADR-driven repair; never LLM-patched events

## Catch-up Specific

During catch-up:

- Resident STOP → skip to next due candidate
- World-fatal → abort catch-up chunk; lag remains; status may enter DEGRADED
- Never “best effort rewrite” events to finish the 30-day jump

## Relationship to PRE-AL-06

Catch-up **must use** `m3-replan-v1`. It must not invent unbounded retry loops in the planner.
