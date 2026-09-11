# 13 Hard Gate #3 Contract Review

## Current contract

The frozen predicate requires every resident to complete SLEEP, EAT, TALK, and MOVE, every employed resident to complete WORK, and every employed resident to complete workplace and return-home commute. Run-08 failed exactly this predicate; the other 14 hard gates passed.

That predicate verifies uniform action exposure, not only capability, causal response, or feasible liveness. The distinction matters:

| Question                                              | Gate #3 current answer                | Evidence-backed answer needed                                       |
| ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Can the action path execute?                          | partially, via accepted action counts | keep capability coverage                                            |
| Did every resident perform every action?              | yes, unconditionally required         | not valid for zero-resource/no-necessity cases                      |
| Did each eligible resident receive a causal response? | not represented by one resident count | require eligible/feasible response plus bounded ineligible evidence |

## Relation to other gates

- Gate #5 already defines an eligible Need episode and requires an accepted action or explicit bounded unavailable-resource/participant path. That is stronger causal semantics than unconditional action uniformity for EAT/TALK.
- Gate #7 proves work-obligation state and exact legal completions; it does not prove that the scheduler gave every employed resident a pre-shift preparation opportunity. `WORK_ABSENCE=23` remains actionable.
- Gates #8 and #9 show that EAT resource conservation and TALK paired atomicity are correct. Their PASS results must not be converted into fake EAT or a lock rewrite.

## Decision

`STORY_SPEC_CHANGE_REQUIRED = YES`, limited to a clarification/conditionalization of Hard Gate #3. This is not a threshold reduction and does not weaken the remaining gates. The accepted EAT and TALK ADRs remain unchanged. A formal governance/spec decision is required before a future implementation or rerun, but a new domain ADR is not indicated by current evidence.

Proposed semantics are recorded separately as proposal-only in [20_PROPOSED_GATE3_V2.md](./20_PROPOSED_GATE3_V2.md).
