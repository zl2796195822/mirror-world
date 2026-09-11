# M3 Lifecycle Story Gate Coverage Contract v2

Status: `ACCEPTED / GOVERNANCE CLARIFICATION`

Date: 2026-09-11

This document is the accepted clarification of Hard Gate #3 only. It is a
superseding contract for future `M3-LIFECYCLE-STORY-GATE` runs; it does not
rewrite the frozen v1 specification or reclassify `20260910-run-08`.

## Authority and change boundary

The decision is based on the frozen lifecycle/story specification, accepted
ADR-0011 and ADR-0012, the registered Gate/T05 definitions, the immutable
run-08 report and artifacts, and the reconciliation package in
`docs/verification/M3-LIFECYCLE-STORY-GATE-COVERAGE-RECONCILIATION/`.

Only these meanings change:

- Hard Gate #3 uses action-specific eligibility, feasibility, opportunity, and
  resident-level coverage instead of an unconditional every-resident action
  count.
- TALK contact coverage counts both the initiator and the participant, while
  retaining initiator coverage as a separate metric.
- Negative funnel stages become mandatory evidence. Missing evidence is
  `UNKNOWN`, not zero and not a valid denominator reduction.

The following remain unchanged: the other 14 Hard Gates; Gate #5 Need
Response; Gate #7 Work Obligation; Kernel ownership; ADR-0011/0012; exact
WORK authorization; MOVE/SLEEP/EAT/TALK lifecycle semantics; the M3 BUY
negative boundary; and the 30-resident, 43,200-World-Minute run contract.

## Coverage vocabulary

All coverage sets are scoped by `worldId`, action, and the 30-day horizon.
Counts are set cardinalities unless explicitly labeled as action counts.
Repeated actions by one resident increase `ACTION_COUNT` but count once in a
resident coverage set.

| Term                                | Machine meaning                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ACTION_COUNT`                      | Number of completed lifecycle instances for one action type.                                                  |
| `UNIQUE_INITIATOR_COUNT`            | Unique residents whose completed request actor is the initiator; required for TALK reporting.                 |
| `UNIQUE_PARTICIPANT_COUNT`          | Unique residents referenced as a participant by a completed TALK.                                             |
| `UNIQUE_ELIGIBLE_RESIDENT_COUNT`    | Unique residents with at least one action episode that the action-specific contract says requires a response. |
| `UNIQUE_FEASIBLE_RESIDENT_COUNT`    | Unique eligible residents with a legal, resource- and time-feasible path at the relevant observation.         |
| `UNIQUE_OPPORTUNITY_RESIDENT_COUNT` | Unique feasible residents for whom a concrete opportunity is visible at a decision boundary.                  |
| `UNIQUE_CANDIDATE_GENERATED_COUNT`  | Unique residents for whom the action candidate was emitted.                                                   |
| `UNIQUE_SELECTED_COUNT`             | Unique residents for whom the action was selected by Rule Decision.                                           |
| `UNIQUE_REQUESTED_COUNT`            | Unique residents with a submitted ActionRequest for the action.                                               |
| `UNIQUE_COMMITTED_COUNT`            | Unique residents with a committed Kernel start outcome.                                                       |
| `UNIQUE_COMPLETED_COUNT`            | Unique residents with at least one committed completion event.                                                |

`ACTION_COUNT` must never be used as a substitute for any unique resident
count. Initiator and participant counts must never be silently merged; the
TALK resident-contact set is their explicit union.

## Common funnel

Every future run emits the following stage model for each action episode:

```text
TOTAL
  → ELIGIBLE
  → FEASIBLE
  → OPPORTUNITY
  → CANDIDATE_GENERATED
  → SELECTED
  → REQUESTED
  → COMMITTED
  → COMPLETED
