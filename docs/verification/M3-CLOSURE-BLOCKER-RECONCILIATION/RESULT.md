# M3 Closure Blocker Reconciliation

## 1. Review result

`RECONCILIATION_COMPLETE` for the evidence that is available on the current
machine. This is a read-only scope review, not a milestone pass.

The authoritative result is:

- `M3 = IN_PROGRESS`.
- `PRE-AL-GATE = PASS` remains valid only for its declared fixture-only
  `MOVE/SLEEP` profile.
- Two P1 blockers remain for M3 closure. The first is narrowed to the missing
  `EAT`, `WORK`, and `TALK` behavioral lifecycles and their 30x30 coverage.
  `BUY` is not an independent M3 life-target requirement.
- The second is the missing `M3-T05` report plus an unresolved task-definition
  and machine-oracle reconciliation. The task itself does exist in the local
  formal document library.
- No production code, schema, migration, event registry, reducer, test,
  frozen research checkout, `PROJECT_STATE.md`, or `MEMORY.md` was changed by
  this review.

This report does not authorize implementation, a new PRE-AL number, M4/M5/M6,
or any new task number.

## 2. Review baseline

| Field                          | Result                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| Review date                    | 2026-09-10                                                                |
| `CURRENT_ORIGIN_MAIN`          | `a5846b723a11e4902166f6441cc8355904b268f4`                                |
| `CURRENT_HEAD`                 | `a5846b723a11e4902166f6441cc8355904b268f4`                                |
| Branch under review            | `main`                                                                    |
| Main worktree                  | `/Users/alin/AI项目/镜界`                                                 |
| Main worktree status           | clean                                                                     |
| Review branch                  | `review/m3-closure-blocker-reconciliation`                                |
| Review worktree                | `/Users/alin/AI项目/mirror-world-m3-closure-blocker-review`               |
| Review worktree starting point | `a5846b723a11e4902166f6441cc8355904b268f4`                                |
| Review commit                  | final docs-only commit on this branch; recorded after commit verification |
| Production code changed        | no                                                                        |
| Formal state changed           | no                                                                        |
| Frozen research changed        | no                                                                        |

`git fetch origin` completed before the baseline was recorded. The latest main
was unchanged from the previous Final Status Review commit.

### CI

GitHub Actions `foundation-ci` run `34368050309` was inspected through the
public run page. It is attached to `main@a5846b7`, completed with `Success`, and
ran for 3m 23s. The workflow includes frozen install, PostgreSQL setup and
migrations, lint/format, typecheck, unit tests, integration tests, and build.
The only visible warning is the external GitHub Action Node.js 20 deprecation
notice; it is not a project test failure.

The GitHub REST API request was rate-limited (`403`), so the run page is the
current direct CI evidence. No claim is made about unobserved future runs.

## 3. Authority and source order

The accepted authority rule in `docs/adr/ADR-0007-m3-life-engine-needs-model-v1.md:34-38`
is used:

1. Project invariants and accepted ADRs.
2. Current milestone task and DoD.
3. Formal domain specifications and the master document.
4. Verification reports and current implementation facts.
5. `RES-*` research input, which cannot silently become implementation scope.

The formal document library is physically present at
`/Users/alin/AI项目/镜界/文档/镜界_完整开发文档库_v1.2/`, but `文档/` is
ignored by Git. Its `manifest_v1.2.json` records version `1.2`, date
`2026-09-07`, and the hashes of the task book, matrix, master document, Life
Engine specification, World Kernel specification, First Street specification,
and Economy specification. Therefore its contents are directly re-readable
local formal inputs, but their provenance is not represented by the current
Git history.

## 4. M3 formal DoD reconstruction

The M3 milestone target in both the Codex task book and the implementation
matrix is: 30 residents, without LLM, can eat, sleep, work, return home, and
socialize. The task book and matrix each contain the same M3 task table:

| Formal task | Meaning                 | Formal DoD                                                                                                                   |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `M3-T01`    | Resident seed generator | Fixed fixture and distribution snapshot pass                                                                                 |
| `M3-T02`    | Needs model             | Values bounded `0-100`, stable tick                                                                                          |
| `M3-T03`    | Routine/Goal            | Workday/rest-day/sleep/eat routines; goals can reroute routine                                                               |
| `M3-T04`    | Rule decision maker     | Candidate → hard constraints → score → action; no LLM; 30x30 can complete                                                    |
| `M3-T05`    | Story sanity report     | Automatically output resident behavior statistics and anomaly list; no permanent deadlock, teleport, or continuous non-sleep |

The exact local formal sources are:

- `文档/镜界_完整开发文档库_v1.2/00_顶层与索引/镜界_Codex里程碑任务书_v1.0.docx`, table 9, row 6.
- `文档/镜界_完整开发文档库_v1.2/07_实施与Codex/镜界_M0-M13实施规格与依赖矩阵_v1.0.docx`, table 6, row 6.
- `文档/镜界_完整开发文档库_v1.2/03_数字生命与AI/镜界_LifeEngine详细规格_v1.0.docx`, §10 and §11.

