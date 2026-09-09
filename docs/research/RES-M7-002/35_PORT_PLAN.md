# 35 Port Plan

How experiment/research material may later enter formal M7 — without whole-branch merge.

## Process

```text
Compatibility Review against then-current main
  → Asset / Projection Contract ADR(s)
  → Selective port with tests
  → Formal verification report
  → Gate evidence
```

No cherry-pick of experiment branches into main as a shortcut.

## Port candidates by source

### From EXP-REALTIME-001

Port ideas:

- read-only projection adapter pattern
- AOI spatial grid in projection layer
- token reconnect + fresh snapshot
- stale version guard
- layered sync rates

Do not port blindly:

- dummy simulator as truth
- lab benchmarks as gates

### From EXP-3D-001 / EXP-3D-002

Port ideas:

- R3F + Three + Rapier stack choice
- street shell layout inspiration
- instancing, zone streaming, visual LOD patterns
- thick collider lesson

Do not port:

- Yuka as formal nav dependency
- unoptimized VRM counts
- design-reference art as final without asset gate

### From EXP-ASSET-001 / EXP-M7-003 / EXP-M7-004

Port ideas:

- inspector + budget gate
- LOD pipeline
- KTX2/Meshopt policy
- asset cache leases
- semantic preservation gate
- shared/clone ownership table

Do not port:

- Node timings as FPS
- fixed 20/40m thresholds as world rules
- LOD2 typed as full VRM
- synthetic resident instances as product residents

### From RES-M8-001

Port ideas:

- lag honesty states
- multi-rate table
- rebuild path
- visual vs execution LOD separation

### From RES-M9-001

Port ideas:

- identity layer separation
- embodiment ≠ identity
- redaction boundary

## Suggested formal ADR candidates (later)

- ADR-M7-001 Projection Truth Boundary
- ADR-M7-002 Snapshot/afterSeq Protocol
- ADR-M7-003 Place Identity vs Geometry Version
- ADR-M7-004 Asset Budget & LOD Policy
- ADR-M7-005 Realtime Technology Selection (Colyseus or alternative)

## Port order recommendation

1. Contracts + projection builder + rebuild tests (headless)
2. Realtime adapter + AOI + reconnect
3. Minimal street presentation + V1 markers
4. Avatar/asset pipeline with gate
5. Performance/device evidence
6. Optional embodied intent path
