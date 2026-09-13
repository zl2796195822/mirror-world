# M3 Lifecycle Story Gate — run-42 PASS Report

Date: 2026-09-13  
Run ID: `20260913-run-42`  
Status: **`PASS` — 15 / 15 Hard Gates**  
Milestone: **M3 remains `IN_PROGRESS`** until M3-T05 and Final Status Review #2.

## Result

| Field                     | Value                                           |
| ------------------------- | ----------------------------------------------- |
| **Story Gate**            | **PASS**                                        |
| Hard Gates                | **15 PASS / 0 FAIL**                            |
| Coverage contract         | `m3-story-gate-coverage-v2` + 5-day amendment   |
| Story Sanity              | `m3-story-sanity-v2`                            |
| Horizon                   | 30 residents × **5 World Days** = 7,200 minutes |
| Target World Time         | `2026-09-12T00:00:00.000Z`                      |
| Endpoint settle           | PASS (`active=0`, `dueWakes=0`)                 |
| baseline == repeat digest | **PASS**                                        |
| four replay hashes        | **equal**                                       |
| acceptedActionCoverage    | **true**                                        |
| Zero-LLM / BUY            | 0 / 0                                           |

## Coverage (baseline)

| Action   | Completed unique |  Miss | Result   |
| -------- | ---------------: | ----: | -------- |
| SLEEP    |               30 |     0 | PASS     |
| EAT      |               25 |     0 | PASS     |
| WORK     |               26 |     0 | PASS     |
| **TALK** |           **30** | **0** | **PASS** |
| MOVE     |               30 |     0 | PASS     |

## Root-cause fix (this run)

`locationsFor(worldId)` omitted `kind`, so Rule Decision could not resolve
`CAFE`/`PARK` for social travel. Two unemployed residents stayed at HOME with
`NO_FEASIBLE_CANDIDATE` forever. Adding `kind` restored MOVE-to-cafe and
paired TALK (smoke: both residents MOVE+TALK; full run: TALK 30/30).

Companion 5-day-horizon policy already in place: hunger/social rates and
activation thresholds; SOCIAL_OPPORTUNITY at home when no legal local partner.

## Artifacts

`docs/verification/artifacts/M3-LIFECYCLE-STORY-GATE/20260913-run-42/`

- `hard-gates.json`, `run-summary.json`, `scenario-summaries.json`
- `scenarios/{baseline,repeat,different}/` full evidence

## Formal next steps (not done)

| Step                                | Status                        |
| ----------------------------------- | ----------------------------- |
| Story Gate 15/15                    | **PASS**                      |
| Repo validation + CI on merged code | **not done** in this worktree |
| M3-T05                              | **not started**               |
| Final Status Review #2              | **not done**                  |
| **M3 = PASS**                       | **not yet**                   |

Do **not** mark M3 PASS until T05 and Final Review #2 complete.