The accepted `ADR-0007` behavior table (`:233-258`) makes the intended
behavioral chain explicit: `EAT`, `SLEEP`, `WORK`, `TALK`, and conditional
`BUY`, with `MOVE` used to reach the required location. It also states that
M3 cannot own M4 relationship truth or M6 economic truth.

## 5. M3-T05 provenance

### `M3_T05_PROVENANCE_TABLE`

| Source                                        | Commit/version                                                 | Authority                              | Exact meaning                                                                                                                                                                                                                                                          | Status / DoD                                                                                      | Dependencies                                                  | Conflict / still authoritative                                                                          |
| --------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Codex milestone task book                     | Local `v1.0`; library manifest hash `a58223fc...`              | Formal task book; local ignored source | `M3-T05 Story sanity report`                                                                                                                                                                                                                                           | Not completed; automatic statistics and anomaly list; no deadlock, teleport, continuous non-sleep | M3 T01–T04, 30 residents × 30 days, deterministic facts       | Current local formal source remains authoritative; not Git-tracked                                      |
| M0–M13 implementation/dependency matrix       | Local `v1.0`; manifest hash `8d073599...`                      | Formal implementation matrix           | Repeats the same `M3-T05` row and DoD                                                                                                                                                                                                                                  | Not completed                                                                                     | M3 target, Life Engine and Gate evidence                      | Same authority as task book; not Git-tracked                                                            |
| Life Engine detailed specification            | Local `v1.0`; manifest hash `3090ae2c...`                      | Formal domain specification            | §10 names the 30-day Story Sanity Report; its measures include sleep/work/commute/social counts, need extrema and threshold duration, goal outcomes, relationship changes, economic/employment changes, no-action/rejection/abnormal movement, and behavior similarity | Definition exists, but numeric acceptance oracles are not fully frozen                            | Deterministic Need/Goal/action facts and domain event history | Authoritative semantic input, but requires task-level machine-oracle reconciliation                     |
| Master document / First Street specification  | Local `v1.0`; manifest hashes recorded in `manifest_v1.2.json` | Formal product/architecture input      | M3 life target is broad; First Street lists sleep, eat, work, home, consumption, social, money, inventory, relationship, memory, and offline story                                                                                                                     | Product story is broader than one M3 task                                                         | M4/M5/M6/M7 ownership                                         | Must not override accepted milestone boundaries                                                         |
| `research/m3-life-engine-v1`                  | `7cc36a3f3e0afc013f997acdc051f272401746a5`                     | Research only                          | First Git-traceable detailed sequence: M3-T01 → T02 → T03 → T04 → T05, with full 30x30, replay, fault injection, and Story Sanity                                                                                                                                      | `RESEARCH_ONLY`; not implementation authorization                                                 | Full ActionResult/event/replay domain                         | Useful provenance and test intent; cannot supersede formal task/ADR                                     |
| `docs/verification/M3-FINAL-STATUS-REVIEW.md` | `a5846b7`                                                      | Current closure review                 | Treats T05 as a formal missing closure item and records two P1s                                                                                                                                                                                                        | T05 `NOT COMPLETED`; report absent                                                                | Current Gate artifacts and formal task definitions            | Current review is valid on missing evidence, but its BUY wording is too broad and must be narrowed here |
| `docs/PROJECT_STATE.md`                       | `a5846b7`                                                      | Current project state                  | Says current authority has not named a new `M3-T05`                                                                                                                                                                                                                    | State remains `M3 = IN_PROGRESS`                                                                  | State synchronization                                         | Factually conflicts with the local task book/matrix; do not use it to waive T05                         |

### Provenance conclusion

`M3-T05 = EXISTS`, with `TASK_STATUS = NOT_COMPLETED` and
`DEFINITION_STATUS = CONFLICTED/UNDER-SPECIFIED`.

It is not correct to say that no formal T05 exists. It is correct to say that
there is no independent `M3-T05-report.md` and no completed equivalent Story
Sanity artifact. The earliest Git-traceable detailed mention is research commit
`7cc36a3`; the local formal task book and matrix are earlier-looking formal
inputs but are ignored and therefore have no Git creation history in this
repository.

## 6. Story Sanity definition and machine acceptance

### `STORY_SANITY_REQUIREMENT_MATRIX`

