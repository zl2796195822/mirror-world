# Architecture Decision Records

This index is the repository's ADR registry. `Accepted` means the decision is
formally approved as an architecture boundary; it does not mean the related
implementation or verification gate has passed.

| File                                                                  | Decision ID                               | Status   | Scope                |
| --------------------------------------------------------------------- | ----------------------------------------- | -------- | -------------------- |
| [ADR-0000 template](./ADR-0000-template.md)                           | —                                         | Proposed | Template             |
| [ADR-0001](./ADR-0001-m1-t02-development-auth.md)                     | —                                         | Accepted | M1-T02               |
| [ADR-0002](./ADR-0002-m2-t01-world-clock.md)                          | —                                         | Accepted | M2-T01               |
| [ADR-0003](./ADR-0003-m2-t02-action-contract.md)                      | —                                         | Accepted | M2-T02               |
| [ADR-0004](./ADR-0004-m2-t03-kernel-validation-idempotency.md)        | —                                         | Accepted | M2-T03               |
| [ADR-0005](./ADR-0005-m2-t04-event-ledger.md)                         | —                                         | Accepted | M2-T04               |
| [ADR-0006](./ADR-0006-m2-t05-checkpoint-replay.md)                    | —                                         | Accepted | M2-T05               |
| [ADR-0007](./ADR-0007-m3-life-engine-needs-model-v1.md)               | `ADR-M3-001`                              | Accepted | M3 Needs             |
| [ADR-0008](./ADR-0008-pre-al-01-kernel-action-outcome.md)             | —                                         | Accepted | PRE-AL-01            |
| [ADR-0009](./ADR-0009-pre-al-05-action-semantics.md)                  | —                                         | Accepted | PRE-AL-05            |
| [ADR-0010 PRE-AL-06](./ADR-0010-pre-al-06-bounded-replan.md)          | —                                         | Accepted | PRE-AL-06            |
| [ADR-0010 PRE-AL-07](./ADR-0010-pre-al-07-deterministic-scheduler.md) | —                                         | Accepted | PRE-AL-07            |
| [ADR-0011](./ADR-0011-m3-eat-kernel-consumable-capability.md)         | `ADR-M3-EAT-KERNEL-CONSUMABLE-CAPABILITY` | Accepted | M3 EAT prerequisite  |
| [ADR-0012](./ADR-0012-m3-talk-paired-runtime-lock.md)                 | `ADR-M3-TALK-PAIRED-RUNTIME-LOCK`         | Accepted | M3 TALK prerequisite |

The two historical `ADR-0010` filenames are retained to avoid rewriting
accepted history. New decisions use the next unused numeric filenames and
also have unique decision IDs.

## M3 governance rule

ADR-0011 and ADR-0012 are the only required ADR gates for the frozen M3
Behavioral Lifecycle Extension. WORK is `ADR_NOT_REQUIRED` because it reuses
the existing employment plus UTC work-obligation read model and produces only
attendance evidence; it does not introduce payroll or a new authority.

The accepted ADRs authorize a future implementation boundary. They do not
authorize EAT, WORK, TALK, M3-T05, M4, M5, M6, or M3 PASS in this task.
