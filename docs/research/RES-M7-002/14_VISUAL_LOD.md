# 14 Visual LOD

## Separation

Visual LOD is **only** about render cost and fidelity.

It must not affect:

- resident existence
- action outcomes
- identity
- relationships
- economy
- history
- intelligence depth (M5 I-LOD)
- world execution LOD (M8 W0/W1/W2)

## Proposed levels (research)

| Level | Name                      | Use                     | Owns                   |
| ----- | ------------------------- | ----------------------- | ---------------------- |
| V0    | invisible / no avatar     | culled or not requested | nothing rendered       |
| V1    | icon / lightweight marker | far away, low end       | billboard/simple mesh  |
| V2    | simplified avatar         | mid distance            | reduced mesh/anim      |
| V3    | full avatar               | near / selected         | full VRM + richer anim |

Exact thresholds are presentation policy, not world rules.

EXP-M7-003 explicitly discarded fixed 20m/40m thresholds as production constants; use policy + hysteresis.

## Inputs to LOD policy

Allowed:

- camera distance (presentation)
- importance (self, selected, conversation)
- device profile (desktop/mobile)
- scene budget remaining
- asset availability

Forbidden as authority:

- changing resident truth because LOD changed
- treating V0 as "resident gone from world"
- using visual LOD to skip needed action simulation (that is M8 execution LOD)

## Experiment evidence (not formal gate)

- EXP-ASSET-001: LOD0/1/2 pipeline + balanced 30 actors viable in viewer
- EXP-3D-002: visual LOD + far proxies prevented 30 full VRM collapse
- EXP-M7-003: policy LOD + hysteresis + semantic gate; LOD2 is visual proxy, not VRM semantic equivalent

## Budget relationship

- Offline single-asset gate (EXP-ASSET-001) ≠ scene budget
- Scene budget sums visible avatar representations
- Shared textures/materials count once via cache leases

## Client rules

1. LOD switch must not look like identity change (keep residentId mapping stable).
2. Hysteresis prevents thrash.
3. Selected/followed resident promotes fidelity within budget.
4. Mobile profile is stricter, but physical mobile remains UNVERIFIED.

## Gate implications

Formal M7 should prove:

- LOD changes never mutate Kernel/projection truth fields except presentation hints
- resident still exists when V0
- budget estimator and asset gate both pass for chosen first-street kit
