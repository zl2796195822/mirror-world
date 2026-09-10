# M3 Behavioral Lifecycle Extension Verification Report

## Status

`PASS`

The implementation DoD is satisfied by local Node 24, clean disposable
PostgreSQL evidence, and successful GitHub Actions verification.

`M3 = IN_PROGRESS` remains unchanged.

## Authority and baseline

| Field                       | Result                                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| Starting `origin/main`      | `cbcd1ae58771c9a261fed9c5f96fcaf4ea08e0ca`                                      |
| Baseline                    | `HEAD == origin/main`, clean at task start                                      |
| Branch                      | `task/m3-behavioral-lifecycle-extension`                                        |
| Worktree                    | `/Users/alin/AI项目/mirror-world-m3-behavioral-lifecycle-extension`             |
| Implementation commit       | `b5cb5a7` (`feat: implement M3 behavioral lifecycle extension`)                 |
| Final task commit           | `96a9576b17fe80615c9e664012e2fa0cdcb4f5b0`                                      |
| Main merge commit           | `0ddceafc91c4da274f545b98742d4b69c3a9ade1`                                      |
| Frozen specification        | `docs/verification/M3-LIFECYCLE-STORY-SPEC-RECONCILIATION/`, `SPEC FREEZE = ON` |
| Frozen/governance reference | `69fcf40b83fea3b30428ea87997c8458935a0bdc` and current baseline docs            |
| ADR-0011                    | `Accepted` — single Kernel/PostgreSQL food resource seam and start-time CAS     |
| ADR-0012                    | `Accepted` — single initiator, participant ActorRef and UUID-byte paired lock   |

The implementation keeps PostgreSQL as durable truth, the World Kernel as the
fact write boundary, Redis out of durable truth, and Life Engine as a read-only
decision layer.

## Scope and non-goals

Implemented in this task:

- EAT, WORK and TALK Kernel-backed `STARTED → COMPLETED` lifecycles;
- M3-T04 Rule Decision and Action Loop v2 extension;
- existing scheduler/due-wake extension, typed event registry v2, reducers,
  projection replay and checkpoint suffix/genesis rebuild;
- transaction, CAS, race, rollback, restart, requery, idempotency and isolation
  evidence.

Explicitly not run or implemented:

- `M3-LIFECYCLE-STORY-GATE`;
- the M3 expanded `30 × 30` lifecycle gate;
- `M3-T05` Story Sanity report;
- M3 Final Status Review #2, M4+, Memory/Relationship/Dialogue/LLM, or M6
  Economy settlement.

## 1. Schema and production changes

Migration `packages/db/drizzle/0011_giant_hellcat.sql` adds the single
world/resident/item `resident_resource_states` authority for food, with
non-negative `food_units` and `resource_version`. The existing runtime
authority gains paired TALK target, EAT/social effect anchors, and completed
WORK shift keys. No ActionRequest core, Event Ledger core, scheduler ownership,
payroll or economy schema was introduced.

Production implementation is grouped in:

- `packages/contracts`: observation/resource/runtime/scheduler contracts;
- `packages/db`: migration, schema, resident bootstrap, resource/due/wake
  accessors;
- `packages/life-engine`: deterministic Rule Decision v2 and Action Loop v2;
- `packages/world-kernel`: lifecycle semantics, Kernel execution/completion,
  scheduler integration, typed reducers and canonical projection replay;
- `apps/api`: integration registration and regression coverage.

## 2. EAT

| Requirement    | Result                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ActionRequest  | Existing strict `EAT { itemId, quantity }`; Rule candidates use quantity `1`                                                                                  |
| START          | World/runtime/resource rows are re-queried and locked in one Kernel transaction                                                                               |
| Duration       | Exactly 30 World Minutes                                                                                                                                      |
| Resource truth | One PostgreSQL `resident_resource_states` row; no second inventory                                                                                            |
| CAS            | Canonical item, location, non-negative quantity, expected version and `food_units/version` CAS; stale version is `KERNEL_CONFLICT`                            |
| Need effect    | Completion event carries `m3-need-effects-v1`, `55 × quantity` hunger relief input and updates `lastAteAtWorldTime`; derived pressure is not directly written |
| Completion     | Due completion validates request/activity/world and does not consume food again                                                                               |
| Events         | `RESIDENT_EAT_STARTED`, `RESIDENT_EAT_COMPLETED`                                                                                                              |
| Idempotency    | Duplicate request/completion reuses the original Kernel outcome; no duplicate consumption/effect                                                              |
| Replay         | Reducer restores activity, resource before/after/version and last-eaten time                                                                                  |
| Restart        | START → process/database restart → due requery → completion passed                                                                                            |
| Conservation   | Valid, insufficient, wrong version/item/world/resident and concurrent spend cases passed; units never went negative or double-spent                           |

