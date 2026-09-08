# PRE-AL-02 Verification Report

## Result

`PRE-AL-02 = PASS`. The local, disposable PostgreSQL, and full GitHub Actions
verification gates are green, and `HEAD == origin/main`.

## Task

- Task ID: `PRE-AL-02`
- Task name: `Observation / Query Boundary`
- Original main HEAD: `82e44409156b2ed5d69627e9bfd4556fe6e41b34`
- Starting branch: `main`
- Starting worktree: clean
- Scope: deterministic, bounded, resident-scoped, read-only Decision Observation Snapshot

## Goal and boundary audit

The boundary is:

```text
World Truth → Observation Query Port → Resident Observation Snapshot → Life Engine
```

The snapshot is a Life Engine decision read model. It is not the M4
Event → Perception → Memory observation pipeline, not a Memory, and not a
World Event.

1. Current Life Engine data sources: explicit world time/status/seed input,
   T01 resident profile/employment fixture, T02 Need anchors, and T03 read-only
   work-obligation/context inputs. Before this task there was no formal query
   port.
2. M3-T04 inputs: world observation, resident state, Needs, Goals/Routines,
   location/edge context, work obligation, read-only resources, Action Contract,
   seed, world time and decision epoch.
3. Formal authority now available: `worlds.id`, `worlds.seed`,
   `worlds.status`, `worlds.world_time` and `worlds.world_seq`; Action Contract;
   T02/T03 pure evaluator contracts.
4. Fixture-only inputs: T01's 30-resident seed/profile, home/work references,
   fixture-only ActorRef and resource values. The adapter uses the T01 generator
   from the world seed but does not promote it to a durable resident table.
5. Not implemented: current location truth, activity execution projection,
   formal obligation source, ActorRef mapping/version, Resource Bridge, nearby
   entities/edges, and any M4 perception or memory projection.
6. Life Engine production source has no `@mirror/db`, SQL, Drizzle, or Event
   Ledger import. Existing Life Engine tests retain the dev-only `@mirror/db`
   dependency solely to reuse the formal T01 fixture; the new port is imported
   from `@mirror/contracts`.
7. The new port requires `worldId` for every query. The adapter verifies the
   returned world and resident world ids, so a same-shaped resident id cannot
   cross worlds.
8. The snapshot contains only the subject resident's bounded profile,
   employment and home reference. It does not contain other residents' private
   state, Needs, Goals, resources or memory.
9. The formal version anchor is `worlds.world_seq`, exposed as
   `sourceWorldSeq`. No ActorVersion is invented here.
10. PRE-AL-02 implements world metadata and the bounded T01 self profile;
    unavailable capabilities are explicit for actor, location, activity,
    obligation, resources and local context.
11. PRE-AL-03 must provide formal ActorRef and Resource Bridge integration.
    Current-location/activity, MOVE/SLEEP and runtime obligation semantics
    remain later pre-action-loop boundaries.
12. No migration is required: the adapter reads the existing `worlds` row and
    derives fixture data without persistence.
13. No new external production dependency was added. The only package graph
    change is the existing workspace `@mirror/contracts` dependency for the
    Life Engine read contract.
14. Tests cover contract validation, port typing, world isolation, resident
    scope, stable ordering, version fencing, immutability, read-only behavior,
    fixture integration, no wall clock/randomness, and regression gates.

## Snapshot contract

`@mirror/contracts` now defines `WorldObservationSnapshot` with policy version
`m3-observation-v1` and these bounded fields:

- `worldId`, `subjectResidentId`, `worldSeed`, `worldStatus`, `worldTime` and
  decimal-string `sourceWorldSeq`;
- `self.residentId`, `identityKind`, `homeLocationId`, `profileVersion`, the
  T02/T03 personality/routine subset, and employment status/workplace/role;
- explicit `UNAVAILABLE` capability records for `actorRef`, current
  `location`, current `activity`, `workObligation`, `resources` and
  `localContext`.

The contract is Zod-validated, deep-frozen at construction/parsing, and has no
`snapshotCreatedAt`, `Date.now()`, or other wall-clock decision input. Needs and
Goals are not copied into database truth or recomputed as snapshot fields.

## Query Port and adapter

- `ObservationQueryPort` is a shared read contract re-exported by
  `@mirror/life-engine`.
- `getResidentObservation({ worldId, residentId, expectedWorldSeq? })` is
  always world-scoped.
- `getResidentObservations({ worldId, residentIds, expectedWorldSeq? })` is a
  bounded batch capped at the M3 policy limit of 30 and returns resident ids in
  stable lexical order.
- `@mirror/world-kernel` provides `createPostgresObservationQuery`. It performs
  one narrow `worlds` read and obtains the T01 fixture from that same row's
  world seed. It exposes no write method.
- The generic adapter reports machine-readable
  `WORLD_NOT_FOUND`, `RESIDENT_NOT_FOUND`, `WORLD_MISMATCH`,
  `OBSERVATION_SOURCE_UNAVAILABLE`, `STALE_READ` and `INVALID_QUERY` errors.
