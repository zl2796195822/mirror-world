# 08 M9 × M10 Reconciliation

## Overall result

`PARTIALLY_ALIGNED` with `PENDING_FORMAL_CONTRACT` for Proxy-to-I mapping.

| Topic                          | Evidence-aligned reading                                                                                                                                                        | Open contract                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Does identity determine I-LOD? | `NO`. M9 identity/origin and M10 cognition depth are orthogonal; changing avatar, provider, account or resident origin must not silently change I level.                        | None at principle level                                                       |
| Human direct control           | Direct human ActionRequest is not system cognition and does not consume M10 model budget. Optional LLM assist does.                                                             | Define assist attribution and interaction quota                               |
| Rule authority                 | `DETERMINISTIC_RULE` maps to I0 and possibly deterministic I1; it remains bounded and Kernel-mediated.                                                                          | Freeze source-to-level vocabulary                                             |
| Proxy Runtime                  | Proxy can request only levels allowed by its Charter, resident rights and M10 budget/fairness.                                                                                  | M9 Charter needs max level/scope and approval semantics                       |
| Optional LLM                   | M9 lists `OPTIONAL_LLM` as a cognition source; M10 treats LLM as a provider/mechanism for an I level. These can coexist only if source, level and provider are separate fields. | Formal `CognitionContext`/attribution contract                                |
| Can Proxy request I3?          | Not established. M10 rejects I3 over charter; M9 does not freeze an I3 entitlement.                                                                                             | Who approves, which budget, charter cap, rights check, confirmation and audit |

## No privilege inference

`I3` means deeper bounded candidate generation, not stronger action rights. M9's `ProxyPermission ⊆ ResidentRights` and M10's “no I3 privilege action” align. Kernel still validates the resulting request, and M5 cannot edit the Charter.

## Suggested boundary fields

Research-only shape for future review: `cognitionSource`, `requestedIntelligenceLevel`, `effectiveIntelligenceLevel`, `providerRef`, `budgetDecisionRef`, `delegationRef`, `charterVersion`, `basedOnWorldSeq`. This is not a contract implementation and does not modify current ActionRequest.

## Main risk

M10's shorthand `NATIVE/HUMAN/PROXY` table and M9's `NATIVE/HUMAN_ORIGIN + Control/Cognition/Embodiment` model can cause callers to infer budget, permissions or disclosure from a single enum. Registered as `X-C007`, `X-C008`, `X-C009`, `X-C010`.
