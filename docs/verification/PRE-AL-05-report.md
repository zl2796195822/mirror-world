# PRE-AL-05 Verification Report

## Result

`PRE-AL-05 = IMPLEMENTED_UNVERIFIED` until the pushed main commit receives a
complete green GitHub Actions run. Local and disposable-clean evidence is
complete; CI is the remaining release gate at the time this report is first
written.

## Task and baseline

- Task ID: `PRE-AL-05`
- Task name: `MOVE / SLEEP Action Semantics`
- Original main HEAD: `93a817cf26812a6f0e48b0cb08401a632ad3fef8`
- Starting branch: `main`
- Starting `HEAD == origin/main`: yes
- Starting worktree: clean
- Formal scope: `ActionRequest → World Kernel → Runtime State → World Event → KernelActionOutcome`
- Explicitly out of scope: bounded replan, scheduler/driver, automatic wake,
  Life Engine action submission, 30×30 autonomous simulation, M3-T04/M3-T05,
  EAT/WORK/TALK/BUY execution, Economy, Memory, Agent Runtime, and 3D
  navigation.

## Action Semantics Audit

|   # | Question                           | Decision                                                                                                                                       |
| --: | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Current MOVE payload               | Existing `{ destinationId }`.                                                                                                                  |
|   2 | Current SLEEP payload              | Existing `{}`.                                                                                                                                 |
|   3 | Action Contract evolution          | No wire-shape change and no version bump; existing strict schemas remain authoritative.                                                        |
|   4 | Minimum new activities             | `TRAVELING` and `SLEEPING`; no EATING/WORKING/TALKING/BUYING states.                                                                           |
|   5 | MOVE duration                      | Yes; centralized deterministic travel policy.                                                                                                  |
|   6 | MOVE location at start             | Keep the source location until completion.                                                                                                     |
|   7 | MOVE phases                        | `STARTED → COMPLETED`.                                                                                                                         |
|   8 | SLEEP duration                     | Yes; fixed 480 World Minutes.                                                                                                                  |
|   9 | SLEEP phases                       | `STARTED → COMPLETED`.                                                                                                                         |
|  10 | Completion driver                  | Explicit Kernel completion command; future scheduler may call it but cannot mutate state directly.                                             |
|  11 | Duration testing without scheduler | Set persisted World Time explicitly, then call the completion boundary.                                                                        |
|  12 | World Time relation                | Start records start/due World Time; completion requires `worldTime >= dueWorldTime`.                                                           |
|  13 | Arbitrary request duration         | Not allowed. Duration comes only from the versioned policy.                                                                                    |
|  14 | Destination validation             | Same-world first-street semantic fixture, valid reference, reachable by the existing validator, and not the current location.                  |
|  15 | Location refs                      | Existing semantic `LocationRef`/first-street fixture IDs; no 3D or second location system.                                                     |
|  16 | SLEEP locations                    | `HOME` only.                                                                                                                                   |
|  17 | Busy activity                      | Any non-`IDLE` resident rejects a new MOVE/SLEEP with `KERNEL_INVALID_ACTION`.                                                                 |
|  18 | Runtime version                    | World and runtime row are locked; `expectedActorVersion` is checked against durable `state_version`; each successful phase increments it once. |
|  19 | Events                             | One `*_STARTED` event at start and one `*_COMPLETED` event at completion, associated to the same outcome.                                      |
|  20 | Failed start sequence              | `REJECTED`/`CONFLICT` starts create zero events and do not advance `world_seq`.                                                                |
|  21 | Outcome association                | Existing ordered `0 / 1 / N` association table; completion appends to the original committed outcome.                                          |
|  22 | Replay                             | Lifecycle payloads are validated as replay-ready; complete resident projection replay remains pending.                                         |
|  23 | Migration                          | Required for active-activity metadata; only migration `0008` is added.                                                                         |
|  24 | Contract version                   | No Action Contract version bump; runtime contract remains `m3-runtime-state-v1`.                                                               |
|  25 | Scheduler dependency               | None for semantics or tests; scheduler remains a later boundary.                                                                               |

### Gate decision

`CASE A`: MOVE/SLEEP semantics are complete enough to expose a deterministic
Kernel completion operation. No scheduler was added or smuggled into this
task.

## MOVE Contract

### Payload and destination validation

MOVE uses the existing strict Action Contract payload:

```json
{ "destinationId": "<semantic-location-uuid>" }
```

The Kernel resolves the destination against the current world's deterministic
first-street fixtures. It rejects missing, cross-world, invalid, unreachable,
or same-location destinations as `REJECTED / KERNEL_INVALID_LOCATION`. The
request cannot provide or override a duration.

