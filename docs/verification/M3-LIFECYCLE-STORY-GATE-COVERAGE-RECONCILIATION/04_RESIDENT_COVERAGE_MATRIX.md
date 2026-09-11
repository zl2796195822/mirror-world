# 04 Resident Coverage Matrix

The complete machine-readable matrix is
[resident-coverage-matrix.json](./resident-coverage-matrix.json). It joins
the deterministic T01 profile/employment/resource fixture with run-08
resident summaries and paired TALK accounting.

## Set reconciliation

| Set                                    | Count | Exact interpretation                                                   |
| -------------------------------------- | ----: | ---------------------------------------------------------------------- |
| zero-food EAT failures                 |     5 | `508ffd23`, `53857cc8`, `6a97e582`, `9a07aa36`, `e20b7ac0`             |
| no initiator TALK completion           |    11 | the source diagnostic口径                                              |
| no observed TALK contact after pairing |     6 | `508ffd23`, `53857cc8`, `6a97e582`, `764ec258`, `9a07aa36`, `e20b7ac0` |
| employed without WORK completion       |    23 | all employed except `511c9af3`, `91083903`, `a1001696`                 |
| no MOVE completion                     |     4 | `42ebab5a`, `53857cc8`, `764ec258`, `d619e1bc`                         |

IDs above are shortened only in this table; JSON contains full UUIDs.

## Overlap

- The five zero-food residents include three employed residents and two
  unemployed residents.
- Four of the six no-contact residents are employed; two are unemployed.
- One no-contact resident (`53857cc8`) is also one of the four no-MOVE
  residents and one of the zero-food residents.
- The other no-MOVE residents are not zero-food and are unemployed.
- All three residents with WORK completion also have at least one paired TALK
  contact; WORK completion does not establish a causal requirement for TALK.

## Per-resident interpretation

`classification` is deliberately conservative:

- `CONTRACT_FIXTURE_CONFLICT` only marks the EAT zero-food overlap;
- `SCHEDULER_WAKE_DEFECT` marks employed WORK absence after the timing/wake
  review, not a Kernel lifecycle failure;
- `VALID_NO_ACTION_NEEDED` marks the four no-MOVE unemployed residents;
- `INSUFFICIENT_EVIDENCE` marks no observed TALK contact when candidate-stage
  negatives are missing;
- `NONE` means no reviewed coverage failure.

No row is a production resident state, and no row changes fixture truth.
