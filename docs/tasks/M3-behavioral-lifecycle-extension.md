# M3 Behavioral Lifecycle Extension

## Registration

| Field           | Value                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Registry key    | `M3-BEHAVIORAL-LIFECYCLE-EXTENSION`                                                                                                  |
| Numeric task ID | None assigned by governance                                                                                                          |
| Formal ID       | `FORMAL_TASK_REGISTERED_WITHOUT_NUMERIC_ID`                                                                                          |
| Status          | `REGISTERED / NOT_STARTED`                                                                                                           |
| Milestone       | M3                                                                                                                                   |
| Prerequisites   | `ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY`, `ADR-M3-TALK-PAIRED-RUNTIME-LOCK`                                                         |
| Frozen scope    | [20 Formal Implementation Task Specification](../verification/M3-LIFECYCLE-STORY-SPEC-RECONCILIATION/20_IMPLEMENTATION_TASK_SPEC.md) |

This registration freezes the next implementation boundary. It is not an
implementation authorization for this governance task; the task stops after
registration.

## Scope

Implement the existing lifecycle chain for EAT, WORK, and TALK:

```text
Observation -> Needs -> Goals -> Candidate -> Rule Decision
  -> ActionRequest -> World Kernel -> KernelActionOutcome
  -> typed events -> projection/replay -> next Observation
```

The implementation must include only the minimum extensions required by the
frozen specification and accepted ADRs:

- Kernel start/completion handlers and runtime lifecycle for EAT/WORK/TALK;
- EAT Kernel-owned food CAS, 30 World Minutes, completion need input, and
  resource conservation;
- WORK exact UTC 09:00–17:00 obligation, workplace/employment checks,
  attendance and shift completion, with no payroll;
- TALK deterministic participant selection, same-world/same-location/idle
  checks, paired atomic runtime lock, shared 15 World Minute activity, and
  one completion;
- `m3-rule-decision-v2` and action-loop candidate/constraint/score evidence;
- existing scheduler due/wake extension, including TALK due coalescing and
  work-boundary wakes;
- typed event registry/reducers, full/suffix/genesis replay, checkpoints,
  causal evidence, idempotency, and bounded failure/replan tests.

MOVE and SLEEP semantics are reused unchanged. The World Kernel remains the
only fact writer, Life Engine remains WHAT, and the scheduler remains WHEN.

## Explicit non-goals

This task must not include BUY settlement, price, merchant/account/payment/
journal/inventory economy, payroll, arrears, Memory, Relationship mutation,
Dialogue, transcript, LLM, Agent Runtime, 3D, realtime, scale work, M8
catch-up, M10 cognition, a new scheduler, or a multi-actor ActionRequest.

`BUY` remains declared but non-executable in M3; full settlement belongs to
M6 Economy.

## Completion boundary

Completion of this implementation task is not M3 PASS. The implementation
must stop before and hand off to the separately registered
`M3-LIFECYCLE-STORY-GATE`, then `M3-T05`, then `M3 Final Status Review #2`.