```

The producer must emit a structured row for every resident/action decision
boundary, including a terminal reason when the row does not advance. At
minimum, each row carries `worldId`, `residentId`, action, episode or
obligation identity, World Time, source observation identity, stage, outcome
reason, and the relevant policy versions. It contains no hidden reasoning.

An accepted path proves only the stages visible on that path. It does not
prove that omitted residents had no opportunity. A missing stage row is
`UNKNOWN` and fails Hard Gate #3 v2. A valid terminal row such as
`NO_FORMAL_NECESSITY`, `UNAVAILABLE_RESOURCE`, or `NO_LEGAL_OPPORTUNITY` is
evidence of why coverage is not required; it is not a successful action.

## Action-specific predicates

### SLEEP

For the fixed T01 manifest, `TOTAL = ELIGIBLE = FEASIBLE = 30`. This retains
the existing all-resident denominator because every seed resident has a
versioned sleep phase, the goal policy has a sleep window, and the
`m3-needs-v1` rest dynamics guarantee a rest response within the 30-day
horizon. A future manifest that changes any of those facts must derive its
eligibility set from the manifest; it may not assume 30.

Hard Gate #3 requires `UNIQUE_COMPLETED_COUNT = UNIQUE_ELIGIBLE_RESIDENT_COUNT`
and at least one completed SLEEP lifecycle per resident. Gate #5 continues to
check every eligible RestPressure episode separately.

### EAT

EAT eligibility is a Need/action episode, not a synonym for positive initial
food. At an eligible EAT episode:

- `FEASIBLE` requires an EAT-capable current location and a valid resident-
  owned food item/quantity in the Kernel resource authority;
- zero food, an invalid item, or no legal resource makes that episode
  infeasible; Kernel must not invent food;
- every feasible resident must reach `COMPLETED`;
- every eligible but infeasible episode must emit a bounded
  `UNAVAILABLE_RESOURCE`/defer terminal record and is not counted as a
  successful EAT response.

The five zero-food residents in run-08 therefore cannot be required to
complete EAT under the new predicate. Their historical absence of negative
funnel rows remains an evidence defect for a future run, not a retroactive
pass. Resource CAS, conservation, replay, and Gate #5 remain independent.

### WORK

`ELIGIBLE` is the unique set of employed residents with at least one valid
scheduled shift in the horizon. For the current manifest this is 26. A
resident is `FEASIBLE` when the assigned workplace, route, and deterministic
travel duration permit a legal arrival before the shift start if a preparation
opportunity is supplied.

Hard Gate #3 requires every feasible employed resident to have at least one
completed exact-start WORK shift, plus the required workplace and return-home
commute evidence. The verifier also records every scheduled shift outcome so
that one successful shift cannot hide repeated missed shifts.

The frozen boundary remains `09:00 UTC`: a WORK start after the boundary is
not success, and no late-arrival grace is allowed. Preparation must be driven
by World Time and the existing scheduler/wake boundary; the scheduler may
wake, but cannot choose WORK or mutate location.

### TALK

TALK has one initiator request and one participant. `UNIQUE_INITIATOR_COUNT`
and `UNIQUE_PARTICIPANT_COUNT` are reported separately. Resident social-contact
coverage is their union, so a completed TALK counts the participant as having
experienced a completed contact as well as counting the initiator.

For each resident's social decision episode, `ELIGIBLE` and `FEASIBLE` are
derived from the formal SocialPressure/Goal context and a same-world,
same-location, active, distinct participant. A resident with no legal
participant opportunity receives an explicit `NO_LEGAL_OPPORTUNITY` terminal
row. A feasible opportunity that is not selected must retain the bounded
candidate/rejection/defer reason. An absent row is `UNKNOWN` and fails the
Gate; it cannot be treated as no opportunity.

Every feasible resident must have a completed paired contact. The paired
runtime lock, one initiator request, and one shared completion remain governed
by ADR-0012.

### MOVE

MOVE coverage is necessity-based. A resident enters the denominator only when
the current M3 model emits a formal MOVE necessity or goal, such as workplace
commute, return-home obligation, resource-required location, or a formally
derived social-opportunity travel goal. Leisure wandering is not a Gate
requirement.

For the current fixture, the 26 employed residents have workplace/return
commute necessity. The four unemployed residents without a formal MOVE need
must receive `NO_FORMAL_NECESSITY`; they are not failed for remaining at home.
Every feasible required MOVE must complete on a legal route. A random or
Gate-only MOVE cannot satisfy this predicate.

## Exact Hard Gate #3 v2 predicate

Let `R_a` be the unique resident set for action `a` over the horizon,
`E_a` the eligible set, `F_a` the feasible set, and `C_a` the residents with a
completed action. The gate passes only when all of the following hold:

```text
1. Every scoped action has real completed lifecycle evidence; BUY has zero
   accepted execution.
2. For every action a, every resident in F_a is in C_a.
3. Every resident in E_a \ F_a has a valid bounded terminal reason; no such
   case is silently omitted or counted as success.
4. Every resident in TOTAL has either a complete funnel record or a valid
   action-specific non-eligibility/necessity terminal record.
5. TALK C_a is computed from completed initiator ∪ participant residents, with
   the two source counts preserved separately.
6. WORK additionally has exact-start completion and workplace/return-home
   commute evidence for every eligible employed resident.
7. SLEEP uses the fixed 30-resident denominator only under the manifest facts
   stated above.
8. No ACTION_COUNT, accepted-path lower bound, diagnostic, or human note can
   substitute for a missing resident set or terminal row.
```

This remains a strict coverage gate. For example, WORK `3/26` still fails;
EAT `25/30` is not silently turned into 30/30; and TALK `19` initiators is
not allowed to hide the separate 24-resident contact union or six unknown
rows.

## Separation from other Hard Gates

| Gate                           | Owns                                                                                                             | Does not replace                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| #3 Accepted action coverage v2 | Population-level resident/action coverage, stage completeness, and required commute coverage.                    | Per-episode Need causality or action legality.                           |
| #5 Need response               | Every eligible Need threshold episode has an accepted action or a bounded unavailable-resource/participant path. | Unique resident coverage across the horizon.                             |
| #7 Work obligation             | Legality of WORK obligation, exact shift key, unemployed rejection, and no payroll.                              | Whether every eligible employed resident received and completed a shift. |
| #8 Resource conservation       | Kernel-owned food deltas and no double consumption.                                                              | Whether EAT coverage denominator was correctly formed.                   |
| #9 TALK legality/atomicity     | Paired legality, locking, and one shared completion.                                                             | Whether all eligible residents had a social contact opportunity.         |

## Versioning and future rerun

The frozen `m3-story-sanity-v1` contract and `20260910-run-08` remain
historical. Run-08 remains `FAIL` with Hard Gate #3 failed and its manifest,
statistics, diagnostics, causal evidence, and hashes unchanged.

A future run must use a new run ID and record, at minimum:

```text
coverageContractVersion = m3-story-gate-coverage-v2
storySanityVersion      = m3-story-sanity-v2
policyVersions
schedulerWakeVersion
codeCommit
fixtureHash
worldSeed
parentRunId              = 20260910-run-08
```

The full 30×30 rerun is required after the registered fix task and targeted
clean-PostgreSQL verification. A contract acceptance is not a Gate rerun and
does not change M3 status.

## ADR and scope decision

No new domain ADR is required by this clarification. It does not transfer
ownership or change World Time, ActionRequest, Kernel authority, or the
accepted EAT/TALK decisions. The Work Preparation Wake Fix must verify this
assumption before implementation; an ownership change would require a new
ADR and would block that task.
