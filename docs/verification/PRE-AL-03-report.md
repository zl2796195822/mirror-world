# PRE-AL-03 Verification Report

## Result

`PRE-AL-03 = PASS`。Resident → ActorRef 与 Resident → Resource Read Bridge
已接入 `m3-observation-v1`，没有执行任何 Action、Kernel mutation、M3-T04 或后续任务。

## Task and baseline

- Task ID: `PRE-AL-03`
- Task name: `Resident ActorRef + Resource Read Bridge`
- Original main HEAD: `d1d66b092b60ece537209ba29f2321cfc968bdb8`
- Starting branch: `main`
- Starting `HEAD == origin/main`: yes
- Starting worktree: clean
- Formal boundary: `Resident → ActorRef / ResourceReadPort → WorldObservationSnapshot → Life Engine`

## Authority audit

1. M2 Kernel has no durable actors table or formal ActorRef schema. Its formal
   validator input is `KernelActorSnapshot`; `ActionRequest.actorId` is a UUID
   and is matched with `worldId`.
2. `requestedBy` is a request source enum, not an Auth or Resident identity.
3. T01's `{ actorId, scope: "FIXTURE_ONLY" }` is not Kernel authority. The new
   formal `ActorRef` is derived from that same stable actor ID and adds explicit
   `worldId`, `residentId`, and `kind: NATIVE_RESIDENT`.
4. Resident ID remains the T01 deterministic Resident/Life identity. It is not
   `users.id`, an auth session ID, or a Digital Identity ID.
5. ActorRef carries identity and scope only; permission, status, location,
   version conflict, and action validity remain Kernel validator concerns.
6. ActorRef is deterministically rebuilt from the T01 seed; no mapping table,
   actor row, migration, or automatic actor creation was added.

The requested RES-M3-002 source files were read from the available research
checkout at `/Users/alin/AI项目/mirror-world-m3-compatibility/docs/research/RES-M3-002/`;
the RES-M6-001 bridge source was read from
`/Users/alin/AI项目/mirror-world-economy-research/docs/research/RES-M6-001/`.

## Implementation

### ActorRef

- `@mirror/contracts` now owns the strict, deep-frozen `ActorRef` contract.
- `@mirror/world-kernel` provides `ResidentActorResolver` implementations for
  the M3 seed fixture, with single and bounded batch resolution.
- The resolver reuses T01's deterministic `actorRef.actorId`; it does not use
  `randomUUID()`, `Math.random()`, wall-clock input, Auth Identity, or Digital
  Identity.
- Input is always world-scoped. A mismatched world returns machine-readable
  `WORLD_MISMATCH`; an unknown Resident returns `RESIDENT_NOT_FOUND`.

### Resource Bridge

- `@mirror/contracts` now owns `ResidentResourceSnapshot` and `ResourceReadPort`.
- The snapshot contains only `worldId`, `residentId`, `cashCents`, `foodUnits`,
  and `version`.
- `version=0` remains the M3 resource snapshot version. It is not `worldSeq`,
  `actorVersion`, or a database timestamp.
- `createM3SeedResourceReadPort` reads the same T01 seed fixture source; it does
  not duplicate or regenerate cash/food constants.
- The port exposes read methods only. There is no consume, spend, deposit,
  withdraw, add-food, or remove-food operation.
- A future M6 accounts/inventory provider can replace the port at the bridge
  composition boundary without changing Life Engine or the snapshot consumer.

### Observation integration

- `m3-observation-v1` remains the contract version. The existing capability
  fields were extended compatibly to `AVAILABLE | UNAVAILABLE`.
- Default PostgreSQL observation composition now resolves ActorRef and resource
  snapshots in one bounded batch per capability, then builds immutable snapshots.
- `actorRef` and `resources` are `AVAILABLE` for T01 residents.
- `location`, `activity`, `workObligation`, and `localContext` remain honestly
  `UNAVAILABLE`; no fake runtime state was introduced.
