# 03 Coverage Funnel Model

This is a review model, not a change to the frozen Gate. It separates the
stage questions that the original all-resident predicate conflates:

```text
TOTAL → ELIGIBLE → FEASIBLE → OPPORTUNITY → CANDIDATE_GENERATED
      → SELECTED → REQUESTED → COMMITTED → COMPLETED
```

Counts are resident counts unless an `actionCount` field says otherwise.

## Evidence grades

- `MEASURED`: directly present in run-08 artifacts.
- `DERIVED_FROM_FIXTURE`: deterministic from the frozen resident/work/resource
  fixture and source code.
- `OBSERVED_ACCEPTED_PATH_ONLY`: visible because an accepted action exists; it
  does not prove that every non-accepted decision reached that stage.
- `UNAVAILABLE`: the Gate did not persist negative decision/candidate rows.

## Action-specific interpretation

| Action |       Total |                                                                  Eligibility/necessity | Main measured result                                        | Evidence limit                                                                    |
| ------ | ----------: | -------------------------------------------------------------------------------------: | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| EAT    |          30 |      25 have positive food resource; 5 have zero; Need-episode eligibility is separate | 25 residents / 60 completed starts                          | no negative candidate rows for zero-food residents                                |
| WORK   | 26 employed | 26 have employment, workplace, and reachable commute; pre-shift feasibility is derived | 3 residents / 4 completed starts; 488 workplace MOVE starts | no negative candidate rows; wake integration is visible in harness/source         |
| TALK   |          30 |        exhaustive legal-opportunity count unavailable; 24 have observed paired contact | 19 initiators, 24 paired-contact residents, 203 starts      | no co-location/candidate-negative timeline persisted                              |
| MOVE   |          30 |          26 have formal workplace/return necessity; 4 unemployed lack formal necessity | 26 residents / 950 starts                                   | other transient need-driven MOVE opportunities are not persisted as negative rows |

The machine form is [coverage-funnel.json](./coverage-funnel.json). The
resident form is [resident-coverage-matrix.json](./resident-coverage-matrix.json).

## What the funnel can and cannot decide

The EAT resource-feasibility and MOVE necessity drops are sufficiently
evidenced to decide their causes. The
WORK timing drop is evidenced by 488 post-boundary workplace moves and the
missing bootstrap-wide wake path, but candidate-stage negative evidence is
still absent. TALK has a confirmed paired-contact lower bound and six observed
no-contact residents, but cannot distinguish no opportunity from an unselected
opportunity for those six.

Therefore the next fix must add stage-level accounting before claiming that a
specific TALK policy or topology defect is fixed.