## 3. WORK

| Requirement      | Result                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| ActionRequest    | Existing strict `WORK { workplaceId }`                                                         |
| Obligation       | Employed resident and matching workplace only; `DUE` authorizes, `LATE` and unemployed do not  |
| Time boundary    | Exact UTC Monday–Friday 09:00 start and 17:00 end; completion due is shift end                 |
| START            | Requires workplace location, idle runtime, matching employment and exact `DUE` boundary        |
| Completion       | `WORK_COMPLETED` records the obligation key once and returns runtime to `IDLE`                 |
| Attendance       | Attendance-only, 480 minutes; completed shift keys are durable                                 |
| Events/replay    | `RESIDENT_WORK_STARTED` / `RESIDENT_WORK_COMPLETED`; replay restores WORK and attendance state |
| Restart          | START → restart/requery → shift completion and duplicate completion passed                     |
| Payroll boundary | No payroll, salary, wage, account, arrears, journal or cash settlement                         |

## 4. TALK

| Requirement        | Result                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| ActionRequest      | Single initiator; `parameters.participantId` is the participant `ActorRef.actorId`                    |
| Validation         | Same world, distinct active residents, same location, both idle; participant is re-resolved by Kernel |
| Paired transaction | One PostgreSQL transaction atomically occupies both runtime rows                                      |
| Lock order         | World row → minimum resident UUID bytes → maximum resident UUID bytes                                 |
| Activity identity  | Both rows share `activityInstanceId = actionRequest.id` and one due completion owned by initiator     |
| Duration           | Exactly 15 World Minutes                                                                              |
| Completion         | Re-locks and validates the reciprocal pair, then releases both rows atomically                        |
| Events/replay      | One `RESIDENT_TALK_STARTED` and one `RESIDENT_TALK_COMPLETED`; reducer updates both residents         |
| Race/deadlock      | Reciprocal A→B/B→A race has one winner, no deadlock, no half-pair and no duplicate shared activity    |
| Restart            | START → restart/requery → paired completion passed                                                    |
| Excluded           | No dialogue, message generation, LLM, transcript, Memory or Relationship mutation                     |

## 5. Rule Decision, Action Loop and evidence

`m3-rule-decision-v2` deterministically generates bounded EAT, WORK and TALK
candidates from Observation → Needs → Goals. It applies hard constraints,
stable UUID ordering, stable scores and versioned ActionRequest drafts. TALK
participant selection is resident-UUID ordered. BUY remains declared but
non-executable; a negative unit test asserts no BUY candidate or executable
draft.

`m3-action-loop-v2` returns the causal chain needed for later Story Sanity:
resident/world time/source sequence, Observation-derived Need state, selected
Goal, candidates, selected action, ActionRequest, Kernel outcome/event refs and
bounded replan decision. It does not write truth and does not call an LLM.

Accepted EAT/TALK completion payloads are also fed through the pure
`m3-need-effects-v1` adapter before the next Needs evaluation: EAT applies
`55 × quantity` hunger relief and TALK applies `35` social relief. This updates
the in-memory Need anchor used by the next evaluation only; it does not create
durable Need truth or bypass the Kernel.

## 6. Scheduler, due/wake and failure policy

The existing scheduler remains the `WHEN` owner, Life Engine remains `WHAT`,
and Kernel remains `CAN / COMMIT`. Due activity now covers `TRAVELING`,
`SLEEPING`, `EATING`, `WORKING` and `TALKING`; the two TALK runtime rows are
coalesced into one completion work item. `WORK_BOUNDARY` wakes are deterministic,
world-time based, world/dedupe scoped and restart-safe. PRE-AL-06
`m3-replan-v1` is reused; recovery remains bounded and fail-closed.