| Requirement                                           | Formal source                               | Current evidence                                                                   | Dependency                                    | Blocks M3?                                                      | Conflict / decision                                        |
| ----------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Exact deterministic 30-resident × 30-World-Day run    | M3 target; Life Engine §10/§11; PRE-AL-GATE | 30 × 30 and 43,200 minutes are proven for `MOVE/SLEEP` profile                     | Driver, leases, replay, clean PostgreSQL      | Yes for life-target closure; old Gate profile itself is PASS    | Profile scope is narrower than original life target        |
| Per-resident sleep/work/commute/social statistics     | Life Engine §10                             | No dedicated report; Gate has sleep-heavy aggregate counts only                    | Accepted domain actions and report generator  | Yes                                                             | T05 report missing                                         |
| Need extrema and time over threshold                  | Life Engine §10                             | Needs/Goals exist; no T05 report or threshold oracle                               | Need policy version and event/result history  | Yes for T05 closure                                             | Metrics are named; numeric thresholds are not fully frozen |
| Goal created/completed/abandoned                      | Life Engine §10                             | Pure Goal evaluator exists; no lifecycle report                                    | Goal evidence and deterministic run           | Yes for T05 closure                                             | Current Gate summaries do not replace report               |
| Relation/economic/employment changes                  | Life Engine §10                             | Relationship/Economy are not M3 runtime authority; work obligation fixture exists  | Must separate M3 observation from M4/M6 facts | No as full domain ownership; yes if claimed as M3 report output | Product story and domain ownership are mixed               |
| No-action/rejection/abnormal movement                 | Life Engine §10; task-book T05 DoD          | Rejection and liveness metrics exist; no complete story report/oracle              | Action outcomes and movement projection       | Yes for report closure                                          | Need exact anomaly rules                                   |
| Same-seed stability and different-seed difference     | Life Engine §11; RES-M3-001                 | A/B digest repeat is proven; full behavior-difference report absent                | Full action/event history                     | Yes for complete T05                                            | Current evidence is only partial                           |
| No permanent deadlock, teleport, continuous non-sleep | Task-book T05 DoD                           | No due work/stagnation/teleport evidence for current profile; no formal T05 output | Full behavior profile and anomaly evaluator   | Yes                                                             | Machine shape exists; thresholds/oracle need formalization |

Story Sanity is therefore primarily **B: validation that resident behavior is
reasonable**, supported by **C: concrete life scenarios**. It is not merely an
architecture-integrity check, and it is not itself a license to implement all
future domain systems. The formal sources make its measurable dimensions clear,
but do not fully specify the numeric thresholds, aggregation rules, or pass/fail
oracle for every qualitative phrase. The correct status is:

`STORY_SANITY_MEASURABLE = PARTIAL`

`FORMAL_GATE_DEFINITION_REQUIRED = YES` for thresholds, anomaly predicates,
minimum coverage, and report schema. This is a task/spec reconciliation item,
not permission to invent thresholds in code.

## 7. Four-action ownership

### `ACTION_OWNERSHIP_MATRIX`

| Action | Behavioral meaning in M3                              | Facts affected                                                                        | Authoritative data                                                                      | Current support                                                                             | Minimum M3 representation                                                                                                                                 | Full owner / full representation                                           | Blocks M3?                |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| `EAT`  | Satisfy hunger when food is available                 | Accepted eating fact and Hunger relief; any inventory decrement must be authoritative | Kernel-owned resource read; formal Economy inventory later                              | Contract + validator only; no resident executor, no accepted event, no need relief in 30x30 | A formally authorized, Kernel-backed accepted EAT lifecycle against a bounded resource scenario, followed by re-observation; no Life-owned resource write | M6 Economy inventory/food consumption and typed accounting/resource replay | Yes, as a life-target gap |
| `WORK` | Fulfill an employment/work obligation                 | Accepted work activity/shift completion; not automatic pay                            | M3 fixture obligation now; formal employment authority later                            | Contract + validator; Goal can emit MOVE to workplace; no WORK completion                   | Kernel-backed work activity/shift completion and re-observation; payroll excluded                                                                         | M6 employment, payroll, payable and arrears                                | Yes, as a life-target gap |
| `TALK` | Minimal structured social contact                     | Accepted social-contact fact and SocialPressure relief                                | Resident/location/communication constraints from Kernel; no relationship truth required | Contract + validator; social Goal can emit MOVE to cafe; no TALK executor or event          | Kernel-backed minimal social lifecycle with no dialogue content requirement                                                                               | M5 Dialogue plus M4 Relationship/Memory effects                            | Yes, as a life-target gap |
| `BUY`  | Conditional acquisition path when food is unavailable | Cash, merchant, offer, stock, inventory, payment, journal, purchase event             | M6 Economy/Kernel executor                                                              | Contract + fixture validator/read-only snapshot only                                        | M3 may read advisory resource state or propose BUY; it must not settle or mutate BUY                                                                      | M6 atomic purchase, accounts, inventory, journal, offer/version and replay | No independent M3 P1      |

The four actions are not interchangeable. The M3 milestone explicitly names
eating, working, and socializing; it does not name purchasing as an independent
life outcome. `BUY` appears in the M2 contract and in the conditional
`MOVE → BUY → EAT` example in ADR-0007. That is sufficient to require a safe
boundary and future-compatible candidate shape, not a second M3 economy.

### EAT scope

`HungerPressure` is a derived Life signal, not a durable world fact. ADR-0007
states that its relief comes from an accepted EAT/nutrition result. The current
code has an EAT schema and validator checks for food, location, capability, and
quantity, but no resident executor or durable resource mutation. The review
does not choose a new event name or resource implementation. Before a future
implementation, the formal task/ADR must decide whether the M3 scenario uses a
Kernel-owned bounded fixture resource with an authoritative delta or a different
existing resource boundary. Life Engine must never decrement inventory or
manufacture hunger relief itself.

### WORK scope

