# 20 Proposed Hard Gate #3 v2

**HISTORICAL PROPOSAL — superseded by the accepted v2 contract, not used to
reclassify run-08.**

## Proposed predicate

Retain capability coverage and all existing Hard Gates. Replace the
unconditional every-resident action clause with action-specific causal
coverage using:

```text
TOTAL → ELIGIBLE → FEASIBLE → OPPORTUNITY → CANDIDATE_GENERATED
      → SELECTED → REQUESTED → COMMITTED → COMPLETED
```

Eligibility is an action/Need episode decision; resource availability is a
separate feasibility decision. An accepted path is only a lower bound until
negative funnel rows are present.

1. **EAT:** every resident with a feasible EAT opportunity must complete an EAT response in the defined eligibility window. A threshold episode without a valid resource must emit a bounded `UNAVAILABLE`/defer classification; it must not be counted as a successful EAT. Positive initial food alone does not establish Need eligibility.
2. **WORK:** every employed resident with a feasible scheduled shift must have an exact-boundary WORK completion and workplace/return commute evidence. A missed shift must be an explicit bounded outcome; LATE is never success.
3. **TALK:** every resident with a legal co-located participant opportunity must have a completed paired contact, counted as initiator or participant. Initiator and participant counts remain separate. No-opportunity and candidate-suppressed paths must be persisted and bounded. This remains Need/opportunity driven, not day-one scripting.
4. **MOVE:** every resident with a formal MOVE necessity or goal must complete the required move. Residents with no such necessity are not failed for remaining at home.

## Non-negotiable strength

This is not `action count > 0`. It still detects a broad failure such as WORK 4/26 when 26 are employed and feasible preparation is expected, and it still fails missing eligible EAT/TALK responses. It also makes the denominator machine-visible and prevents impossible resource obligations from being misread as resident autonomy failures.

`STORY_SPEC_CHANGE_REQUIRED = YES` for this exact Hard Gate #3 clarification.
The accepted contract is
[`M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md`](../../M3-LIFECYCLE-STORY-GATE-COVERAGE-CONTRACT-v2.md).
No change is proposed to ADR-0011, ADR-0012, the Kernel resource invariant,
paired TALK lock, exact WORK authorization, or the M6 BUY boundary.
