# 10 WORK Timeline Matrix

`WORK_ABSENCE=23` is the measured resident-level gap: 26 employed residents minus the three residents with at least one completed WORK. The task prompt's 22-person wording is not consistent with the run artifact and is not used.

## Shared timeline evidence

| Stage                | Evidence                                                                                           | Grade                           |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- |
| Employment/workplace | 26 employed residents, deterministic workplace and reachable home/workplace route                  | `DERIVED_FROM_FIXTURE_PLUS_RUN` |
| Preparation          | 488 accepted MOVE starts whose destination is the resident workplace                               | `MEASURED`                      |
| Timing               | every workplace MOVE starts at or after 09:00; measured route durations are 10 or 15 World Minutes | `MEASURED`                      |
| Arrival before start | 0 residents                                                                                        | `MEASURED`                      |
| Legal WORK           | 4 starts, 3 residents, all at exactly 09:00                                                        | `MEASURED`                      |
| Negative funnel      | no persisted per-wake candidate/rejection rows for missed shifts                                   | `UNAVAILABLE`                   |

The frozen contract is exact: `09:00 <= World Time < 17:00` is `DUE`, but the WORK candidate also requires exact shift start, workplace location, and an uncompleted shift key. Starting after the boundary is not an acceptable repair. The observed sequence is therefore `DUE at 09:00 → MOVE → late arrival → no legal WORK`, not `late WORK accepted`.

## Per-employed-resident matrix

`workplace MOVE` is the count of accepted MOVE starts targeting the assigned workplace. Candidate history is `UNAVAILABLE` for negative cases; accepted-path counts are not a complete candidate denominator.

| Resident                               | Home | Workplace | Workplace MOVE | WORK starts | Result / classification                               |
| -------------------------------------- | ---- | --------- | -------------: | ----------: | ----------------------------------------------------- |
| `49177b40-dd6c-5237-9bb8-46c1c5aa8c61` | 01   | office    |             18 |           0 | missed; scheduler wake defect                         |
| `2487e7e5-6e4d-5916-8aae-c0f76e352889` | 02   | cafe      |             18 |           0 | missed; scheduler wake defect                         |
| `e7e4bcca-7843-5ba2-b110-a59403756e43` | 03   | store     |             18 |           0 | missed; scheduler wake defect                         |
| `a5d97bf2-f351-529d-8f8d-d7a63ad4404d` | 04   | office    |             20 |           0 | missed; scheduler wake defect                         |
| `508ffd23-ce5d-5234-a542-bb83360a004b` | 05   | cafe      |             18 |           0 | missed; scheduler wake defect; zero-food overlap      |
| `33a1cd64-a71c-539e-92d6-8d7fa6bce1d3` | 06   | store     |             18 |           0 | missed; scheduler wake defect                         |
| `91083903-25db-5ac8-a6d6-273c6568e8f3` | 07   | office    |             19 |           1 | completed at `2026-09-17T09:00Z`                      |
| `5fc82ac5-57cd-5919-96c7-5c6e33a9efa6` | 08   | cafe      |             19 |           0 | missed; scheduler wake defect                         |
| `390f66d0-33ce-5737-9509-a90ae6ba81e8` | 09   | store     |             20 |           0 | missed; scheduler wake defect                         |
| `c7e630d4-2930-5aea-a5d9-661e541a53fd` | 10   | office    |             20 |           0 | missed; scheduler wake defect                         |
| `6a97e582-c8b4-5152-b50f-b45135bfce0f` | 11   | cafe      |             18 |           0 | missed; scheduler wake defect; zero-food overlap      |
| `a605e5bd-c171-52d0-ab28-b6e7efc33540` | 12   | store     |             18 |           0 | missed; scheduler wake defect                         |
| `3c0e06be-b909-58d9-8c05-891dbe0bcf36` | 01   | office    |             18 |           0 | missed; scheduler wake defect                         |
| `849cf567-2fdf-56f1-a262-4e2c5bdb7585` | 02   | cafe      |             20 |           0 | missed; scheduler wake defect                         |
| `62700369-80e1-5b74-93e5-7235b9b856d3` | 03   | store     |             20 |           0 | missed; scheduler wake defect                         |
| `dcb67974-fc44-517e-8b5e-09e7a4c54aad` | 04   | office    |             19 |           0 | missed; scheduler wake defect                         |
| `9a07aa36-6468-53b5-b444-804086cbf903` | 05   | cafe      |             18 |           0 | missed; scheduler wake defect; zero-food overlap      |
| `bdb2a3a2-7873-5314-b409-7a10cfe34250` | 06   | store     |             18 |           0 | missed; scheduler wake defect                         |
| `7bdde7d3-206d-501f-bf01-c1807b04dade` | 07   | office    |             20 |           0 | missed; scheduler wake defect                         |
| `2302ff23-6e93-56ea-a573-e5eb4fb28143` | 08   | cafe      |             19 |           0 | missed; scheduler wake defect                         |
| `2d49951e-bb02-5ee7-b983-dc0ccff0a789` | 09   | store     |             19 |           0 | missed; scheduler wake defect                         |
| `a1001696-d8f9-5036-945b-4d8e0ec53633` | 10   | office    |             19 |           2 | completed at `2026-09-15T09:00Z`, `2026-09-23T09:00Z` |
| `e20b7ac0-101b-5a79-9170-9766e3d383e1` | 11   | cafe      |             17 |           0 | missed; scheduler wake defect; zero-food overlap      |
| `247ca98f-ac49-5a24-a149-9ef21721f898` | 12   | store     |             20 |           0 | missed; scheduler wake defect                         |
| `511c9af3-f08b-55b2-a2da-d9fbfbf95d47` | 01   | office    |             19 |           1 | completed at `2026-09-18T09:00Z`                      |
| `ddbefbb3-9aa6-5f95-81ec-8f2dc920f9fa` | 02   | cafe      |             18 |           0 | missed; scheduler wake defect                         |

## Decision

Primary `SCHEDULER_WAKE_DEFECT` at the Gate-harness integration level; the run does not prove it is the exclusive per-resident cause. Secondary `POLICY_COVERAGE_MISMATCH`. The existing `WORK_BOUNDARY` registration helper is real and deterministic, but the Gate harness has no bootstrap-wide reconciliation that gives all employed residents a pre-shift commute opportunity. The next fix must integrate the existing scheduler and preserve exact-start authorization. It must not add a grace window, teleport residents, or revise the WORK contract.