M3 requires a behavioral work path because its target and T03 explicitly include
work, and ADR-0007 defines `WorkObligation → MOVE → WORK`. The minimum is an
accepted work activity/shift fact and a refreshed observation. It does not
include wage calculation, cash transfer, payroll, arrears, or money pressure.
Those are separate M6 processes. A `workplaceId` in a fixture and a MOVE to the
workplace are not evidence of work completion.

### TALK scope

M3 requires social contact, and ADR-0007 defines accepted TALK as the relief
input for `SocialPressure`. The minimum is a structured, location/communication
constrained social action lifecycle. M3 does not require natural-language
dialogue, message storage, relationship changes, memory creation, or LLM
cognition. Those belong to the later M4/M5 boundaries.

### BUY scope

The formal Economy specification and `RES-M6-002` compatibility review define
BUY as an atomic Kernel transaction: buyer cash decreases, merchant cash
increases, merchant stock decreases, buyer inventory increases, journal entries
balance, and a purchase event/outcome is committed together. Accounts, offers,
inventory, journal, and economic replay are absent from current main. Therefore
M3 cannot implement `resident.cash -= ...`, stock mutation, or any Life-owned
purchase ledger. Doing so is `C4_TRUTH_AUTHORITY_RISK` and creates a second
economy truth. The full BUY lifecycle is M6-owned.

## 8. M3/M6 and M3/M4/M5 boundaries

### `M3_M6_BOUNDARY_MATRIX`

| Concept                      | Formal owner                                      | Current implementation                          | M3 read                                | M3 propose              | M3 mutate       | Kernel authority                   | Blocks current M3?                          |
| ---------------------------- | ------------------------------------------------- | ----------------------------------------------- | -------------------------------------- | ----------------------- | --------------- | ---------------------------------- | ------------------------------------------- |
| Need / `HungerPressure`      | Life, derived                                     | Pure evaluator                                  | yes                                    | Goal/candidate pressure | no              | Accepted events/results are inputs | no; EAT lifecycle is separate               |
| Goal                         | Life                                              | Pure evaluator                                  | yes                                    | yes                     | no durable fact | No direct world write              | no                                          |
| Candidate Action             | Life                                              | MOVE/SLEEP only                                 | yes                                    | yes                     | no              | Kernel validates final legality    | yes for missing EAT/WORK/TALK               |
| Work Obligation              | M3 fixture/routine input; future employment owner | Read model and Goal input                       | yes                                    | `WORK` intent           | no              | Accepted work result               | yes until minimal WORK completion is proven |
| EAT Intent                   | Life                                              | Contract/validator only                         | resource advisory                      | yes                     | no              | Kernel action execution            | yes                                         |
| WORK Intent                  | Life                                              | Contract/validator; MOVE-to-workplace candidate | obligation advisory                    | yes                     | no              | Kernel action execution            | yes                                         |
| TALK Intent                  | Life                                              | Contract/validator; MOVE-to-cafe candidate      | location/communication advisory        | yes                     | no              | Kernel action execution            | yes                                         |
| BUY Intent                   | Life advisory                                     | Contract/validator only                         | resource advisory                      | yes, conditionally      | no              | M6 Economy executor in Kernel      | no independent M3 P1                        |
| Resource Snapshot            | Kernel/Economy seam                               | M3 fixture, immutable, `version=0`              | yes                                    | constraint only         | no              | Kernel/Economy provider            | no                                          |
| Inventory / food consumption | Economy + Kernel                                  | absent as durable authority                     | bounded read only if formally provided | candidate only          | no              | M6 Economy executor                | full mutation is not M3                     |
| Merchant offer / price       | Economy                                           | absent                                          | no formal M3 authority                 | no authoritative write  | no              | M6 offer/catalog authority         | no                                          |
| Account / payment            | Economy                                           | absent                                          | no                                     | no                      | no              | M6 Kernel transaction              | no                                          |
| Journal                      | Economy                                           | absent                                          | no                                     | no                      | no              | M6 transaction boundary            | no                                          |
| Payroll / arrears            | Economy                                           | absent                                          | work obligation only                   | no                      | no              | M6 scheduled Kernel process        | no                                          |
| Purchase event               | Economy + Kernel                                  | name listed only; no typed handler              | no                                     | no                      | no              | M6 aggregate event and outcome     | no                                          |

### `M3_M4_M5_BOUNDARY`

| Concept                                 | M3 status                       | Later owner                  | Current fact                                                       |
| --------------------------------------- | ------------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| `SocialPressure`                        | M3 CORE derived signal          | Life                         | Exists in pure evaluator                                           |
| TALK intent                             | M3 candidate/lifecycle boundary | Kernel commits accepted fact | Contract/validator only                                            |
| Observation                             | M3 read-only input              | Kernel/query boundary        | Existing bounded observation; some capabilities remain unavailable |
| Conversation content                    | Not required by M3              | M5 Dialogue                  | No M3 implementation                                               |
| Message/summary                         | Not required by M3              | M5 Dialogue                  | No M3 implementation                                               |
| Relationship/familiarity/trust/conflict | Not required by M3              | M4 Relationship              | Must not be added to close TALK                                    |
| Memory/timeline                         | Not required by M3              | M4 Memory                    | Must not be added to close TALK                                    |
| LLM cognition                           | Not required by M3              | M5 Agent Runtime             | M3 remains zero-LLM                                                |

