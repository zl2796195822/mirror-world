# 26 Future M4 / M6 / M9 Compatibility Contracts

## M4 Memory & Relationship

Status: research only (RES-M4-001/002). Not owned by M7.

M7 may later display:

- redacted memory highlights
- relationship graph

Contract:

```text
M4 facts/projections → M7 read model
```

Forbidden:

- M7 relationship truth tables
- raycast/gaze as M4 prerequisite (RES-M4-002)
- showing private memory without redaction policy

Mark: `PENDING_M4`

## M6 Economy

Status: research only (RES-M6-001/002).

Future store UI may show:

- price
- inventory
- open/closed if economy-owned
- purchase result

Contract:

```text
M6/Kernel committed outcomes → M7 projection
```

M7 must not own:

- real price authority
- inventory authority
- balances
- transaction success

BUY exists in Action Contract, but executor is absent in main. UI must not pretend purchases work until Kernel supports them.

Mark: `PENDING_M6`

## M9 Human / Proxy Identity

Status: RES-M9-001 research FREEZE=ON in sibling worktree; not formal runtime.

Presentation boundary:

- may show identity kind labels if projected
- proxy actions must be honestly attributed when facts exist
- M7 does not define Proxy Charter
- no auth secrets / biometrics / proxy budgets in render layer

Mark: `PENDING_RES_M9_001`

## Shared rule

Future features enter M7 only as **read projections of committed domain facts**, never as local visual truths that can diverge.
