# M3-T01 Resident Seed Generator Verification

## Result

`M3-T01 = PASS`.

`M3 = IN_PROGRESS`; this report does not claim completion of M3 or any later task.

## Task and source boundary

- Task ID: `M3-T01`
- Original goal: fixed-seed generation of 30 residents, homes, work, personality, and wealth.
- Formal DoD: the fixture is identical on every run and its distributions pass snapshot tests.
- Formal sources read: `镜界_Codex里程碑任务书_v1.0.docx`, `镜界_全量开发母文档_v1.0.docx`, `镜界_M0-M13实施规格与依赖矩阵_v1.0.docx`, `镜界_LifeEngine详细规格_v1.0.docx`, `镜界_WorldKernel详细规格_v1.0.docx`, `镜界_数据库设计与数据字典_v1.0.docx`, `镜界_测试验收与质量保障_v1.0.docx`, and the First Street MVP specification.
- Research sources read: RES-M3-001, RES-M3-002, the resident identity boundary from RES-M4-001, and `RES-M6-001/09-m3-resource-bridge.md`.

## Actual implementation

- `packages/db/src/resident-seed.ts`: pure deterministic generator and fixture-only First Street location references.
- `packages/db/src/resident-seed.test.ts`: unit, distribution, snapshot, identity/resource boundary, seed-difference, and static determinism checks.
- `packages/db/src/index.ts`: exports the fixture generator and types.
- No new dependency, no API, no event, no Kernel write path, no runtime loop, and no migration.

## Fixture contract

| Field                   | Result                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Resident count          | Exactly 30                                                                                                      |
| Resident kind           | `NATIVE` for all residents                                                                                      |
| Seed input              | `worldId` UUID + non-empty world seed; test seed `RES-M3-001-seed-20260908`                                     |
| Generator version       | `m3-t01-v1`                                                                                                     |
| Fixture config version  | `first-street-v1`                                                                                               |
| ID strategy             | SHA-256-derived deterministic UUIDs; resident and fixture-only actor IDs are distinct                           |
| Ordering                | Lexicographic `residentId` ordering                                                                             |
| Profile distribution    | 5 routine/personality profiles × 6 residents each                                                               |
| Employment distribution | 26 `EMPLOYED`, 4 `UNEMPLOYED`; roles 9 office, 9 cafe, 8 store                                                  |
| Home/location fixture   | 12 deterministic home-unit references plus office, cafe, store, park, and transit references; no location table |
| Resource fixture        | Non-negative `cashCents`, `foodUnits`, and `version=0`; read-compatible only                                    |

The profile metadata also carries a stable fixture `profileHash`. It is test/fixture metadata, not a World Kernel or replay authority.

## Authority boundaries

- Identity: `Resident Identity` is separate from `Digital Identity` and `Auth Identity`; no `users.id` reuse and no auth-cookie identity.
- Actor: each resident has only a `scope: FIXTURE_ONLY` `actorRef` mapping. This does not create or modify Kernel Actor authority, validation, ActionRequest, or ActionResult behavior.
- Needs: no `energy`, `hunger`, `social`, `stress`, `money_pressure`, `purpose`, `safety`, `sleepPressure`, or other evolving Needs state was created. The 4/6/7 Needs conflict remains a pre-T02 decision.
- Resources: cash and food are seed values consumed through a future read-only bridge; the generator never mutates them. No accounts, inventory, journal, or ledger schema was added.
- Runtime: no timer, scheduler, worker, tick loop, candidate action, Life Engine decision state, or 30×30 simulation was added.

## Verification evidence

### T01 tests

The DB package test suite passed: 6 tests, including:

- exact count, stable ordering, unique deterministic IDs, generator/config versions, and profile hash shape;
- deep equality across repeated generation;
- 5×6 profile, 26/4 employment, 9/9/8 role, and cash/food distribution snapshots;
- valid First Street references, `NATIVE` identity, distinct fixture-only actor IDs, personality range, and non-negative resources;
- different seed produces a different fixture while retaining 30 residents;
- source audit rejects `Math.random()`, `randomUUID()`, `Date.now()`, and `new Date()` in the generator.

### Repository and M2 regression

| Check                                                      | Result                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                           | PASS                                                                   |
| Docker PostgreSQL/Redis/MinIO health                       | PASS                                                                   |
| `pnpm db:setup` twice on the local DB                      | PASS                                                                   |
| `pnpm lint`                                                | PASS                                                                   |
| `pnpm typecheck`                                           | PASS                                                                   |
| `pnpm test`                                                | PASS; DB 6, World Kernel 25, contracts 15, Web 3, API 6                |
| `pnpm build`                                               | PASS                                                                   |
| M2 PostgreSQL integration on disposable clean DB           | PASS; World Clock, Event Ledger, Replay/Checkpoint, Action Request 4/4 |
| `pnpm audit --prod --registry=https://registry.npmjs.org/` | PASS; no known vulnerabilities                                         |

An initial integration attempt against the already-used local append-only database failed because repeated validation data had accumulated duplicate clock chains. No T01 code was implicated. The required M2 regression was then rerun on a disposable clean database with two clean `db:setup` runs and passed 4/4; the temporary database was removed afterward. No migration or application data deletion was used to hide that result.

## Risk and blockers

- P0: 0.
- New P1: 0.
- Existing P1 blockers intentionally not fixed here: ActionResult/committed-event feedback, Observation/query boundary, formal ActorRef integration, read-only resource adapter, MOVE/SLEEP completion semantics, bounded replan, scheduler/driver, and full resident/domain replay. These are Action Loop or M3 Gate prerequisites per RES-M3-002.
- P2: Needs 4/6/7 must be resolved by a pre-T02 ADR/decision; versioned domain event payloads, `causation_id`, and scheduler/heartbeat boundaries remain future work as scoped.
- P3: document manifest filename/count mismatch and external GitHub Action Node.js 20 warning remain inherited project items.

## Git and follow-up

- Implementation commit: `9077be3b660f2e7ea41a5729e07d001bb68e6f07`.
- Final main HEAD at CI verification: `84a64d6`.
- GitHub Actions: `foundation-ci` run `34215453306` PASS for `84a64d6` ([run](https://github.com/zl2796195822/mirror-world/actions/runs/34215453306)).
- Database impact: 5 existing migrations remain; no schema change.
- Next allowed step: record and resolve the Needs pre-T02 decision, then consider `M3-T02`; neither was executed in this task.