## 9. Action contract depth

The contract is a six-action discriminated union in
`packages/contracts/src/action-contract.ts:40-83`. The database check constraint
and validator also list all six, but this is not execution evidence.

### `ACTION_IMPLEMENTATION_DEPTH_TABLE`

| Action  | Declared L0 | Candidate-capable L1                      | Kernel-validatable L2  | Lifecycle-executable L3 | Replayable L4       | Gate-proven L5                                        | Current conclusion                                                            |
| ------- | ----------- | ----------------------------------------- | ---------------------- | ----------------------- | ------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `MOVE`  | yes         | yes                                       | yes                    | yes                     | yes                 | yes for current semantics/synthetic and Gate evidence | Full current action depth; no selected MOVE in the main 30x30 baseline stream |
| `SLEEP` | yes         | yes                                       | yes                    | yes                     | yes                 | yes for current profile                               | Full current action depth; 127 starts and 126 completions in Gate stream      |
| `EAT`   | yes         | no                                        | yes, fixture validator | no                      | no typed M3 reducer | no                                                    | `L0 + L2` only                                                                |
| `WORK`  | yes         | no WORK candidate; only MOVE-to-workplace | yes, fixture validator | no                      | no typed M3 reducer | no                                                    | `L0 + L2` only                                                                |
| `TALK`  | yes         | no TALK candidate; only MOVE-to-cafe      | yes, fixture validator | no                      | no typed M3 reducer | no                                                    | `L0 + L2` only                                                                |
| `BUY`   | yes         | no                                        | yes, fixture validator | no                      | no economic reducer | no                                                    | `L0 + L2` only; M6-owned completion                                           |

The resident executor explicitly accepts only `MOVE` and `SLEEP`
(`packages/world-kernel/src/resident-action-executor.ts:82-86,407-423`). The
rule decision candidate type is also only `MOVE | SLEEP`
(`packages/life-engine/src/rule-decision.ts:174-207`). Hunger and social goals
are explicitly marked infeasible, while the work goal maps to a MOVE only
(`rule-decision.ts:360-371,494-515`). This is the decisive implementation
evidence.

## 10. Story Sanity closure matrix

### `STORY_SANITY_CLOSURE_MATRIX`

| Behavior              | Formal M3 requirement    | Current depth/evidence                                 | Domain owner                              | Missing lifecycle / authority                                        | Replay support               | Blocks Story Sanity?            | Disposition                                                            |
| --------------------- | ------------------------ | ------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------- | ---------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Sleep                 | yes                      | L5; real start/completion and 30x30 occurrences        | M3 + Kernel                               | none for current profile                                             | typed reducer and projection | no by itself                    | retain and include per-resident report                                 |
| Move / commute / home | yes                      | L5 semantics; no MOVE in selected main baseline stream | M3 + Kernel                               | 30x30 coverage and report evidence                                   | typed reducer                | yes for complete story coverage | rerun with behavior profile                                            |
| Eat                   | yes                      | L2 validator only; no 30x30 event                      | M3 behavior + Kernel resource boundary    | accepted EAT lifecycle and need relief; no Life-owned resource write | absent                       | yes                             | formalize bounded resource scenario, then implement in a separate task |
| Work                  | yes                      | L2 validator; obligation and MOVE-to-workplace only    | M3 behavior + Kernel; M6 payroll later    | accepted work completion                                             | absent                       | yes                             | implement activity/shift only; defer payroll                           |
| Talk                  | yes                      | L2 validator; social Goal and MOVE-to-cafe only        | M3 behavior + Kernel; M4/M5 content later | accepted structured social contact                                   | absent                       | yes                             | implement minimal social lifecycle; defer dialogue/memory/relationship |
| Buy                   | no independent M3 target | L2 validator/read-only resource input                  | M6 Economy + Kernel                       | accounts/offer/stock/inventory/journal/atomicity                     | absent                       | no independent M3 block         | keep advisory only; do not mutate in M3                                |

## 11. Reassessment of the two Final Review FAILs

### FAIL-1: EAT/WORK/TALK/BUY lifecycle missing

This is factually correct as an implementation observation but too broad as a
single M3 requirement. The M3 target and accepted ADR require the resident
behavioral meaning of `EAT`, `WORK`, and `TALK`; the current run proves none of
their accepted lifecycles. That remains `P1 BLOCKS_M3`.

`BUY` is different. It is a declared contract and conditional acquisition path,
not an independent M3 milestone target. Its complete lifecycle would require
M6 account, offer, inventory, journal, atomic settlement, and economic replay
authority. Treating missing full BUY settlement as a separate M3 P1 would
conflict with the formal M6 ownership boundary. FAIL-1 must therefore be
reworded as:

> M3 behavioral lifecycle gap: EAT, WORK, and TALK are not executable or
> represented in the 30x30 Story Sanity evidence; BUY remains a read-only,
> advisory, future-M6 boundary and is not an independent M3 closure blocker.

