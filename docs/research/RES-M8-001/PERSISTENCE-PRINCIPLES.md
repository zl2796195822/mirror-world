# PERSISTENCE-PRINCIPLES

Hard principles for 镜界 as a Second Human World. These override convenience architectures.

## P1. Persistent ≠ Always Computing

**Formal recommendation: YES.**

A resident can exist without:

- An Agent Runtime process
- A renderer
- A WebSocket
- An LLM session
- A per-second tick

Existence = durable identity + durable state + durable relationships + durable history + reconstructible Needs/schedule.

Compute is a **level-of-detail choice**, not an existence proof.

## P2. World Exists Before the User Enters

Bootstrap is not "user login starts the simulation."

World:

- Has a seed
- Has a World Clock
- Has residents with homes/jobs
- Has committed history (possibly empty at genesis)
- Can be mid-life when no human is connected

## P3. USER OFFLINE ≠ WORLD PAUSED

| Situation | World Time | Meaning |
| --------- | ---------- | ------- |
| User offline, world `RUNNING` | Advances per World Time Policy | Normal life continues |
| World `PAUSED` | Does not advance | Intentional stop |
| World `MAINTENANCE` | Per policy | Controlled ops state |
| Infrastructure down | Policy-driven (`DOWNTIME-POLICY.md`) | Not auto-pause |

Offline user does **not** freeze residents, needs, work shifts, or scheduled activities — as long as World Time advances.

## P4. PostgreSQL Is Durable Truth

Inherited from AGENTS.md / ADR-0002/0005.

- `worlds`, `world_events`, runtime states, outcomes, action requests = truth
- Redis / queues / in-memory scheduler = disposable
- Checkpoints = rebuildable acceleration
- Digests / projections = rebuildable reads

## P5. World Kernel Is the Only World-Fact Write Entry

M8 catch-up, scheduler, and recovery **must** commit through Kernel paths:

- Advance World Time via World Clock + `WORLD_TIME_ADVANCED`
- Complete activities via existing completion commands
- Submit actions via ActionRequest + idempotency
- Never write `world_events` or `resident_runtime_states` outside Kernel transactions

## P6. LLM Never Creates History

Forbidden:

> LLM: "I'll invent 30 days of story and write World Events."

History = committed Kernel events only.

LLM may:

- Summarize already-committed history (digest narrative)
- Propose intents/candidates in future Agent Runtime (M5)

LLM must not:

- Fill time holes
- Advance World Time
- Complete activities
- Mutate Needs as facts

## P7. No Global Per-Second Full-Population Tick

Forbidden long-term pattern:

```ts
setInterval(() => {
  for (const resident of allResidents) tick(resident);
}, 1000);
```

Acceptable for 30 residents as a temporary harness. Unacceptable as the architecture for 10k–100k.

Required pattern: **due / wake / event-jump driven**.

## P8. Catch-Up Is Event-Jump, Not Minute-Walk

Forbidden:

```
for each minute in 30 days:
  for each resident:
    tick()
```

Required:

```
T → next meaningful boundary → commit → repeat until target
```

Meaningful boundaries: activity due, need threshold crossing, work shift edge, scheduled obligation, deferred replan due.

## P9. Short Transactions, Not Mega-Commit Catch-Up

Forbidden:

```
BEGIN;
  simulate 30 days;
COMMIT;
```

Required: many small deterministic Kernel commits. Crash mid-catch-up resumes from last committed point.

## P10. Single Continuous History (No Timeline Fork in M8 v1)

- One World Time
- One causal Event Ledger
- No multi-timeline, no branch universe, no rollback UX in M8 v1
- Multi-world is world-scoped isolation, not forked timelines of one world

## P11. Deterministic Ordering Is Inherited

Any simultaneous due work must order stably:

```
dueWorldTime → priority class → residentId
```

Exact final order is `PENDING_PRE_AL_07`. M8 inherits, does not reinvent.

## P12. At-Least-Once Delivery + Effectively-Once World Effect

- Scheduler may deliver work more than once
- Kernel + idempotency + outcome uniqueness make world effect effectively once
- Do **not** assume distributed exactly-once messaging

## P13. Scheduler Queue Is Not Truth

Hard invariant:

Losing the entire scheduler queue / Redis / in-memory wake index must be recoverable by rebuilding due work from PostgreSQL durable state.

## P14. Product Presence ≠ Resident Presence

| Fact type | World Fact? |
| --------- | ----------- |
| User opens web app | No |
| Tab focus / scroll | No |
| Human resident embodied MOVE in world | Yes (ActionRequest → Kernel) |
| Digest viewed | No (product session state) |

`lastSeen` for digest cursor is product/user state, not a World Fact. Do not emit `USER_VIEWED_WORLD` events.

## P15. One World Clock Per World

- Multiple human users share one World Time
- Online population never determines whether facts exist
- Online population may affect presentation load only

## P16. World Ownership Is World-Scoped

Each world has its own:

- `worldTime`, status, policy mode
- Catch-up status
- Checkpoint, wake index, digest cursors

No global scheduler cursor mixing all World Truths.

## P17. Checkpoint ≠ Truth Replacement

Checkpoint accelerates recovery. Deleting all checkpoints must still allow:

`seed + full event history → canonical state`

Never reduce the world to a mutable snapshot that cannot be verified against history.

## P18. History ≠ Chat Log ≠ Memory ≠ Digest

| Layer | Nature |
| ----- | ------ |
| History | Committed causal World Events + durable state evolution |
| Memory | Resident subjective projection (future M4) |
| Digest | User-facing read model / summary |
| Chat log | Product communication artifact |

Digest deletion does not affect Truth. Digest errors cannot rewrite Truth.

## P19. LLM Provider Outage Must Not Stop Continuity

Hard condition for M8:

If all LLM providers are down, the world can still:

- Advance World Time
- Complete scheduled activities
- Commit deterministic resident decisions (rule/cognition I0/I1)
- Catch up after restart
- Produce structured (non-narrative) digests

## P20. Research Cannot Promote Itself to Formal Scope

Authority order (ADR-0007):

不可破坏边界 & Accepted ADRs > milestone task/DoD > formal specs > verification facts > RES-* research.

This document is RES-M8-001. Formal M8 requires a later Compatibility Review + ADR + formal tasks.