WORK boundary wake registration is created on a successful WORK start and
refreshed by the existing boundary helper. Automatic bootstrap-wide WORK wake
reconciliation is intentionally not enabled, so the historical PRE-AL fixture
profile is not changed; this task does not claim bootstrap wake coverage.

## 7. Typed events, reducers and replay

`m3-domain-event-registry-v2` adds:

- `RESIDENT_EAT_STARTED` / `RESIDENT_EAT_COMPLETED`;
- `RESIDENT_WORK_STARTED` / `RESIDENT_WORK_COMPLETED`;
- `RESIDENT_TALK_STARTED` / `RESIDENT_TALK_COMPLETED`.

The pure deterministic `m3-resident-projection-v2` reducer restores location,
activity, resource versions, EAT/social effect anchors, WORK shift keys and
reciprocal TALK state. Existing `simulation_checkpoints` truth boundaries are
unchanged; checkpoint snapshots now carry the complete v2 projection and are
validated by canonical SHA-256 checksum. Targeted integration proved:

```text
live projection == full replay == checkpoint suffix replay
                     == genesis replay after checkpoint deletion
```

The equality is asserted using canonical projection hashes; replay performs no
new side effects.

## 8. Verification evidence

### Local toolchain

| Check                     | Result                                                                           |
| ------------------------- | -------------------------------------------------------------------------------- |
| Node                      | `v24.11.1`                                                                       |
| Frozen install            | PASS                                                                             |
| Format                    | PASS                                                                             |
| Lint                      | PASS                                                                             |
| Typecheck                 | PASS                                                                             |
| Unit tests                | PASS; contracts 47, db 8, life-engine 72, world-kernel 62, web 3, API contract 6 |
| Build                     | PASS, forced uncached Turbo build                                                |
| Official production audit | PASS; `No known vulnerabilities found`, HIGH=0, CRITICAL=0                       |

### Clean PostgreSQL

Disposable PostgreSQL container `mirror-world-m3-lifecycle-20260910` and database
`mirror_m3_final_20260910` were newly initialized. `pnpm db:setup` applied 12
Drizzle journal entries including migration `0011_giant_hellcat` and seeded
one user/world. The complete API integration suite then passed 35 cases:

| Suite                                                                                                | Result |
| ---------------------------------------------------------------------------------------------------- | -----: |
| Existing World Clock, Event Ledger, Replay/Checkpoint, Action Request, Outcome, Observation, Runtime |    8/8 |
| MOVE/SLEEP Kernel                                                                                    |    4/4 |
| Scheduler/driver                                                                                     |    4/4 |
| M3-T04 Action Loop regression                                                                        |    3/3 |
| M3 EAT/WORK/TALK targeted lifecycle                                                                  |  15/15 |
| PRE-AL-GATE regression                                                                               |    1/1 |
| Total                                                                                                |  35/35 |

The disposable database and container were removed after verification. The
PRE-AL-GATE regression is historical fixture-profile regression evidence; it
does not count as the prohibited M3 expanded lifecycle gate.

### Targeted lifecycle result

The 15 new PostgreSQL tests passed for EAT CAS/conservation/completion/restart,
WORK boundary/attendance/completion/restart, TALK co-location/paired release/
reciprocal race/restart, and live/full/suffix/genesis replay equivalence.
Rollback, world isolation, resident isolation, zero-LLM and idempotency paths
also passed through the targeted and existing integration suites.

## 9. Final gate state

| Field                              | Result                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| CI                                 | PASS — runs `34463283837`, `34463309484`, and `34464013190`          |
| M3 Behavioral Lifecycle Extension  | `PASS`                                                               |
| M3                                 | `IN_PROGRESS`                                                        |
| `M3-LIFECYCLE-STORY-GATE` executed | No                                                                   |
| M3 expanded 30×30 gate executed    | No                                                                   |
| M3-T05 executed                    | No                                                                   |
| Remaining M3 P1                    | M3-LIFECYCLE-STORY-GATE and M3-T05                                   |
| Next allowed formal task           | `M3-LIFECYCLE-STORY-GATE`                                            |
| Main integration                   | PR #1 merged to `main` as `0ddceafc91c4da274f545b98742d4b69c3a9ade1` |
| Stop confirmation                  | Stop immediately after this task close; do not enter the next task   |