### FAIL-2: M3-T05 Story Sanity closure missing

This is factually correct and remains a P1. The formal task exists in the local
task book and dependency matrix, but no `M3-T05` report or equivalent report is
present. The Gate artifacts prove runtime invariants for the narrower
`MOVE/SLEEP` profile; they do not produce the required per-resident story
statistics, anomaly list, or full behavior coverage. The `PROJECT_STATE` claim
that no T05 exists is a document conflict and cannot waive the task.

The T05 task definition is also not sufficiently machine-complete: the required
dimensions are named, but exact thresholds and anomaly predicates are not
fully frozen. This is `FORMAL_TASK_DEFINITION_REQUIRED` and
`SPEC_RECONCILIATION_REQUIRED` before implementation or acceptance.

## 12. Conflict register

### `AUTHORITY_CONFLICT_REGISTER`

| ID     | Level                           | Conflict                                                                                                   | Disposition                                                                                                                    |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| C2-001 | C2 SCOPE_AMBIGUITY              | Story Sanity names qualitative reasonableness and anomaly terms without a complete numeric oracle          | Freeze report schema, coverage rules, thresholds, and anomaly predicates in formal task/spec reconciliation                    |
| C2-002 | C2 SCOPE_AMBIGUITY              | WORK appears as both behavioral activity and wider employment/payroll story                                | M3 owns accepted work behavior; M6 owns payroll, wages, arrears, and economic employment facts                                 |
| C2-003 | C2 SCOPE_AMBIGUITY              | TALK is a M3 social behavior target but product documents also describe dialogue, relationship, and memory | M3 minimum is structured social contact; M4/M5 retain relationship, memory, and dialogue                                       |
| C3-001 | C3 MILESTONE_OWNERSHIP_CONFLICT | Formal task book/matrix define M3-T05 while `PROJECT_STATE` says no new M3-T05 exists                      | Treat T05 as existing and current; propose a documentation correction only after formal synchronization authority is confirmed |
| C3-002 | C3 MILESTONE_OWNERSHIP_CONFLICT | Final Review groups BUY lifecycle absence into the M3 action-domain P1 although full BUY authority is M6   | Narrow the M3 P1 to EAT/WORK/TALK; preserve BUY as an M6 boundary                                                              |
| C4-001 | C4 WORLD_TRUTH_AUTHORITY_RISK   | A Life-owned `cash`, `price`, `stock`, or `journal` mutation would create a second economy truth           | Prohibit; all economic settlement remains Kernel/M6-owned and transactionally atomic                                           |

Counts: `C0=0`, `C1=0`, `C2=3`, `C3=2`, `C4=1`, `C5=0`.

## 13. Replay, T04, and Gate impact

### Replay impact

Future accepted `EAT`, `WORK`, and `TALK` lifecycles would require, before any
closure claim:

- versioned event payloads and registry entries;
- action outcome association and idempotent start/completion semantics;
- resident projection reducers for live, full replay, suffix replay, and
  genesis rebuild;
- deterministic Need/Goal re-observation from accepted facts;
- checkpoint and manifest semantic-hash updates;
- rejection, conflict, rollback, fault-injection, isolation, and replay tests;
- a new deterministic 30x30 digest and per-resident report.

`BUY` additionally requires accounts, offers, inventory, journal, lock order,
resource revision, atomicity, and economic replay reconciliation. Those are M6
impact items, not M3 implementation scope.

### `M3_T04_EXTENSION_IMPACT`

The next implementation task, if formally authorized, would need to extend the
candidate and action-loop boundary for the M3-owned EAT/WORK/TALK lifecycles:

- candidate types, mappings, hard constraints, scoring, and stable keys;
- ActionRequest construction and bounded failure/replan handling;
- observation capabilities for accepted resource, workplace, and participant
  facts;
- Kernel execution and due completion while preserving `Scheduler = WHEN`,
  `Life Engine = WHAT`, `World Kernel = CAN / COMMIT`;
- typed event/reducer/replay coverage and deterministic report inputs.

No change to the accepted MOVE/SLEEP semantics is authorized by this review.
No BUY settlement extension is included.

### PRE-AL-GATE impact

The historical `PRE-AL-GATE = PASS` remains valid for its old declared
`MOVE/SLEEP` profile. Because EAT/WORK/TALK add new action facts, events,
reducers, and behavior coverage, an equivalent full deterministic/replay/fault
gate is **REQUIRED** before M3 can close. Whether the project names that run a
re-run of `PRE-AL-GATE` or a formally defined M3-specific extension must be
resolved with the task definition; it cannot be inferred from the old PASS.

## 14. P1 reclassification and minimum next scope

### `P1_RECLASSIFICATION`

