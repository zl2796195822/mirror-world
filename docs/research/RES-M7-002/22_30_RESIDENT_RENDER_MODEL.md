# 22 Thirty Resident Render Model

## Clarification

```text
World population = 30
AOI population = subset streamed
Visible avatars = subset rendered
Full-fidelity avatars = smaller subset at V3
```

These are four different numbers.

## Recommended model

| Bucket             | Definition                             | v1 target guidance                    |
| ------------------ | -------------------------------------- | ------------------------------------- |
| World population   | truth residents in world               | 30 fixed sample                       |
| In logical AOI     | residents in street/places of interest | up to 30                              |
| Visible avatars    | rendered entities (V1–V3)              | budget-based, not necessarily 30 full |
| Full-fidelity (V3) | nearest/selected                       | small, e.g. single digits             |

Do **not** assume M7 v1 requires 30 photoreal VRMs on screen simultaneously.

## Experiment evidence (boundary)

- EXP-ASSET-001: balanced mix 30 actors reached 60 FPS in asset viewer harness
- EXP-3D-002: 30 VRMs without LOD not shippable
- EXP-M7-003: estimates show full LOD0×30 over budget

These are not formal acceptance numbers.

## Streaming policy

- Always project all in-AOI residents at least as V1 markers
- Promote to V2/V3 by distance/importance/budget
- Keep logical state (IDLE/TRAVELING/SLEEPING) for all, even at V1

## UI completeness

Resident list / inspector can show all 30 truth states even if not all meshes load.

Scene incompleteness must not imply world incompleteness.

## Future 300/1000

Same model scales:

- truth population grows
- AOI mandatory
- visual fidelity decays with distance
- never require full-fidelity census rendering