### Travel Duration Policy

`packages/world-kernel/src/action-semantics.ts` owns the versioned
`m3-action-semantics-v1` policy. It maps source and destination semantic
location kinds (`HOME`, `OFFICE`, `CAFE`, `STORE`, `PARK`, `TRANSIT`) to fixed
World Minute durations. The policy is deterministic, centralized, bounded, and
does not use randomness, LLM output, wall clock, 3D coordinates, or pathfinding.

### Activity lifecycle

1. A valid MOVE from `IDLE` commits `RESIDENT_MOVE_STARTED`, leaves
   `current_location_id` at the source, and changes activity to `TRAVELING`.
2. Runtime stores the request ID as `activity_instance_id`, the destination as
   `activity_target_location_id`, and the explicit start/due World Times.
3. `completeResidentAction` is the Kernel-controlled completion operation. It
   is a no-op with `NOT_DUE` before the due time.
4. At or after due time in a `RUNNING` world, completion appends
   `RESIDENT_MOVE_COMPLETED`, changes the location to the destination, clears
   active metadata, changes activity to `IDLE`, and increments the runtime
   version.

### Idempotency and conflict

The existing `(world_id, idempotency_key)` request uniqueness and fingerprint
logic is reused. Repeating the same start returns `REUSED` and does not create
a second event or activity. Repeating completion after the runtime is `IDLE`
and the outcome has both events returns `REUSED`. A stale
`expectedActorVersion` returns durable `CONFLICT / KERNEL_CONFLICT`. Concurrent
starts for one resident are serialized by the world/runtime lock and produce
one `COMMITTED` start and one `CONFLICT`.

## SLEEP Contract

### Location and duration policy

SLEEP keeps the existing strict empty parameter object:

```json
{}
```

M3 v1 permits SLEEP only at a semantic `HOME`. The rule remains Kernel-owned
even if a caller's read snapshot incorrectly advertises SLEEP elsewhere. The
versioned policy fixes the duration to 480 World Minutes (`minimum = maximum =
baseline = 480`).

### Activity lifecycle

1. A valid SLEEP from `IDLE` commits `RESIDENT_SLEEP_STARTED` and changes
   activity to `SLEEPING`; location remains unchanged.
2. The runtime stores the request ID, start World Time, and due World Time.
3. Completion before due returns `NOT_DUE` without event, version, or state
   mutation.
4. Completion at or after due in a `RUNNING` world appends
   `RESIDENT_SLEEP_COMPLETED`, clears active metadata, changes activity to
   `IDLE`, and increments the runtime version.

### Interrupt decision

SLEEP cannot be interrupted in M3 v1. Cancel/interrupt semantics are deferred
and no partial interrupt behavior is implemented.

## Rest Anchor Integration and Need Regression

`@mirror/life-engine` exports the pure
`applySleepCompletionToNeedAnchor` adapter. It evaluates the existing anchor at
sleep start, applies the existing `RESTING` NeedPolicy lazily through the
explicit completion World Time, and returns an `AWAKE` anchor. It does not set
`RestPressure` to zero, write the database, or create minute-level events.

The existing `m3-needs-v1` evaluator remains unchanged in its three CORE Need
definitions (`HungerPressure`, `RestPressure`, `SocialPressure`). Tests confirm
that hunger and social pressure continue to derive from the existing policy,
rest pressure decreases only through the explicit resting interval, and awake
pressure resumes after the returned anchor. The Goal evaluator remains a
separate M3-T03 layer; `REST` Goal is not merged with `SLEEPING` Activity.

## Activity Contract and Runtime State Changes

The strict runtime contract remains `m3-runtime-state-v1` and now accepts only
these activity shapes:

- `IDLE`, with no active metadata;
- `TRAVELING`, with instance ID, target location, start World Time, and due
  World Time;
- `SLEEPING`, with instance ID, start World Time, and due World Time, and no
  target.

Migration `packages/db/drizzle/0008_curvy_tony_stark.sql` adds the four nullable
active-activity columns and replaces the PRE-AL-04 IDLE-only database check.
Existing IDLE bootstrap rows remain valid. No generic workflow blob is added,
and the ActionRequest payload is not copied into runtime state.

`state_version` is the optimistic-concurrency version for the durable runtime
row. Bootstrap starts at zero. A successful start moves `n → n+1`; a successful
completion moves `n+1 → n+2`. `activity_instance_id` is the ActionRequest UUID,
so no second identity scheme is needed.

## World Time, PAUSED, and MAINTENANCE