- A caller-provided `expectedWorldSeq` is fenced against the current world row;
  a mismatch returns `STALE_READ` before resident data is returned.

## Authority and consistency

World time/status/seed/sequence come from one selected `worlds` row. The
snapshot is assembled from that row plus deterministic T01 fixture output based
on the same seed, so the returned metadata is one database statement boundary.
The adapter does not read Event Ledger history, other worlds, or arbitrary
tables. It does not cache truth; rebuilding after cache/process loss produces
the same snapshot.

Location, activity, obligation, resources, ActorRef and local context are not
claimed as formal authority. They are returned as explicit unavailable
capabilities rather than being filled with a second mutable truth model.

## Determinism and read-only guarantee

Same world row, resident fixture, resident id, world sequence and policy produce
deep-equal snapshots. Batch results use explicit resident-id sorting. The
implementation contains no `Math.random`, wall clock, timers, unstable map
ordering or LLM path. Runtime deep-freeze prevents snapshot mutation, and the
query has no save/update/consume API.

No World Event, ActionRequest, KernelActionOutcome, Memory, world-sequence
advance or database mutation is produced by reading an observation.

## Migration, Event Ledger and Replay

- Migration: none.
- Database impact: one narrow read of the existing `worlds` table plus
  deterministic in-process fixture mapping; no INSERT/UPDATE/DELETE.
- Event impact: none; no `OBSERVATION_CREATED` or decision event was added.
- Replay: unchanged. A snapshot can be rebuilt from the replayed world state,
  same `worldSeq`, same seed and same policy; replay does not rerun Life Engine
  history or create observations.

## 30-resident integration and performance

- All 30 T01 residents were queried through the complete port and adapter.
- Every result had the correct world scope, subject id, source sequence, world
  time, stable ordering, deep-frozen DTO and explicit unavailable capabilities.
- Unit source instrumentation showed one world read and one resident-source
  read for a bounded batch, not one query per resident.
- Local reference benchmark: 30 snapshots, 200 rounds, average `0.158 ms`,
  P95 `0.236 ms`; 1000 synthetic snapshots, 50 rounds, average `3.505 ms`,
  P95 `4.467 ms`. These are local comparisons, not production SLA.

## Tests and regression

### New tests

- Contracts: 25 tests PASS, including snapshot shape, parser and immutability.
- Life Engine: 20 tests PASS, including the shared world-scoped port boundary.
- World Kernel: 32 tests PASS, including isolation, stale fencing, stable
  ordering, bounded source reads and no wall-clock/randomness.
- Disposable PostgreSQL PRE-AL-02 integration: 1/1 PASS.

### Required gates

- `pnpm install --frozen-lockfile`: PASS
- `pnpm lint`: PASS
- `pnpm typecheck`: PASS, 9/9 Turbo tasks
- `pnpm test`: PASS, 9/9 Turbo tasks
- `pnpm build`: PASS, 6/6 build tasks
- Clean PostgreSQL M2 integration: 4/4 PASS
- PRE-AL-01 ActionOutcome integration: 1/1 PASS
- PRE-AL-02 Observation integration: 1/1 PASS
- M3-T01/T02/T03 regression: PASS through the full test suite
- `pnpm audit --prod --registry=https://registry.npmjs.org/`: PASS; no known
  vulnerabilities, HIGH=0, CRITICAL=0

The disposable database was removed after the integration run. No production
database schema or migration was changed.

## P0/P1/P2/P3

- P0: 0.
- P1 remaining: PRE-AL-03 ActorRef + Resource Bridge; PRE-AL-04 MOVE/SLEEP
  semantics; PRE-AL-05 bounded replan; PRE-AL-06 scheduler/driver; and full
  domain replay/30×30 readiness.
- P2 remaining: versioned domain event payload evolution and `causation_id`
  follow-ups under the existing project findings.
- P3 remaining: document manifest mismatch and the external GitHub Action Node
  runtime warning.

## Remaining Pre-Action-Loop blockers

PRE-AL-02 closes only the Observation / Query Boundary. It does not implement
PRE-AL-03, ActorRef, Resource Bridge, MOVE/SLEEP duration/completion,
bounded replan, scheduler/driver, M3-T04, or M3-T05. The next formal task is
`PRE-AL-03 · ActorRef + Resource Bridge`, recorded but not started.

## Git and CI

- Implementation commit: `3907e56414957f4fbc377868b18bf6b84fd5fbc9`
- Final main HEAD: `3907e56414957f4fbc377868b18bf6b84fd5fbc9`
- GitHub Actions URL: https://github.com/zl2796195822/mirror-world/actions/runs/34237453432
- Workflow result: `foundation-ci` Success; full workflow passed.
- Worktree status: clean; `HEAD == origin/main`.

## Final state synchronization

Final synchronization:

- `PRE-AL-02 = PASS`
- `M3 = IN_PROGRESS`
- `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`
- Main CI baseline remains `GREEN`
- Next allowed task: `PRE-AL-03`
