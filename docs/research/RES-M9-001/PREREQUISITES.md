# Prerequisites

## Hard prerequisites before formal M9

| ID  | Requirement                                                           | Current status                    |
| --- | --------------------------------------------------------------------- | --------------------------------- |
| H1  | M3/PRE-AL action loop, scheduler and resident/domain replay stable    | pending; `M3-T04` remains blocked |
| H2  | Current formal Resident persistence/origin source beyond seed fixture | absent on main                    |
| H3  | M4 memory/relationship/identity-facing projection contract            | research only                     |
| H4  | M5 bounded AgentOperation/Intent/authority integration contract       | research only                     |
| H5  | M6 account/resource/offer/replay authority                            | research only                     |
| H6  | M8 offline scheduling/dormancy contract                               | research only                     |
| H7  | fresh M9 Compatibility Review, ADR and task decomposition             | not started                       |

## Security/privacy prerequisites

- threat model for account takeover, confused deputy, replayed delegation and cross-world leakage;
- purpose-specific consent and deletion/anonymization policy review;
- provider supply-chain, retention and telemetry audit;
- clear operator/admin vs resident authority boundary;
- deterministic revocation/commit linearization and incident audit retention。

No prerequisite authorizes biometric or KYC integration by itself。
