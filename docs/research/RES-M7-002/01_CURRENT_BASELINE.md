# 01 Current Baseline (CURRENT MAIN FACTS)

- Baseline SHA: `b3229aef5b820fc261443c7f6d8a50f9c3b473c6`
- Source of truth: this worktree at `origin/main`
- Classification rule: only items verified in main source/schema/ADR are CURRENT FACT

## Repository layout (main)

```text
apps/
  api/          Fastify health/ready/worlds
  web/          Next.js product shell (M1-T01..T03), no Kernel write path
packages/
  contracts/    Zod contracts (Action, Outcome, Observation, Runtime State, Replan, Bridges)
  db/           Drizzle schema + seed + resident seed fixture
  life-engine/  Pure Needs/Goals/Replan evaluators (no DB)
  world-kernel/ Clock, validator, events store, outcomes, runtime authority, replay, checkpoint
docs/
  adr/ verification/ architecture/ third-party/
```

No `docs/research/` in main. No formal realtime/WebSocket/3D package in main.

## Worlds authority

File: `packages/db/src/schema.ts` (`worlds`)

CURRENT FACT fields:

- `id`, `name`, `timezone` (default Asia/Shanghai)
- `timeScale` ∈ {1,10,100}
- `status` ∈ {RUNNING, PAUSED, MAINTENANCE}
- `seed`
- `worldSeq` (bigint ≥ 0)
- `worldTime` (timestamptz)
- `clockAnchorAt`
- `createdAt`, `updatedAt`

World Clock (`packages/world-kernel/src/world-clock.ts`):

- Scales 1/10/100; production forced to 1
- `advanceWorldClock` uses wall-clock anchor + elapsed × scale
- Non-RUNNING does not advance worldTime
- Production control path fail-closed

## Event Ledger

File: `packages/world-kernel/src/world-events-store.ts` + `world_events` table

CURRENT FACT:

- Append-only `world_events`
- World-local `seq` unique per world
- `type`, `actorId`, `targetId`, `payload`, `occurredAt`, `correlationId`
- State + event committed in same Kernel transaction path
- `worlds.world_seq` advances with commits

Registered event types (source constant `WORLD_EVENT_TYPES`):

- Present / used in current lifecycle: `WORLD_TIME_ADVANCED`, `RESIDENT_MOVE_STARTED`, `RESIDENT_MOVE_COMPLETED`, `RESIDENT_SLEEP_STARTED`, `RESIDENT_SLEEP_COMPLETED`
- Also registered for future domains: `RESIDENT_MOVED`, `NEED_CHANGED`, `WORK_SHIFT_COMPLETED`, `WAGE_PAID`, `RENT_PAID`, `PURCHASE_COMPLETED`, `CONVERSATION_COMPLETED`, `RELATIONSHIP_CHANGED`, `MEMORY_CREATED`, `GOAL_CHANGED`, `EMPLOYMENT_CHANGED`, `PROXY_ACTION_DECIDED`, `WORLD_DIGEST_CREATED`

Note: future domain types being registered does **not** mean producers exist. Projection must not assume all types are live.

## ActionRequest / KernelActionOutcome

Files:

- `packages/contracts/src/action-contract.ts`
- `packages/contracts/src/action-outcome-contract.ts`
- `action_requests`, `kernel_action_outcomes`, `kernel_action_outcome_events`

CURRENT FACT Action types: `MOVE | EAT | SLEEP | WORK | TALK | BUY`

`requestedBy`: `HUMAN | RULE | AI | PROXY`

MOVE payload: `{ destinationId }`  
SLEEP payload: `{}`

Outcome durable status: only `COMMITTED | REJECTED | CONFLICT`

- COMMITTED: `eventCount ≥ 1`, ordered contiguous `worldSeqStart..worldSeqEnd`
- REJECTED/CONFLICT: zero events, no seq advance

Reason codes (rejection): `KERNEL_INVALID_ACTION`, `KERNEL_ACTOR_NOT_FOUND`, `KERNEL_PERMISSION_DENIED`, `KERNEL_INVALID_LOCATION`, `KERNEL_INSUFFICIENT_FUNDS`, `KERNEL_INSUFFICIENT_RESOURCE`, `WORLD_NOT_RUNNING`  
Conflict: `KERNEL_CONFLICT`

## resident_runtime_states

File: `packages/db/src/schema.ts` + `packages/contracts/src/runtime-state-contract.ts`

CURRENT FACT fields:

- PK `(world_id, resident_id)`
- `current_location_id` (uuid, required)
- `current_activity` ∈ {IDLE, TRAVELING, SLEEPING} (DB check + contract)
- `activity_instance_id`
- `activity_target_location_id` (TRAVELING only)
- `activity_started_at_world_time`
- `activity_due_at_world_time`
- `state_version`
- `source_world_seq`
- `runtime_policy_version` = `m3-runtime-state-v1`
- timestamps

Location kind enum (contract): `HOME | OFFICE | CAFE | STORE | PARK | TRANSIT`

Work obligation snapshot exists as Observation capability: `NO_CURRENT_OBLIGATION | NOT_DUE | DUE | LATE`, with workplace/window when applicable.

## MOVE / SLEEP semantics (ADR-0009)

CURRENT FACT:

- Two-phase: STARTED → COMPLETED
- MOVE does **not** switch location until COMPLETED
- During MOVE: activity=TRAVELING, location still source
- Completion requires worldTime ≥ due time
- SLEEP only at HOME, fixed 480 World Minutes
- Travel duration matrix is centralized in `m3-action-semantics-v1`
- Same-location MOVE rejected as `KERNEL_INVALID_LOCATION`
- Non-IDLE resident cannot start another MOVE/SLEEP

## Observation (M3 decision input, not user-facing projection yet)

File: `packages/contracts/src/observation-contract.ts`

CURRENT FACT:

- Policy `m3-observation-v1`
- Carries `sourceWorldSeq`, `worldTime`, `worldStatus`
- Capabilities with AVAILABLE/UNAVAILABLE unions
- After PRE-AL-04/05: `actorRef`, `resources`, `location`, `activity`, `workObligation` AVAILABLE
- `localContext` still UNAVAILABLE
- `identityKind` currently `NATIVE` only in observation self schema

Important: Observation is a **read model for Life Engine decisions**. It is not yet a browser projection contract. M7 should reuse authority fields but define a dedicated projection contract.

## Checkpoint / Replay

Files: `simulation_checkpoints`, `world-replay.ts`, `world-checkpoint-store.ts`

CURRENT FACT:

- Checkpoints are rebuildable acceleration data, not truth
- Ordered event replay with fixed seed
- Replay does not re-execute ActionRequest
- Full **resident runtime projection replay** is still a later gate (ADR-0009 consequence)

## M1 Web/API shell

- Next.js shell: world/residents/events/settings pages with honest empty states where backend not connected
- Fastify: `/api/v1/health`, `/api/v1/ready`, `/api/v1/worlds`
- No WebSocket server in main
- No Three.js / Colyseus / VRM dependency in main production packages

## Resident seed (first street logical fixture)

File: `packages/db/src/resident-seed.ts`

CURRENT FACT:

- Config version `first-street-v1`
- 30 NATIVE residents
- 5 profile variants, 26 employed / 4 not
- Deterministic UUIDs for residents, homes, workplaces
- `getFirstStreetLocationFixtures` yields **17 locations**: 12 HOME (`home-unit-01`..`12`) + shared `office`/`cafe`/`store`/`park`/`transit`
- Residents are seed-derived, **not** a durable residents table

This is **logical identity/topology fixture**, not 3D geometry.

## What does NOT exist in main

| Item                                  | Status                   |
| ------------------------------------- | ------------------------ |
| Formal projection store / MV          | ABSENT                   |
| WebSocket realtime service            | ABSENT                   |
| AOI implementation in product         | ABSENT (experiment only) |
| Formal first-street 3D scene          | ABSENT                   |
| Formal avatar pipeline in monorepo    | ABSENT                   |
| Continuous scheduler (PRE-AL-07)      | ABSENT / PENDING         |
| EAT/WORK/TALK/BUY executors           | ABSENT                   |
| Memory/Relationship/Economy producers | ABSENT                   |
| User action API for embodied control  | ABSENT                   |

## Boundary classification used by this research

| Class                 | Meaning                                        |
| --------------------- | ---------------------------------------------- |
| CURRENT MAIN FACT     | Exists in origin/main code/schema/ADR          |
| EXPERIMENTALLY PROVEN | Validated only in isolated experiment branches |
| RESEARCH PROPOSAL     | Recommended here; not implemented              |
| UNVERIFIED            | Stated as future need without evidence         |
| PENDING CONTRACT      | Blocked on another task/research               |

Baseline frozen for RES-M7-002 = `b3229aef5b820fc261443c7f6d8a50f9c3b473c6`.
