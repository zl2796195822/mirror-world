# CURRENT-WORLD-AUDIT

Audit of the formal Mirror World system at baseline `b3229ae`. This is the substrate M8 must stand on — not replace.

## 1. Package Map

| Package | Role |
| ------- | ---- |
| `@mirror/db` | Drizzle schema, migrations, seed, fixture |
| `@mirror/contracts` | Zod contracts: Action, Outcome, Observation, Runtime State, Replan |
| `@mirror/world-kernel` | Only world-fact write authority: clock, events, actions, outcomes, replay, checkpoint, runtime |
| `@mirror/life-engine` | Pure evaluators: Needs, Goals, Observation adapter, Replan policy |
| `apps/api` | Fastify skeleton + world clock admin routes |
| `apps/web` | Product shell; no world-fact writes |

## 2. Three Clocks (already separated)

| Clock | Meaning | Authority |
| ----- | ------- | --------- |
| Wall Clock | Real time (`now` passed explicitly) | Caller / ops |
| World Time | In-world time fact (`worlds.world_time`) | World Kernel only |
| Event Time | `world_events.occurred_at` = World Time at commit | World Kernel, same transaction |

**Not yet defined as a formal fourth clock:** Offline Elapsed Time (research in `WORLD-TIME-POLICY.md`).

### World Clock implementation facts

- File: `packages/world-kernel/src/world-clock.ts`
- Status: `RUNNING | PAUSED | MAINTENANCE`
- Scale: `1 | 10 | 100` (dev); production forced `1`
- Anchor: `clock_anchor_at` (wall clock of last sync)
- `PAUSED`/`MAINTENANCE` do **not** advance World Time; they re-anchor wall clock so resume does not retro-advance the pause window
- Wall-clock rollback: `Math.max(now, clockAnchorAt)` keeps monotonicity
- `Date.now()` / `Math.random()` not used in core path; `now` is explicit input

## 3. Durable Truth vs Derived

### Durable Truth (PostgreSQL)

| Table | Truth |
| ----- | ----- |
| `worlds` | world identity, seed, status, timeScale, worldTime, clockAnchorAt, worldSeq |
| `world_events` | append-only causal history, world-local `seq` |
| `action_requests` | durable request metadata + idempotency |
| `kernel_action_outcomes` | COMMITTED / REJECTED / CONFLICT |
| `kernel_action_outcome_events` | 0/1/N event association |
| `resident_runtime_states` | location, activity lifecycle, due times, stateVersion, sourceWorldSeq |
| `simulation_checkpoints` | **rebuildable acceleration**, not truth |

### Derived / Lazy (not durable truth)

- Needs (`HungerPressure`, `RestPressure`, `SocialPressure`) — World-Time lazy evaluation
- `EnergyLevel`, `conditionBand` — projections
- Work obligation — derived from employment fixture + World Time + fixed UTC schedule
- Goals — pure evaluator output
- Digest / narrative summary — read models

## 4. Event Ledger Contract (M2-T04)

- `world_events`: `(world_id, seq)` unique; append-only via DB triggers
- `worlds.world_seq` advances by exactly 1 per event in the same transaction
- State mutation + event append are atomic (`commitWorldStateWithEventInTransaction`)
- Deferred constraint: `world_seq = max(event.seq)` at transaction end
- Event `occurred_at` uses **World Time**, never wall clock substitute
- Payload must carry positive integer `schemaVersion`

Registered event types include (forward-looking registry, not all implemented):

`WORLD_TIME_ADVANCED`, `RESIDENT_MOVED`, `RESIDENT_MOVE_STARTED`, `RESIDENT_MOVE_COMPLETED`, `RESIDENT_SLEEP_STARTED`, `RESIDENT_SLEEP_COMPLETED`, `NEED_CHANGED`, `WORK_SHIFT_COMPLETED`, `WAGE_PAID`, `RENT_PAID`, `PURCHASE_COMPLETED`, `CONVERSATION_COMPLETED`, `RELATIONSHIP_CHANGED`, `MEMORY_CREATED`, `GOAL_CHANGED`, `EMPLOYMENT_CHANGED`, `PROXY_ACTION_DECIDED`, `WORLD_DIGEST_CREATED`

## 5. Checkpoint & Replay (M2-T05)

- Checkpoint = optional recovery/acceleration artifact at a `world_seq`
- Truth remains `seed + ordered world_events`
- Canonical hash: stable SHA-256 of history representation; no UUID/`created_at`/wall clock/LLM/Redis
- Suffix replay from checkpoint supported
- Checkpoint must match world/schema/seq/snapshot/checksum
- Replay does **not** re-execute ActionRequests

