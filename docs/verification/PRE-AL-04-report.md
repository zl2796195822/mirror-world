# PRE-AL-04 Verification Report

## Result

`PRE-AL-04 = IMPLEMENTED_UNVERIFIED` while the first GitHub Actions run for
the implementation is being rechecked. Local and disposable clean PostgreSQL
verification passed; the first remote run (`34248913024`) failed in database
preparation before lint, typecheck, tests, or build. The status must not be
promoted to `PASS` until a complete remote run passes.

This task establishes the Resident Runtime State Authority and read boundary
only. It does not implement any Action execution or Action Loop.

## Task and baselines

- Task ID: `PRE-AL-04`
- Official Task Name: `Resident Runtime State Authority`
- Original main HEAD: `1cc5a26de38bef43b57c03e59fdbe3852cb60a41`
- Implementation commit: `05354a578cad3563f87d860d96119a866cc72bbe`
- Branch: `main`
- Scope: World/Resident Authority → Resident Runtime State → Runtime State
  Read Port → `WorldObservationSnapshot` → Life Engine
- Explicitly out of scope: PRE-AL-05, MOVE/SLEEP semantics, ActionRequest
  submission, resident Action executor, resource consumption, EAT/BUY/WORK/TALK
  execution, replan, retry/backoff, scheduler, driver, M3-T04, M3-T05 and M4+

## Authority Audit

1. Resident authority remains the deterministic M3-T01 seed/profile fixture;
   there is no second residents table.
2. Before this task there was no durable current location or activity
   authority and Observation returned those capabilities as unavailable.
3. `homeLocationId` is a home anchor, not by itself current location.
4. M3-T01 already provides stable first-street HOME/WORK references; no
   spatial graph, coordinates, navmesh, or 3D location system is introduced.
5. `employment.status` and `employment.workplaceId` already exist in the T01
   fixture. PRE-AL-04 adds only the smallest deterministic schedule read:
   Monday-Friday, 09:00-17:00 UTC.
6. Current location and current activity are durable runtime facts. Work
   obligation is a deterministic read model derived from employment, schedule,
   and World Time, so no obligation table or obligation events are needed.
7. Bootstrap is the only new initialization write path. Future runtime changes
   remain Kernel-controlled accepted-result writes; Life Engine and Observation
   have no runtime write method.
8. A migration is required for the durable location/activity authority. No new
   Action Contract, Action API, World Event, or scheduler is required.
9. `m3-observation-v1` already models capability availability as a union, so
   the three capabilities are extended compatibly rather than versioned to a
   new observation contract.
10. Replay currently retains the M2 event/replay boundary; full resident
    runtime projection replay remains a later Pre-Action-Loop gate item and is
    not silently claimed as complete here.

## Resident Runtime State Model

The new `resident_runtime_states` table is the single durable authority for
current location and current activity:

| field                      | authority meaning                                                     |
| -------------------------- | --------------------------------------------------------------------- |
| `world_id` + `resident_id` | world-scoped composite identity and primary key                       |
| `current_location_id`      | current semantic location reference                                   |
| `current_activity`         | current activity; M3 baseline allows `IDLE`                           |
| `state_version`            | future Kernel optimistic-concurrency version; bootstrap starts at `0` |
| `source_world_seq`         | world sequence fence for the materialized runtime read                |
| `runtime_policy_version`   | `m3-runtime-state-v1`                                                 |
| audit timestamps           | database metadata only, not domain time or version                    |

The contract is strict and deep-frozen. `ResidentRuntimeStateReadPort` exposes
only batch reads. `WorkObligationSnapshot` is returned beside runtime state as
a read model and distinguishes `NO_CURRENT_OBLIGATION` from unavailable data.

## Location Authority

`resident_runtime_states.current_location_id` is the sole mutable current
location authority. Observation only projects it to a validated semantic
`ResidentLocationRef` (`worldId`, `locationId`, fixture `key`, and `kind`).
The fixture's `homeLocationId` is used only by the explicit bootstrap policy;
it is not a second mutable truth and does not mean a resident can never move.

### Initial Location Policy

Policy `m3-runtime-state-v1` initializes every T01 resident at its validated
first-street HOME reference. This is a deterministic world-genesis baseline,
not a permanent behavior rule. It uses the same world ID, world seed, resident
seed, and policy every time; it never uses randomness or wall clock.

### Location Reference

The implementation reuses T01 first-street semantic fixture references and
does not create a second location-ID scheme. The runtime row stores the
location UUID; the read authority resolves it against the matching world
fixture and rejects an invalid or cross-world reference.

