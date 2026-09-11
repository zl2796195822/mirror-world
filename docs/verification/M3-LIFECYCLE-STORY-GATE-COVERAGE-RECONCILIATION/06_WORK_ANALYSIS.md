# 06 WORK Analysis

## Finding

Primary: `SCHEDULER_WAKE_DEFECT`.
Secondary: `POLICY_COVERAGE_MISMATCH`.
`WORK_CONTRACT_CHANGE_REQUIRED = NO`.

The exact 09:00 UTC authorization remains valid. Late WORK must not be
accepted. The defect is the missing pre-shift opportunity, not an illegal
Kernel WORK completion.

## Measured timeline

- 26 employed residents have a workplace and a deterministic reachable route.
- There are 488 accepted MOVE-to-workplace starts across 26 residents.
- Every one starts at or after `09:00`; route duration is 10 minutes for cafe/
  store routes and 15 minutes for office routes.
- Therefore no workplace arrival can precede the exact 09:00 WORK boundary.
- Four WORK starts are committed, involving three residents; all four are
  exactly at 09:00 and all complete legally.
- `WORK_LATE_ATTEMPT=0`; the Kernel did not accept late WORK.
- `WORK_ABSENCE=23`; the resident-level gap is 23 employed residents.

## Causal source review

The frozen Work spec says pre-shift preparation should create a MOVE when the
time-to-start is no more than deterministic travel duration. The current Gate
harness registers only `INITIAL_DECISION` wakes and deferred replans. The
existing `registerNextWorkBoundaryWakes` helper exists, and WORK start/
completion refreshes a future boundary, but the harness does not perform a
bootstrap-wide reconciliation for all employed residents. A boundary at 09:00
cannot cause a 10/15-minute commute to arrive before 09:00.

At 09:00 the decision loop selects the work obligation and starts the MOVE.
The resident arrives late and the exact-start WORK candidate is no longer
feasible. The evidence therefore supports a scheduler/preparation wake gap,
with policy needing to consume a pre-shift wake; it does not support changing
the boundary or teleporting residents.

## Options

| Option                                                     | Decision                               |
| ---------------------------------------------------------- | -------------------------------------- |
| W1: deterministic pre-shift wake/preparation/commute       | **Required**                           |
| W2: allow a late-arrival grace window                      | Rejected; changes frozen authorization |
| W3: bootstrap-wide reconciliation using existing scheduler | **Required**                           |
| W4: earlier work recognition in policy                     | Companion only; must be driven by wake |
| W5: fixture/workplace topology change                      | Not required; routes are reachable     |
| W6: revise exact 09:00 contract                            | Rejected                               |

See [10_WORK_TIMELINE_MATRIX.md](./10_WORK_TIMELINE_MATRIX.md) and
[16_SCHEDULER_WAKE_REVIEW.md](./16_SCHEDULER_WAKE_REVIEW.md).