## 6. Action Pipeline (M2-T03 → PRE-AL-06)

```
ActionRequest
  → validator (actor, world status, time, version, location, resources)
  → Kernel execute (transaction)
  → KernelActionOutcome (COMMITTED | REJECTED | CONFLICT)
  → 0/1/N World Events (same transaction)
```

### Idempotency

- `(world_id, idempotency_key)` unique
- Same fingerprint → REUSED outcome
- Different fingerprint, same key → IDEMPOTENCY_CONFLICT
- Timeout ≠ rejected; reconciliation required

### Action Semantics (PRE-AL-05, `m3-action-semantics-v1`)

- Lifecycle: `STARTED → COMPLETED`
- MOVE: travel duration by location-kind matrix (5–15 world minutes); location switches only at completion
- SLEEP: HOME only; fixed 480 world minutes
- Runtime activity: `IDLE | TRAVELING | SLEEPING` with `activityDueAtWorldTime`
- Completion is a separate Kernel command; `NOT_DUE` if early

### Replan (PRE-AL-06, `m3-replan-v1`)

- Pure policy: SUCCESS / STOP / REOBSERVE_NOW / REPLAN_NOW / RETRY_SAME_REQUEST / DEFER_UNTIL_WORLD_TIME
- Budgets: submission ≤2, conflict recovery ≤2, replans ≤2
- World-Time defer: 2,4,8,16,32 then cap 60 minutes
- Fail-closed on permanent invalid, auth, world not running, idempotency conflict, internal, unknown
- Policy decisions are **not** World Facts (no worldSeq, no Event Ledger)

## 7. Resident Runtime State (PRE-AL-04/05)

- Durable per `(world_id, resident_id)`
- Fields: `currentLocationId`, `currentActivity`, activity instance/target/start/due, `stateVersion`, `sourceWorldSeq`, `runtimePolicyVersion`
- DB check constraints enforce activity shape consistency
- Bootstrap is idempotent; does not overwrite existing runtime

## 8. Observation (PRE-AL-02/03/04)

- World-scoped, resident-scoped, read-only
- Carries `sourceWorldSeq`
- Capabilities: actorRef AVAILABLE, resources AVAILABLE, location/activity/workObligation AVAILABLE after PRE-AL-04
- Life Engine depends only on Observation port — no DB/SQL/Event Ledger direct access

## 9. Needs (M3-T02, `m3-needs-v1`)

- CORE: `HungerPressure`, `RestPressure`, `SocialPressure` (0=satisfied … 100=critical)
- Lazy World-Time evaluation from anchor + rates + seed variation + profile
- PAUSED/MAINTENANCE do not advance Needs
- No per-minute persistence of Need values; rebuildable from anchor + policy + events

## 10. What Does **Not** Exist Yet

| Capability | Status |
| ---------- | ------ |
| PRE-AL-07 Scheduler / Simulation Driver | PENDING_PRE_AL_07 |
| Background worker | Not implemented |
| Production queue | Not implemented |
| Offline catch-up planner | Not implemented |
| Wake index / due-work index | Not implemented |
| Continuous presentation loop | Not implemented |
| Multi-resident autonomous loop | Not implemented |
| Memory / Relationship runtime | Research only (M4) |
| Agent Runtime / LLM integration | Research only (M5) |
| Economy durable authority | Research only (M6) |
| 3D renderer production | Experimental (M7) |

## 11. Implications for M8

1. M8 **must** reuse Kernel truth, Event Ledger, Checkpoint, Replay, World Clock, ActionOutcome, Runtime State.
2. M8 **must not** create a second clock authority, second event stream, or second checkpoint system.
3. Catch-up is a planner over due work + World Time advance authority — not a new simulator.
4. Scheduler queue is disposable; PostgreSQL is rebuildable source.
5. Needs lazy evaluation already supports event-jump: compute next threshold crossing instead of ticking every minute.
6. Activity `dueAtWorldTime` already gives earliest meaningful completion boundary.
7. PRE-AL-07 will define the serial deterministic driver; M8 extends it for offline/long-horizon, not replace it.

## 12. Gaps That M8 Research Must Design (Not Implement)

- World Time Policy modes beyond RUNNING/PAUSED/MAINTENANCE (research)
- Infrastructure downtime vs intentional pause distinction
- Offline Elapsed Time → Target World Time mapping
- Event-jump catch-up planner
- Wake index rebuild after queue loss
- Crash recovery mid-catch-up
- World Lag / Freshness product contract
- Return digest read model
- Catch-up determinism / equivalence verification
- Population scaling model
- Dormancy contract
- Ledger growth / checkpoint evolution for multi-year runs
