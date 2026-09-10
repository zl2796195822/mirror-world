# M3-T05 Story Sanity Report

## Reconciled registration

| Field                | Value                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Task ID              | `M3-T05`                                                                                                                    |
| Name                 | Story Sanity Report                                                                                                         |
| Previous status      | `EXISTS_BUT_NOT_COMPLETED`                                                                                                  |
| Definition status    | `CLARIFIED_AND_MACHINE_GATED`                                                                                               |
| Current status       | `DEFINED / NOT_STARTED`                                                                                                     |
| Required predecessor | `M3-LIFECYCLE-STORY-GATE`                                                                                                   |
| Frozen input         | [19 M3-T05 Formal Task Specification](../verification/M3-LIFECYCLE-STORY-SPEC-RECONCILIATION/19_M3_T05_FORMAL_TASK_SPEC.md) |

The earlier conflict between the formal task book and project-state wording is
resolved by this frozen definition. No T05 run is performed here.

## Purpose and run contract

T05 produces resident behavior statistics, causal evidence, replay/determinism
hashes, and anomaly diagnostics for the expanded deterministic M3 run. It is
verification output, not World Truth or a human narrative waiver.

The exact run is 30 residents × 43,200 World Minutes under one immutable
manifest, fixed seed/policies, clean PostgreSQL, the deterministic driver,
existing lease/fence, and zero LLM calls. Scope is MOVE, SLEEP, EAT, WORK, and
TALK. BUY is a negative boundary only.

## Required output

The report bundle must include the frozen manifest, run summary, all residents,
all accepted-action causal chains, event references, failure/recovery summary,
15 anomaly classes including zero counts, live/full/suffix/genesis hashes,
same-manifest repeat digest, different-seed comparison, and human review notes.
Every evidence row preserves world, resident, actor, request, activity, world
sequence, and policy identity.

## Definition of done

All 15 Story Sanity Hard Gates pass; every accepted action has causal evidence;
Need/work/resource/TALK/failure/liveness/isolation/replay/determinism and BUY
negative-boundary checks pass; a repeated manifest has the same canonical
digest; deleting the report does not change the world; clean PostgreSQL, CI,
scope, and Git evidence are recorded distinctly.

Any failed hard gate, missing causal evidence, replay mismatch, same-seed
mismatch, cross-world reference, accepted BUY, LLM use, unbounded recovery, or
unreported terminal anomaly is `M3-T05 = FAIL`. Non-zero diagnostics are not a
waiver.
