# 19 M3-T05 Formal Task Specification

## Identity and status

| Field                                 | Frozen value                            |
| ------------------------------------- | --------------------------------------- |
| Task                                  | `M3-T05`                                |
| Name                                  | Story Sanity Report                     |
| Current status                        | `EXISTS_BUT_NOT_COMPLETED`              |
| Definition status before this package | conflicted/under-specified              |
| Definition status after this package  | clarified and machine-gated             |
| Result of this document               | task definition only; not T05 execution |

## Purpose

Automatically produce resident behavior statistics, causal evidence, and an
anomaly list after the expanded 30×30 M3 life run, and fail on the 15 Hard
Gates in [16](./16_STORY_SANITY_HARD_GATES.md).

## Prerequisites

1. M3-T01 through M3-T04 remain PASS.
2. The formal lifecycle implementation task has been separately authorized and
   passes its targeted contract/integration tests.
3. The EAT resource-capability and TALK paired-runtime-lock ADR gates are
   accepted.
4. The expanded typed event registry, reducer, checkpoint, scheduler, and
   action-loop paths are implemented.
5. A clean disposable PostgreSQL run can execute 30 residents × 43,200 World
   Minutes with a fixed manifest.

## Inputs and outputs

Inputs are the fixed manifest, T01 fixture, versioned policy set, Kernel event
history/outcomes, runtime projection, due/wake records, fault profile, and
causal decision evidence. Outputs are the artifact bundle in [18](./18_STORY_SANITY_ARTIFACT_SCHEMA.md).

## Definition of Done

- The exact endpoint and action coverage gates pass.
- Need, work, resource, TALK legality, failure, liveness, isolation, replay,
  determinism, and BUY-boundary gates pass.
- A second same-manifest run has the same canonical digest.
- The report includes all residents, all accepted action outcomes, all typed
  event refs, replay hashes, and diagnostic classes, including zeros.
- The report and final digest are reproducible from the manifest and facts;
  deleting the report does not modify the world.
- CI, clean PostgreSQL verification, scope audit, and Git evidence are
  recorded in `M3-T05-report.md` by the future execution task.

## Failure criteria

Any failed Hard Gate, missing causal evidence for an accepted action, replay
mismatch, same-seed mismatch, cross-world reference, accepted BUY, LLM use,
unbounded recovery, or unreported terminal anomaly means `M3-T05 = FAIL`.
Diagnostics may be non-zero only when their bounded classification is fully
represented and no Hard Gate is violated; that condition is still described in
the report and does not become an implicit waiver.
