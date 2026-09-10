# 05 WORK Formal Specification

## Purpose and scope

M3 WORK proves that an employed resident can fulfill a deterministic work
obligation through an accepted activity/shift completion. It produces an
attendance fact. It does not calculate pay.

## Obligation semantics

The existing `workObligation` remains a deterministic read model derived from
employment, UTC weekday, and World Time:

```text
weekday Monday-Friday, 09:00 <= World Time < 17:00 -> DUE
World Time >= 17:00 -> LATE
otherwise -> NOT_DUE
```

An unemployed resident has `NO_CURRENT_OBLIGATION`. `LATE` is observable but
is never an implicit authorization to start WORK. A deterministic completed
shift key is `residentId|startsAtWorldTime`; one key can complete once.

## Candidate and timing rules

- Before the shift, if `timeUntilStart <= deterministic travel duration`, the
  candidate is MOVE to the workplace. This is commute preparation, not WORK.
- WORK is a candidate only for an employed resident at the exact workplace,
  with the shift obligation at its `startsAtWorldTime`, and without a
  completed shift key.
- If the shift start boundary was missed, the candidate is infeasible with
  `EXPIRED_WORK_WINDOW`; the system does not start late WORK.
- A `WORK_BOUNDARY` wake makes the exact start observable without a wall-clock
  timer.

This preserves the current work obligation source while fixing the current
gap where T04 can only move to the workplace.

## Lifecycle

```text
WORK ActionRequest(workplaceId)
 -> RESIDENT_WORK_STARTED + WORKING runtime + due = shift end
 -> ACTIVITY_COMPLETION due item
 -> RESIDENT_WORK_COMPLETED + attendance fact + IDLE runtime
```

Start requires `DUE`, exact start boundary, same-world workplace, current
location equal to workplace, `WORK` capability, matching employment, and an
idle resident. Completion records `attendanceMinutes=480` for the normal
09:00–17:00 shift and the deterministic `workObligationKey`.

## No payroll

`WORK_COMPLETED != wage settlement`. M3 does not mutate cash, employer
accounts, payable, arrears, journal, salary, or money pressure. A future M6
payroll process may consume the accepted completion event as input.

## Failure handling

| Failure                       | Result                                             | Recovery                                       |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| unemployed or wrong workplace | rejected                                           | stop for this obligation; never fabricate work |
| wrong location                | `KERNEL_INVALID_LOCATION`                          | MOVE or bounded replan                         |
| `LATE`/missed boundary        | rejected with `EXPIRED_WORK_WINDOW` classification | stop this shift, schedule next `WORK_BOUNDARY` |
| busy/stale version            | conflict/reobserve                                 | two conflict recoveries maximum                |
| duplicate shift key/request   | `REUSED`                                           | no second attendance fact                      |
