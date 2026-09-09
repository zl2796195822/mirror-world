# Risks

| Risk                        | Impact                                          | Mitigation / status                                                   |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Existing M3 is fixture-only | identity model may overfit `NATIVE` seed        | re-audit before formal M9; no current schema change                   |
| `PROXY` source is coarse    | callers may mistake it for permission           | require separate delegation/version proof                             |
| Auth account takeover       | wrong human controls a resident                 | strict link/recovery/audit policy; future security gate               |
| stale/in-flight action      | revoke race can cause unauthorized commit       | durable version + shared linearization point                          |
| confused deputy             | Agent uses broad private context/charter        | bounded context, preflight + Kernel recheck                           |
| identity fork ambiguity     | copied data mistaken for same resident          | new ResidentId for independent future history                         |
| privacy/history conflict    | deletion may break causal history               | separate PII erasure from immutable world facts; legal review         |
| biometric overreach         | face/voice treated as proof/identity            | provider boundary, consent, minimal retention, fail closed            |
| admin privilege leakage     | operator becomes god-mode resident              | separate Operator/Admin plane from World Resident plane               |
| M4 memory import            | private human data becomes world memory         | lineage and purpose-limited M4 port                                   |
| M6 asset confusion          | balance mistaken for proxy budget               | separate account authority and charter spending limits                |
| public provenance/deception | native/proxy identity hidden or falsely claimed | internal provenance mandatory; public disclosure policy-configurable  |
| cross-world coupling        | global identity leaks world-local facts         | global DigitalIdentity, world-scoped ResidentId, portability deferred |
| research drift              | old M4/M5/M6 research no longer matches main    | fresh compatibility review is a hard prerequisite                     |

## P0 architectural concern

`Identity Deletion ≠ History Deletion` must be decided with privacy/legal review before any formal identity data model is released. This document intentionally makes no legal conclusion。