All duration decisions use persisted World Time. There is no real-time sleep,
timer, cron, interval, worker, or automatic wake. `PAUSED` and `MAINTENANCE`
do not complete a due activity: completion returns `REJECTED /
WORLD_NOT_RUNNING`, leaves the committed start outcome and runtime unchanged,
and can be explicitly retried after the world returns to `RUNNING`.

## Kernel Outcome, Events, Causality, and `worldSeq`

The durable status vocabulary remains `COMMITTED`, `REJECTED`, and `CONFLICT`.
`DUPLICATE`/`IDEMPOTENCY_CONFLICT` remain call dispositions; no new durable
status was added.

Start and completion event types are:

- `RESIDENT_MOVE_STARTED`
- `RESIDENT_MOVE_COMPLETED`
- `RESIDENT_SLEEP_STARTED`
- `RESIDENT_SLEEP_COMPLETED`

Every lifecycle event carries `schemaVersion`, action type/phase, request ID,
activity instance ID, source location, destination when applicable, start/due/
completion World Time, duration, and `m3-action-semantics-v1`. The request ID is
used as `correlationId`, giving start and completion a stable request-level
causal link. A dedicated `causation_id` column remains a known P2 follow-up;
the current request/event association is sufficient for this gate.

Each committed event advances the existing world-local `world_seq`. A start
uses one sequence value and completion uses the next. Rejection, conflict,
early completion, and Observation reads do not advance it. No parallel
sequence or event ledger exists.

## Transaction Atomicity and Rollback

The start path locks the world and resident runtime row, commits the event,
applies the Kernel runtime mutation, and persists the outcome plus event link
inside one PostgreSQL transaction. Completion uses the same world lock and
transaction boundary while appending the completion event, updating the
outcome association, and changing runtime state.

The PRE-AL-05 integration suite injects a database trigger failure into the
runtime update path twice: once during start and once during completion. The
start failure rolls back the request, start event, outcome, world sequence, and
runtime mutation. The completion failure leaves exactly the original start
event/outcome association and the original `TRAVELING` runtime state. No
partial lifecycle is accepted.

## Observation, Resources, and Authority Boundaries

Observation projects the durable runtime row and exposes `IDLE`, `TRAVELING`,
or `SLEEPING` with only the contract-minimum metadata. After MOVE completion it
returns the destination and `IDLE`; during the action it returns the source and
`TRAVELING`. Observation remains read-only and does not advance `world_seq`.

Only the Kernel action path changes `current_location_id`, `current_activity`,
active metadata, or `state_version`. Life Engine, ActorRef resolution,
ResourceReadPort, and Observation have no runtime write method. MOVE/SLEEP do
not change `cashCents`, `foodUnits`, inventory, or balances.

## Action Contract Evolution

No existing MOVE/SLEEP wire shape changed, so no Action Contract version bump,
OpenAPI change, or backward-compatibility migration is required. Runtime
activity evolution is compatible within `m3-runtime-state-v1` because existing
IDLE state remains valid and the new shapes are strict and versioned through
the policy/runtime contract.

## Replay Readiness

The four lifecycle event types are registered in the existing Event Registry.
Replay validates their payload shape, World Time consistency, phase-specific
fields, policy version, and SLEEP rest-anchor transition. The payloads contain
enough source/destination/activity/time information for a future location,
activity, and Need-anchor reducer.

This is replay-ready event semantics, not a claim of full resident runtime
projection replay. The full resident/domain reducer and 30×30 replay gate
remain pending.

## Database Impact

- Added migration: `packages/db/drizzle/0008_curvy_tony_stark.sql`.
- Updated Drizzle schema, journal, and generated snapshot.
- No prior migration was edited.
- No new production dependency was added.
- The disposable clean database applied 9 migration journal entries, seeded 1
  user and 1 world, and completed the integration chain before removal.
- The host database was not used as clean evidence because it contains prior
  append-only integration history; no historical host events were rewritten.

## 30-Resident Synthetic Validation

The dedicated integration suite runs 30 MOVE start/completion actions in one
world and 30 SLEEP start/completion actions in another isolated world. Both
sequences complete using explicit World Time and deterministic fixture data.
There is no autonomous resident loop.

Event counts are exactly 60 MOVE events and 60 SLEEP events: two transition
events per action and no minute-level event explosion. Duplicate starts,
duplicate completions, due boundaries, busy states, cross-world destinations,
same-location MOVE, HOME-only SLEEP, PAUSED/MAINTENANCE, world isolation,
Observation, and version conflicts are covered.

## Performance and Event Count

