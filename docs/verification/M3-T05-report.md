# M3-T05 Story Sanity Report

Date: 2026-09-13  
Task: `M3-T05`  
Status: **`PASS`**  
Source run: `20260913-run-42`  
Story Gate: `PASS` (15/15)

## Identity

| Field | Value |
| --- | --- |
| Task ID | M3-T05 |
| Name | Story Sanity Report |
| Previous status | DEFINED / NOT_STARTED |
| **Current status** | **PASS** |
| Required predecessor | M3-LIFECYCLE-STORY-GATE = PASS |
| Frozen input | 19_M3_T05_FORMAL_TASK_SPEC.md + Coverage Contract v2 (5-day amendment) |

## Run contract (executed)

| Field | Value |
| --- | --- |
| Residents | 30 |
| World Days | **5** (amended 2026-09-13; was 30) |
| World Minutes | **7,200** |
| Start / Target | `2026-09-07T00:00:00Z` → `2026-09-12T00:00:00Z` |
| Actions | MOVE, SLEEP, EAT, WORK, TALK |
| BUY | non-executable |
| PostgreSQL | disposable clean × 3 |
| LLM | 0 |

## Hard Gates

**15 / 15 PASS** — see `hard-gates.json` in run-42 artifacts.

## Behavior statistics (baseline)

| Metric | Value |
| --- | --- |
| Action attempts | 574 |
| Committed | 574 |
| Rejected / conflicts | 0 / 0 |
| Replans | 0 |
| Deferred | 33,905 |
| Final worldSeq | 2304 |
| Causal evidence rows | 574 |

### Coverage

| Action | Unique completed | Pass |
| --- | ---: | --- |
| SLEEP | 30 | yes |
| EAT | 25 | yes |
| WORK | 26 | yes |
| TALK | 30 | yes |
| MOVE | 30 | yes |

## Replay / determinism

| Hash | Value |
| --- | --- |
| live | `e13c339f3ab21cd8a7e4bb3d9b06058ec6bd1050e3e78d6c096499bd8d719fe3` |
| full | same |
| suffix | same |
| genesis rebuild | same |
| baseline digest | `8e75500e1685a45a857c891b75247ce44d4a544ba9b6bbae23e91e72cbe32dca` |
| repeat digest | **equal** |
| different-seed digest | `a98f94f1…` (distinct) |

## Diagnostics (including zeros)

| Class | Count |
| --- | ---: |
| STARVATION_RISK | 0 |
| RESOURCE_DEPLETION | 26 |
| SLEEP_RESPONSE_DELAY | 0 |
| SOCIAL_STARVATION | 4 |
| WORK_ABSENCE | 0 |
| WORK_LATE_ATTEMPT | 0 |
| PERMANENT_DEFER | 0 |
| REPLAN_EXHAUSTION | 0 |
| NO_ACTION_PROGRESS | 0 |
| INVALID_LOCATION_ACTIVITY | 0 |
| REPLAY_MISMATCH | 0 |
| DETERMINISM_MISMATCH | 0 |
| ISOLATION_VIOLATION | 0 |
| UNEXPECTED_BUY_EXECUTION | 0 |
| LLM_PATH_USED | 0 |

Non-zero `RESOURCE_DEPLETION` / `SOCIAL_STARVATION` are bounded diagnostics;
Hard Gates #3/#8 remain PASS. Not a waiver of any gate.

## DoD checklist

| Requirement | Result |
| --- | --- |
| 15 Hard Gates | PASS |
| Causal evidence for accepted actions | PASS (574/574 committed) |
| Need/work/resource/TALK/failure/liveness/isolation/replay/determinism | PASS |
| BUY negative boundary | PASS (0 accepted) |
| Same-manifest repeat digest | PASS |
| Report does not mutate world | PASS (read-only artifacts) |
| Clean PostgreSQL | PASS |
| Git evidence | worktree `gate/m3-lifecycle-story-v2-rerun`; not merged to main yet |

## Result

**M3-T05 = PASS**

## Remaining for full M3 PASS

1. Merge / CI on main for runner + life-engine changes used by run-42  
2. Final Status Review #2  
3. Then update PROJECT_STATE: `M3 = PASS`