| Classification                 | Items                                                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `P1_BLOCKS_M3`                 | EAT accepted lifecycle and 30x30 evidence; WORK accepted activity/shift lifecycle and evidence; TALK accepted structured social lifecycle and evidence; complete MOVE/commute/home behavior coverage in the same Story Sanity run |
| `P1_BLOCKS_M3_TASK_DEFINITION` | M3-T05 report absent; task/`PROJECT_STATE` conflict; Story Sanity machine-oracle thresholds and anomaly predicates not fully frozen                                                                                               |
| `P2_POST_M3`                   | causation-id/event payload evolution and later scheduler operational hardening already classified by Final Review                                                                                                                 |
| `P3_FUTURE_MILESTONE`          | BUY settlement, accounts, inventory, journal, payroll, arrears, full economic replay; Dialogue, Memory, Relationship, LLM cognition; 3D, realtime, offline world, and scaling                                                     |
| `ADR_REQUIRED`                 | Only if the formal reconciliation changes the accepted EAT resource boundary, WORK fact contract, TALK fact/event contract, or action/replay authority                                                                            |
| `SPEC_RECONCILIATION_REQUIRED` | Yes: reconcile task book/matrix, Life Engine §10/§11, ADR-0007, Final Review wording, and `PROJECT_STATE`                                                                                                                         |
| `RESEARCH_INPUT_ONLY`          | RES-M3-001, RES-M6-001, RES-M6-002 and all other research conclusions; none are implementation authorization                                                                                                                      |

### Recommended minimum implementation scope

Recommendation only; not a formal task authorization:

1. Formally reconcile the T05 task row, report schema, coverage minimums,
   thresholds, anomaly predicates, and the `PROJECT_STATE` wording.
2. Define the smallest Kernel-backed EAT, WORK, and TALK accepted lifecycles
   needed by the already stated M3 target. Keep EAT resource facts
   Kernel-owned, WORK payroll out of scope, and TALK content/Memory/Relationship
   out of scope.
3. Extend the M3-T04 candidate/action-loop and replay/report evidence only for
   those three M3 behavioral actions.
4. Run a new deterministic 30x30 Story Sanity report and the required replay,
   fault, isolation, liveness, and anomaly checks.
5. Re-run M3 Final Status Review. Do not enter M4 until it passes.

`BUY` should remain an advisory candidate/resource boundary until the formally
authorized M6 Economy task establishes its authority.

## 15. Final handoff fields