On the current machine the four-test PRE-AL-05 integration process completed in
approximately 1.40 seconds in the clean run. The 30+30 synthetic action test
completed in approximately 0.82 seconds in that run. These are correctness
reference timings only, not a production SLA. Event count is measured as 60
per action class. SQL query-count instrumentation was not enabled, so no
query-count claim is made.

## Tests and Regression Evidence

### Local gates

- `pnpm install --frozen-lockfile`: PASS.
- `pnpm lint`: PASS; all six packages and Prettier.
- `pnpm typecheck`: PASS; 9/9 Turbo tasks.
- `pnpm test`: PASS; 9/9 Turbo tasks, including contracts 32, World Kernel
  43, Life Engine 22, DB 6, API 6, and Web 3 tests.
- `pnpm build`: PASS; 6/6 build tasks.
- `pnpm audit --prod --registry=https://registry.npmjs.org`: PASS; no known
  vulnerabilities.
- Direct `npm audit` is not applicable to this pnpm-only repository because no
  npm lockfile exists (`ENOLOCK`); the official registry audit above uses the
  repository's actual pnpm lockfile.
- `git diff --check`: PASS.

### Disposable clean PostgreSQL

Two consecutive `pnpm db:setup` runs (migration + seed) passed on a fresh
PostgreSQL 18.6 container. The complete integration chain then passed:

- M2 World Clock;
- M2 Event Ledger;
- M2 Checkpoint/Replay;
- M2 ActionRequest;
- PRE-AL-01 KernelActionOutcome;
- PRE-AL-02 Observation;
- PRE-AL-04 Resident Runtime State;
- PRE-AL-05 MOVE/SLEEP.

That is 8/8 integration stages, with the M2 subset 4/4. The disposable
container was removed after verification.

### PRE-AL regression boundary

PRE-AL-01, PRE-AL-02, and PRE-AL-04 pass in the clean chain. PRE-AL-03's
ActorRef/resource read bridge remains in the clean Observation/runtime source
boundary and existing full unit/regression gates; no resource mutation was
introduced. M3-T01 resident seed, M3-T02 Needs, and M3-T03 Goals remain green
under the full unit test/build gates. No later milestone was run.

## Red-line Audit

The changed PRE-AL-05 production path contains no `Date.now()`, empty
`new Date()`, interval/timeout completion, scheduler, worker loop, Math.random,
LLM, 3D pathfinding, economy write, or automatic replan. Explicit World Time
is the only action duration input. Existing unrelated M1 app clock injection
and DB seed metadata timestamps remain outside this task's domain path.

Life Engine imports no DB/Drizzle runtime authority and Observation exposes no
write operation. Runtime updates occur only in the Kernel transaction path.

## Findings and Remaining Blockers

- P0: 0.
- P1 closed by PRE-AL-05: MOVE/SLEEP lifecycle, deterministic duration,
  Kernel completion boundary, runtime activity transitions, location commit at
  MOVE completion, idempotency, conflict handling, pause semantics, and
  transaction rollback.
- P1 remaining: PRE-AL-06 bounded replan/failure policy, PRE-AL-07
  scheduler/simulation driver, and the PRE-AL full resident/domain replay plus
  30×30 readiness gate.
- EAT/WORK/TALK/BUY execution is not implemented, but that absence is not
  separately promoted to a M3-T04 blocker for candidate/constraint/scoring;
  their execution semantics remain future Kernel work.
- P2: dedicated `causation_id`, finer versioned domain-event payload schemas,
  and scheduler/heartbeat operational hardening.
- P3: document manifest mismatch and external GitHub Action Node.js 20 runtime
  deprecation warning.

`M3-T04` remains `BLOCKED_BY_PRE_ACTION_LOOP_GATE`; it is not changed to PASS
by this task. No PRE-AL-06, PRE-AL-07, M3-T04, or 30×30 autonomous loop was
executed.

## Git and CI

- Implementation commit: pending commit/push.
- Final main HEAD: pending commit/push.
- `HEAD == origin/main`: true at task start; must be rechecked after push.
- Worktree clean: true at task start; must be rechecked after commit.
- GitHub Actions URL: pending push; final status must be a complete green
  `foundation-ci` run that includes the new integration script in the checked
  source and repository gates.
- Report path: `docs/verification/PRE-AL-05-report.md`.
- ADR path: `docs/adr/ADR-0009-pre-al-05-action-semantics.md`.

## Formal state summary

After implementation, full local/clean verification, and CI success, the
formal state is:

```text
PRE-AL-05 = PASS
M3 = IN_PROGRESS
M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE
Next allowed task = PRE-AL-06 (record only; do not execute in this task)
```

Completion of this report and CI gate ends PRE-AL-05. No later task is started.