## Activity Authority

`resident_runtime_states.current_activity` is the sole current activity
authority. The M3 baseline contract intentionally contains only `IDLE`.
There is no activity transition executor in this task.

### Initial Activity and Activity Contract

Bootstrap explicitly writes `IDLE`; it is not a null value interpreted by a
consumer. `IDLE` is an initialized baseline, not a claim that future residents
always remain idle. TRAVELING/SLEEPING/WORKING transitions belong to later
Kernel action semantics.

## Work Obligation Classification

Work obligation is not a durable world fact in PRE-AL-04. It is a deterministic
read model:

`employment + fixed UTC schedule + World Time → WorkObligationSnapshot`.

### Work Schedule Source and Obligation Derivation

The source is the existing T01 employment fixture. For employed residents the
policy is Monday-Friday, 09:00-17:00 UTC. The read returns:

- `NOT_DUE` before the shift and outside a workday;
- `DUE` from shift start through the shift interval;
- `LATE` after shift end on a workday;
- `NO_CURRENT_OBLIGATION` for unemployed residents.

The result includes the resident/world identity, workplace reference when
employed, and shift start/end World Time when a workday applies. No salary,
contract, leave, tax, economy, or high-frequency obligation event is added.

## World Time, Policy, and Runtime Version

All obligation decisions use the explicit persisted World Time passed through
the World Kernel observation query. The schedule uses UTC intentionally; no
`Date.now()`, system timezone, timer, or wall-clock domain dependency is used.
PAUSED/MAINTENANCE do not advance World Time, so the derived obligation cannot
change from wall-clock passage alone.

- Runtime policy/version: `m3-runtime-state-v1`.
- Runtime state version: `state_version`, initialized to `0` and reserved for
  future Kernel-controlled writes.
- Snapshot fence: `sourceWorldSeq`; runtime state may be at or behind the
  observation sequence because time-only events do not mutate resident state.
  A runtime row ahead of the observation sequence is rejected as `STALE_READ`.

## Consistency Model

The PostgreSQL observation query reads the world authority, then obtains the
world-scoped runtime rows through the read port. Runtime rows are ordered by
resident ID, bounded to 30, and fenced against a future `sourceWorldSeq`.
The contract does not claim a stronger cross-table serializable snapshot than
the implemented query boundary. A runtime row at an earlier sequence is
valid when the intervening world change is only `WORLD_TIME_ADVANCED`; a row at
a future sequence is invalid.

## Bootstrap, Idempotency, and World Isolation

`bootstrapResidentRuntimeStates` locks the target world, derives the exact T01
30-resident fixture, validates each HOME reference, and inserts with the
world/resident composite primary key. Repeating bootstrap returns the same 30
rows, creates no duplicates, and does not overwrite an existing location,
activity, version, or source sequence. A different world derives different
resident IDs and has an isolated runtime set. Two bootstrap calls are
serialized by the world row lock and the composite key.

## Write and Read Authority

- Write authority: world bootstrap for initialization; future accepted Kernel
  commit logic for runtime changes.
- Read authority: the world-kernel runtime read port and its validated
  Observation adapter.
- Life Engine: contract-only read consumer. It does not import DB/Drizzle or
  the runtime repository and has no location/activity/obligation write path.
- No ActionRequest, KernelActionOutcome, world event, world sequence increment,
  scheduler, or retry is produced by a read.

## Observation Integration and Version Decision

`m3-observation-v1` remains the contract version. Its capability fields already
allowed `AVAILABLE | UNAVAILABLE`; PRE-AL-04 adds valid `AVAILABLE` branches
for location, activity, and work obligation without changing the top-level
shape. Default PostgreSQL observations now expose all three as `AVAILABLE`
from the runtime authority/read model. `actorRef` and `resources` remain
available from PRE-AL-03; `localContext` remains honestly unavailable.

The adapter performs a bounded batch runtime read and builds immutable
snapshots. It never updates the runtime table or advances world state.

## ActorRef and Resource Regression

PRE-AL-03 boundaries remain unchanged: Auth Identity, Digital Identity,
Resident Identity, and ActorRef remain separate; ActorRef is still the only
Kernel-facing identity bridge. `ResidentResourceSnapshot` remains read-only,
with `cashCents`, `foodUnits`, and `version=0`; no economy authority or
resource mutation is added.

## Database, Migration, Events, world_seq, and Replay

- Added only `packages/db/drizzle/0007_flawless_mach_iv.sql` and its generated
  snapshot/journal updates.
- Fresh migration, existing database upgrade, repeated seed, and runtime
  bootstrap are covered by the clean database checks below.
