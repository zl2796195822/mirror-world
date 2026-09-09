# 09 M8 × M9 Reconciliation

## State separation

`offline ≠ deleted ≠ paused ≠ proxy-enabled ≠ dormant`。M9's human/control state and M8's world execution state must not be represented by one `online` flag.

| Dimension           | Examples                               | Owner direction                      |
| ------------------- | -------------------------------------- | ------------------------------------ |
| Resident existence  | active, suspended, retired, forked     | M9 identity/lifecycle; world-scoped  |
| Resident execution  | W0/W1/W2, stopped for epoch            | M8/driver; derived execution policy  |
| Human online state  | authenticated session, offline         | Auth/product session; not world fact |
| Proxy authorization | grant/charter active, expired, revoked | M9 control authority                 |
| Proxy runtime state | queued/running/failed/cancelled        | M5 operational/audit boundary        |
| World execution     | RUNNING/PAUSED/MAINTENANCE, freshness  | Kernel/M8 policy                     |

## Cross-state rules

| Situation                | Must mean                    | Must not infer                              |
| ------------------------ | ---------------------------- | ------------------------------------------- |
| Human offline            | no current human session     | Proxy enabled                               |
| W2 dormant               | reduced/catch-up compute     | resident deleted or identity ended          |
| World PAUSED             | no World Time/domain advance | resident offline or proxy revoked           |
| Proxy enabled            | valid delegated scope exists | human is online or resident is W0           |
| Resident deleted/retired | M9 lifecycle decision        | erase immutable world history automatically |

## Human takeover vs freshness

| World freshness | Takeover interaction recommendation                                            | Contract status     |
| --------------- | ------------------------------------------------------------------------------ | ------------------- |
| CURRENT         | permit new direct action after authority check                                 | aligned principle   |
| MINOR_LAG       | permit only if formal epsilon policy accepts; revalidate against current seq   | pending threshold   |
| CATCHING_UP     | read-only observation; reject or boundedly queue new control; no timeline fork | M8/M7 pending       |
| SEVERELY_BEHIND | explicit degraded state; disable embodied writes until current                 | pending product/API |

Takeover stops new Proxy cognition and gives direct human priority, but cannot roll back committed proxy facts. An in-flight operation must be revalidated at the shared authorization/commit boundary. This aligns in principle but requires a formal linearization and audit contract.

## Finding

`PARTIALLY_ALIGNED`。M8 provides world continuity; M9 provides identity/control continuity. Their combination is safe only when session, authorization, runtime and freshness remain separate.