- `ObservationResidentSource` and `ResidentBridgeFactory` leave the provider
  replaceable for a future M6 source.

## Determinism, ordering, and safety

- Same `worldId + worldSeed + residentId` produces the same ActorRef and
  resource snapshot.
- Batch input is capped at 30, de-duplicated, and returned in lexical
  `residentId` order.
- Returned ActorRef/resource/snapshot objects are deep-frozen; callers cannot
  mutate the fixture or later reads.
- No LLM, provider SDK, timer, wall clock, random source, filesystem order, or
  database write is used.
- No ActionRequest, KernelActionOutcome, World Event, `world_seq` increment, or
  Replay entry is produced by resolution or read.

## Database, event, and migration impact

- Schema impact: none.
- Migration impact: none; database remains at 7 migrations.
- Durable resource authority: not created. M3 remains a read-compatible seed
  adapter; M6 owns future accounts/inventory/journal authority.
- Observation performs the existing narrow `worlds` read and deterministic
  in-process fixture mapping. It does not insert/update/delete facts.
- The disposable clean PostgreSQL verification database was removed after use.
- The host database was reseeded to `PAUSED/1x`; its append-only historical
  `world_events` were not deleted or rewritten.

## Verification evidence

| Check                                       | Result                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| TDD red phase                               | PASS: new contract/bridge suites first failed because the implementation modules did not exist |
| `pnpm install --frozen-lockfile`            | PASS                                                                                           |
| `pnpm lint` + Prettier                      | PASS                                                                                           |
| `pnpm typecheck`                            | PASS, 9/9 Turbo tasks                                                                          |
| `pnpm test`                                 | PASS, 9/9 Turbo tasks                                                                          |
| `pnpm build`                                | PASS, 6/6 build tasks                                                                          |
| Contracts tests                             | PASS, 28 tests                                                                                 |
| World Kernel tests                          | PASS, 36 tests                                                                                 |
| Life Engine regression                      | PASS, 20 tests                                                                                 |
| Clean PostgreSQL M2 integration             | PASS, 4/4 on disposable database                                                               |
| PRE-AL-01 ActionOutcome integration         | PASS in clean integration run                                                                  |
| PRE-AL-02 Observation integration           | PASS in clean integration run                                                                  |
| PRE-AL-03 Observation read-only integration | PASS, 30 residents; available ActorRef/resources; remaining capabilities unavailable           |
| Double `db:setup`                           | PASS                                                                                           |
| Official npm production audit               | PASS, no known vulnerabilities; HIGH=0, CRITICAL=0                                             |
| New external production dependency          | None; one workspace type-contract edge from `@mirror/db` to `@mirror/contracts`                |

The first attempt to run the full integration sequence against the existing
host database reached a non-clean historical Event Ledger and failed Replay;
the same full sequence passed on the disposable clean database. This is a
database-fixture boundary, not a PRE-AL-03 implementation failure.

## Findings and remaining blockers

- P0: 0.
- P1 closed by this task: formal Resident → ActorRef mapping and read-only
  resource boundary.
- P1 remaining: authoritative current location, activity/travel completion,
  obligation query source, MOVE/SLEEP semantics, bounded replan/backoff,
  scheduler or deterministic driver, and full resident/domain replay with
  30×30 outcome/event evidence.
- P2: versioned domain event payload evolution and `causation_id` follow-ups.
- P3: document manifest mismatch and external GitHub Action Node runtime warning.

The final blocker audit does not authorize M3-T04. The next allowed work must
first explicitly re-evaluate location/activity/obligation authority together
with MOVE/SLEEP semantics; no new runtime loop or 30×30 simulation is included
in PRE-AL-03.

## Git and CI

- Implementation commit: pending final documentation/CI synchronization
- Final main HEAD: pending final documentation/CI synchronization
- GitHub Actions URL: pending push
- Required final state: `PRE-AL-03 = PASS`, `M3 = IN_PROGRESS`,
  `M3-T04 = BLOCKED_BY_PRE_ACTION_LOOP_GATE`