- No old migration was edited. The host baseline has 7 migrations, 1 user, 1
  world, and 30 runtime rows after seed.
- No runtime event is created for reading, obligation derivation, or baseline
  bootstrap; the existing M2 Event Ledger is not polluted with 30 synthetic
  events.
- M2 replay remains authoritative for its existing event scope. Rebuilding a
  full resident runtime projection from domain history is explicitly a later
  Pre-Action-Loop gate item, not an unverified PASS claim here.

## 30 Resident Integration and Employment Results

The clean PostgreSQL integration uses the official T01 fixture and verifies
30/30 runtime rows and 30/30 available location/activity/obligation snapshots.
The fixture contains 26 employed and 4 unemployed residents. At the seeded
World Time, employed residents are `NOT_DUE` and unemployed residents are
`NO_CURRENT_OBLIGATION`; boundary tests cover before shift, shift start,
inside shift, after shift, weekend, paused/maintenance inputs, and repeated
same-time evaluation.

## Performance and Query Count

The runtime read is bounded at 30 residents and uses one SQL runtime-row batch
query plus deterministic in-process fixture derivation; it does not perform a
per-resident SQL query. Results are sorted explicitly by resident ID. No
production SLA is claimed; the local verification target is bounded batch
behavior and absence of runtime N+1.

## Tests and Verification Evidence

- TDD contract/authority tests: PASS.
- `pnpm install --frozen-lockfile`: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS; contracts 30, world-kernel 41, life-engine 20, with all
  workspace tasks successful.
- `pnpm build`: PASS.
- `pnpm db:setup` twice on the local database: PASS.
- Clean disposable PostgreSQL migration/seed twice plus M2 Clock/Ledger/
  Replay/ActionRequest/Outcome, Observation, and PRE-AL-04 runtime integration:
  `7/7 PASS`; temporary database removed.
- PRE-AL-01, PRE-AL-02, PRE-AL-03 regression: PASS in the clean integration
  sequence.
- Official npm production audit: PASS; no known vulnerabilities,
  HIGH=0, CRITICAL=0; no new production dependency.
- Architecture scan: no Life Engine DB import, no runtime write path from
  Observation/Life Engine, no action executor, scheduler, or random/wall-clock
  domain dependency.

## Remote CI Gate

- First run: [foundation-ci run 34248913024](https://github.com/zl2796195822/mirror-world/actions/runs/34248913024)
  failed at `Prepare integration database`; later checks were skipped.
- Diagnostic run: [foundation-ci run 34249840037](https://github.com/zl2796195822/mirror-world/actions/runs/34249840037)
  failed specifically at `Seed integration database`, while migrations passed.
- Root cause: the clean runner had not built `@mirror/contracts` before the
  new DB seed path imported its runtime policy constant. Local prebuilt `dist`
  had masked this. `@mirror/db db:seed` now explicitly builds that workspace
  contract before running the seed.
- The failure logs are not accessible anonymously from the public Actions
  page. Local Node 24/pnpm 9.15.4/PostgreSQL 18.6 equivalent setup passes.
- The CI workflow supplies the Compose database URL explicitly and separates
  migration/seed steps. A fresh complete run on the pushed fix is required
  before changing this report to `PASS`.

## Risk and Remaining Blocker Audit

- P0: 0.
- P1 closed by this task: authoritative current location, initialized current
  activity, and deterministic work obligation read boundary.
- P1 remaining: MOVE/SLEEP semantics and their committed runtime transitions;
  EAT/BUY/WORK/TALK execution semantics if required by the 30×30 gate; bounded
  replan/backoff; scheduler/driver; and full resident/domain replay.
- P2: versioned domain event payloads, `causation_id`, scheduler/heartbeat
  boundary.
- P3: document manifest mismatch and external GitHub Action Node.js 20 warning.

`M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE` remains. This task does not
authorize or implement the next task.

## Git and State

- Original main HEAD: `1cc5a26de38bef43b57c03e59fdbe3852cb60a41`.
- Implementation commit: `05354a578cad3563f87d860d96119a866cc72bbe`.
- Current report status: `IMPLEMENTED_UNVERIFIED` pending complete remote CI.
- Report path: `docs/verification/PRE-AL-04-report.md`.
- `docs/PROJECT_STATE.md` is synchronized to the pending CI state.
- After the remote run passes, the final report must record the final pushed
  main HEAD, CI URL, `PRE-AL-04 = PASS`, `M3 = IN_PROGRESS`, and the next
  allowed task only as `PRE-AL-05` without starting it.
