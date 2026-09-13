# M3 Lifecycle Story Gate v2 Rerun — run-29 Verification Report

Date: 2026-09-13  
Run ID: `20260913-run-29`  
Status: **`FAIL` (Hard Gate #3 Accepted action coverage)**  
Milestone: **M3 = IN_PROGRESS** (not PASS)

## Outcome

Formal Story Gate completed under the **amended 5-World-Day** contract.  
Finalizer ran. Result is **14 / 15 Hard Gates PASS**.  
**Hard Gate #3 = FAIL**. Therefore **M3-LIFECYCLE-STORY-GATE = FAIL**.  
**M3-T05 was not executed.**

## Contract amendment (2026-09-13)

| Field | Value |
| --- | --- |
| Prior horizon | 30 World Days / 43,200 World Minutes |
| **Current horizon** | **5 World Days / 7,200 World Minutes** |
| Start World Time | `2026-09-07T00:00:00.000Z` |
| Target World Time | `2026-09-12T00:00:00.000Z` |
| Residents | 30 (unchanged) |
| Companion needs change | social pressure rate `0.35 → 1.2` per world hour |

Authorized product decision. Historical 30-day runs (`run-08`, `run-20`, …) are **not** reclassified.

## Run profile

| Field | Value |
| --- | --- |
| Branch / worktree | `gate/m3-lifecycle-story-v2-rerun` |
| Starting / final `origin/main` | `b7745336e00a6636fb8a53a23b1dfe75e214a0ea` (unchanged this task) |
| Coverage contract | `m3-story-gate-coverage-v2` + 5-day amendment |
| Story Sanity | `m3-story-sanity-v2` |
| Runner strategy | serial child per scenario |
| Child heap | 8192 MB |
| PostgreSQL | disposable `18.6-alpine` × 3 |
| Artifact root | `docs/verification/artifacts/M3-LIFECYCLE-STORY-GATE/20260913-run-29/` |

## Endpoint and determinism

| Field | Value |
| --- | --- |
| World Time reached | **`2026-09-12T00:00:00.000Z`** |
| World Minutes reached | **7200** |
| Final `worldSeq` (baseline) | `2253` |
| Endpoint settle | **PASS** (`remainingActiveActivities=0`, `remainingDueWakes=0`) |
| baseline storyDigest | `c50afc82745d7d2bda87d7fb295853573741d6e0858581a08341fff385d61622` |
| repeat storyDigest | **equal** |
| different-seed digest | distinct (`c309769d…`) |
| live / full / suffix / genesis replay hashes | **all equal** (`379ccf7737ccddf71945234b43a9ce98e58e6272c1a457169c8e73e42f033f79`) |
| LLM path / BUY committed | **0 / 0** |
| WORK_ABSENCE | **0** |

## Hard Gates

| # | Gate | Result |
| ---: | --- | --- |
| 1 | Run endpoint | PASS |
| 2 | Fixture integrity | PASS |
| **3** | **Accepted action coverage** | **FAIL** |
| 4 | Causal chain | PASS |
| 5 | Need response | PASS |
| 6 | Need effect | PASS |
| 7 | Work obligation | PASS |
| 8 | Resource conservation | PASS |
| 9 | TALK legality / atomicity | PASS |
| 10 | Bounded recovery | PASS |
| 11 | Liveness | PASS |
| 12 | Spatial / activity safety | PASS |
| 13 | Replay equivalence | PASS |
| 14 | Determinism | PASS |
| 15 | Isolation / scope | PASS |

**PASS count: 14 · FAIL count: 1**

## Gate #3 detail (baseline = repeat)

| Action | Completed unique | Feasible missing | Result |
| --- | ---: | ---: | --- |
| SLEEP | 30 | 0 | PASS |
| WORK | 26 | 0 | PASS |
| MOVE | 26 | 0 | PASS |
| **EAT** | **20** | **5** | **FAIL** |
| **TALK** | **27** | **2** | **FAIL** |

### EAT missing (baseline)

`247ca98f…`, `390f66d0…`, `7bdde7d3…`, `849cf567…`, `a5d97bf2…`

Likely resource-unavailable / never completed within 5-day horizon under faster social dynamics. Not treated as automatic pass under Coverage v2.

### TALK missing (baseline / repeat)

Same two residents as prior attempts:

- `53857cc8-114a-5877-af02-14da434bc1d1`
- `764ec258-67d8-507c-ab11-ab283991c9fa`

Social rate boost + MOVE-to-cafe + critical-social bonus raised TALK from **0 → 27** in smoke and **27/30** here, but **these two still never complete a paired contact**.

### different-seed

Same pattern: EAT 20/30 miss 5; TALK 27/30 miss 2 (different resident IDs).

## Diagnostics (baseline)

| Diagnostic | Count |
| --- | ---: |
| STARVATION_RISK | 5 |
| RESOURCE_DEPLETION | 25 |
| SOCIAL_STARVATION | 7 |
| WORK_ABSENCE | 0 |
| LLM_PATH_USED | 0 |
| UNEXPECTED_BUY_EXECUTION | 0 |
| REPLAY / DETERMINISM / ISOLATION | 0 |

## Remediation history in this worktree (not merged as product policy unless stated)

1. Runner streaming JSON validation (large coverage files)  
2. Coverage v2 lineage fields in worktree runner  
3. `workCapable` for CAFE/STORE workplaces  
4. `SOCIAL_OPPORTUNITY` context + MOVE-to-cafe when no local partner  
5. Critical social urgency bonus (`socialPressure ≥ 90`)  
6. Horizon settle guard (do not start actions that cannot finish before target)  
7. Formal contract amendment: **5 World Days** + social rate **1.2/h**

## Formal state

| Field | Value |
| --- | --- |
| M3-LIFECYCLE-STORY-GATE | **FAIL** (`run-29`, Gate #3) |
| M3 | **IN_PROGRESS** |
| M3-T05 | `DEFINED / NOT_STARTED` (not executed) |
| Final Status Review #2 | not executed |
| M4+ | not entered |
| NEXT_ALLOWED_FORMAL_TASK | Fix EAT/TALK coverage under 5-day contract, then new immutable run |

## STOP confirmation

- No production Kernel / fixture / seed rewrite  
- No reclassification of `run-08` / `run-14` / `run-20`  
- No fabricated PASS  
- M3 not marked PASS  
