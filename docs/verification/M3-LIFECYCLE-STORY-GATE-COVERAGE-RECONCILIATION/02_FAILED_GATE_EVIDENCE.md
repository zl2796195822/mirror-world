# 02 Failed Gate Evidence

## Run contract

`20260910-run-08` used 30 residents, 43,200 World Minutes, start
`2026-09-07T00:00:00.000Z`, target `2026-10-07T00:00:00.000Z`, fixed seed,
`m3-rule-decision-v2`, `m3-action-loop-v2`, `m3-scheduler-v2`, PostgreSQL
Event Ledger, and zero LLM calls. `BUY` remained non-executable.

The run reached `worldSeq=10668` with 1,919 action starts, all 1,919
committed, zero rejected/conflicts, and 34,624 deferred decisions. Endpoint
state had no active activities and no due wakes.

## Hard gates

|                       Gate | Result          |
| -------------------------: | --------------- |
|                          1 | PASS            |
|                          2 | PASS            |
| 3 Accepted action coverage | **FAIL**        |
|                       4-15 | PASS (12 gates) |

Thus the formal failure is confirmed and is limited to Hard Gate #3. The
supporting diagnostics are not additional failed hard gates.

## Action counts

| Action | Starts/attempts | Committed | Completed action starts |
| ------ | --------------: | --------: | ----------------------: |
| MOVE   |             950 |       950 |                     950 |
| SLEEP  |             702 |       702 |                     702 |
| EAT    |              60 |        60 |                      60 |
| WORK   |               4 |         4 |                       4 |
| TALK   |             203 |       203 |                     203 |

Resident coverage is different from action count:

| Requirement                                     |         Observed resident coverage |
| ----------------------------------------------- | ---------------------------------: |
| SLEEP                                           |                              30/30 |
| EAT                                             |                              25/30 |
| WORK, employed residents                        | 3/26 residents; 4 completed starts |
| TALK, initiators                                |                              19/30 |
| TALK, paired contact participants or initiators |                              24/30 |
| MOVE                                            |                              26/30 |
| Employed workplace/home commute existence       |                              26/26 |

The source report's `4/26` WORK wording is an action-start count. The
resident-level coverage is `3/26`; `WORK_ABSENCE=23` confirms the latter.

## Diagnostics

| Diagnostic           | Count | Review interpretation                                                    |
| -------------------- | ----: | ------------------------------------------------------------------------ |
| `RESOURCE_DEPLETION` |    30 | final food reaches zero; not proof of an illegal resource write          |
| `SOCIAL_STARVATION`  |    11 | current verifier counts initiators without TALK completion               |
| `WORK_ABSENCE`       |    23 | employed residents without a completed WORK                              |
| all other 12 classes |     0 | includes replay, determinism, invalid state, late WORK, replan, BUY, LLM |

The current Gate script derives `SOCIAL_STARVATION` and `WORK_ABSENCE` from
absence of completed action, not from a persisted opportunity funnel. The
review therefore preserves those counts while separating confirmed facts from
unproven opportunity claims.

## Replay and determinism

Live, full replay, checkpoint suffix replay, and deleted-checkpoint genesis
rebuild all equal:

```text
899da98acfa86803f972c80d8649b236d9e2f8e16ae625f1965ebcf4bd120b82
```

Same-seed story digest is equal and different-seed digest is different. The
failure is deterministic and replayable; it is not attributed to randomness,
event ordering, or checkpoint corruption.
