# 31 Formal M7 Minimum Scope Proposal

Not implementation. Candidate capability list for a future formal M7 v1 charter.

## Proposed capabilities (12)

1. **Projection contract v1** (`m7-projection-v1`) with snapshot/delta schemas and sourceWorldSeq.
2. **Snapshot builder** from worlds + resident_runtime_states (+ seed identity/location refs).
3. **Delta emitter** for MOVE/SLEEP lifecycle and world header updates.
4. **Realtime read-model adapter** (Colyseus-shaped acceptable) that is disposable.
5. **AOI v1** on logical street/places with reconnect-safe interest sets.
6. **afterSeq client recovery** with gap → resnapshot, no guessing.
7. **MOVE visualization** using intent + interpolation, location switches only on COMPLETED.
8. **First street topology presentation pack** binding 17 logical locations to anchors/assets without changing ids.
9. **Basic avatar presentation** with V1–V3 visual LOD and asset failure fallback.
10. **30-resident observation** where world population is 30, but render fidelity is budgeted.
11. **Reconnect/offline return UX** honest with world still running.
12. **Truth rebuild path**: delete projection/realtime and rebuild from PostgreSQL truth.

Optional stretch (only if dependencies ready):

13. Read-only resident history panel from committed events.
14. Lag honesty UI wired to M8 lagState.
15. Development intent gateway for one authenticated embodied action path.

## Explicitly out of M7 v1 minimum

- full economy UI as authority
- memory/relationship graph ownership
- proxy charter runtime
- high-fidelity physical world simulation as truth
- multi-district open world
- 1000-player realtime
- production mobile certification without evidence matrix

## Dependency note

Formal M7 should not start as production milestone while M3 remains incomplete if living autonomous street behavior is required. Pure observation of existing runtime states can be studied, but “活着的第一条街” needs PRE-AL-07+ driver.