|   # | Field                                    | Result                                                                                                                                                 |
| --: | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | Current origin/main                      | `a5846b723a11e4902166f6441cc8355904b268f4`                                                                                                             |
|   2 | Review baseline                          | Latest main; current PRE-AL-GATE artifacts; clean                                                                                                      |
|   3 | Branch                                   | `review/m3-closure-blocker-reconciliation` for this docs-only report; source baseline is `main`                                                        |
|   4 | Worktree                                 | `/Users/alin/AI项目/mirror-world-m3-closure-blocker-review`                                                                                            |
|   5 | Review commit                            | pending docs-only commit                                                                                                                               |
|   6 | CI                                       | `foundation-ci` run `34368050309`: Success for `a5846b7`                                                                                               |
|   7 | M3 formal DoD source                     | Local task book table 9, matrix table 6, Life Engine §10/§11, ADR-0007                                                                                 |
|   8 | M3-T05 exists?                           | `EXISTS`                                                                                                                                               |
|   9 | M3-T05 authority level                   | Formal local task book/matrix; ignored by Git, hash-recorded in library manifest                                                                       |
|  10 | M3-T05 exact purpose                     | Automatic resident behavior statistics and anomaly list after the 30-day life run                                                                      |
|  11 | Story Sanity formal definition           | Resident behavior coverage/metrics/anomaly report; primarily reasonableness validation with concrete life scenarios                                    |
|  12 | Story Sanity measurable?                 | `PARTIAL`; metric dimensions exist, full machine oracle does not                                                                                       |
|  13 | Story Sanity definition conflict?        | Yes: task/state wording conflict and acceptance thresholds under-specified                                                                             |
|  14 | EAT required by M3?                      | Yes                                                                                                                                                    |
|  15 | EAT required depth                       | Accepted M3 behavioral lifecycle plus re-observation/Need relief; no M3-owned economy                                                                  |
|  16 | EAT owner                                | M3 Life behavior + Kernel commit; resource authority Kernel/Economy                                                                                    |
|  17 | EAT P1?                                  | Yes                                                                                                                                                    |
|  18 | WORK required by M3?                     | Yes                                                                                                                                                    |
|  19 | WORK required depth                      | Accepted work activity/shift completion; no payroll                                                                                                    |
|  20 | WORK owner                               | M3 behavioral lifecycle + Kernel; M6 employment/payroll later                                                                                          |
|  21 | Payroll required by M3?                  | No                                                                                                                                                     |
|  22 | WORK P1?                                 | Yes                                                                                                                                                    |
|  23 | TALK required by M3?                     | Yes                                                                                                                                                    |
|  24 | TALK required depth                      | Minimal structured social-contact lifecycle; no dialogue content                                                                                       |
|  25 | TALK owner                               | M3 social behavior + Kernel; M4/M5 relationship/memory/dialogue later                                                                                  |
|  26 | Dialogue required by M3?                 | No                                                                                                                                                     |
|  27 | Memory/Relationship required by M3?      | No                                                                                                                                                     |
|  28 | TALK P1?                                 | Yes                                                                                                                                                    |
|  29 | BUY required by M3?                      | No as an independent lifecycle; conditional advisory path only                                                                                         |
|  30 | BUY required depth                       | Read/propose bounded advisory; no settlement or mutation                                                                                               |
|  31 | BUY owner                                | M6 Economy executor through Kernel                                                                                                                     |
|  32 | Economy authority required?              | Yes for any BUY mutation, including price/account/inventory/journal                                                                                    |
|  33 | BUY P1?                                  | No independent M3 P1; it is a future M6 blocker                                                                                                        |
|  34 | M3/M6 conflict result                    | Narrow M3 to advisory BUY; full settlement is M6; `C4_TRUTH_AUTHORITY_RISK` if Life mutates                                                            |
|  35 | M3/M4/M5 conflict result                 | TALK lifecycle is M3-minimal; dialogue, memory, relationship, and LLM remain later                                                                     |
|  36 | Current Action Contract depth            | Six actions declared and validator-tested; only MOVE/SLEEP resident-executable                                                                         |
|  37 | MOVE depth                               | L5 for current semantics/profile; main 30x30 occurrence is not representative                                                                          |
|  38 | SLEEP depth                              | L5 for current profile                                                                                                                                 |
|  39 | EAT depth                                | L0 + L2; not executable/replayable/gate-proven                                                                                                         |
|  40 | WORK depth                               | L0 + L2; only MOVE-to-workplace candidate                                                                                                              |
|  41 | TALK depth                               | L0 + L2; only MOVE-to-cafe candidate                                                                                                                   |
|  42 | BUY depth                                | L0 + L2; no economy execution/replay                                                                                                                   |
|  43 | Final Review FAIL-1                      | Correct gap, over-broad wording; retain P1 for EAT/WORK/TALK, remove BUY as independent M3 P1                                                          |
|  44 | Final Review FAIL-2                      | Correct; T05 exists but report is absent and definition/state wording needs reconciliation                                                             |
|  45 | Number of C0 conflicts                   | 0                                                                                                                                                      |
|  46 | Number of C1 conflicts                   | 0                                                                                                                                                      |
|  47 | Number of C2 conflicts                   | 3                                                                                                                                                      |
|  48 | Number of C3 conflicts                   | 2                                                                                                                                                      |
|  49 | Number of C4 conflicts                   | 1                                                                                                                                                      |
|  50 | Number of C5 conflicts                   | 0                                                                                                                                                      |
|  51 | Replay impact                            | New typed facts, reducers, outcome association, digest, checkpoint/suffix/genesis and fault evidence for EAT/WORK/TALK; economic replay deferred to M6 |
|  52 | M3-T04 extension impact                  | Candidate/constraints/score/action loop/replan/observation/scheduler due and replay extensions; no MOVE/SLEEP rewrite                                  |
|  53 | PRE-AL-GATE rerun required?              | `REQUIRED` as equivalent full gate for changed action/replay domain; exact task label needs formal reconciliation                                      |
|  54 | True remaining M3 P1 count               | 2                                                                                                                                                      |
|  55 | True remaining M3 P1 blockers            | Behavioral lifecycle/coverage gap; M3-T05 report and task-definition/oracle reconciliation                                                             |
|  56 | Spec reconciliation required?            | Yes                                                                                                                                                    |
|  57 | ADR required?                            | Conditional: yes before changing accepted authority/event/resource boundaries; not to write this review                                                |
|  58 | Formal task definition required?         | Yes, for machine-complete T05 oracle and corrected state synchronization                                                                               |
|  59 | Recommended minimum implementation scope | EAT/WORK/TALK minimal Kernel-backed behavior only, followed by full Story Sanity evidence                                                              |
|  60 | NEXT_ALLOWED_ACTION                      | `FORMAL_SPEC_RECONCILIATION_REQUIRED` + `FORMAL_TASK_DEFINITION_REQUIRED`; then separately authorized implementation and new Final Review              |
|  61 | M3 final state after review              | `IN_PROGRESS`                                                                                                                                          |
|  62 | `PROJECT_STATE` changed?                 | No                                                                                                                                                     |
|  63 | `MEMORY` changed?                        | No                                                                                                                                                     |
|  64 | Production code changed?                 | No                                                                                                                                                     |
|  65 | Report path                              | `docs/verification/M3-CLOSURE-BLOCKER-RECONCILIATION/RESULT.md` on review branch                                                                       |
|  66 | `HEAD == origin/main`?                   | Yes for source main baseline; review branch intentionally carries the report commit afterward                                                          |
|  67 | Worktree clean?                          | Yes before report authoring; will be verified after commit                                                                                             |
|  68 | STOP confirmation                        | Yes: no implementation, no new formal number, no M4/M5/M6, no frozen research change                                                                   |

## 16. Stop condition

`STOP = CONFIRMED`.

The next allowed action is not an automatic implementation. It is formal
specification/task-definition reconciliation. After that decision is accepted,
the project may authorize a separate implementation task using the formal name
that is selected; this review does not invent one.
