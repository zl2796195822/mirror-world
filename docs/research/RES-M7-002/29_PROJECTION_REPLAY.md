# 29 Projection Replay / Rebuild

## Target

```text
Delete ALL M7 projection / realtime / scene cache
→ Rebuild from World Truth
→ Clients converge
```

Answer: **YES**. This is a hard architectural goal for formal M7.

## What may be deleted

- projection tables (if any)
- realtime room memory
- AOI indexes
- client IndexedDB/caches
- avatar GPU caches
- presentation path caches

## What must remain

- PostgreSQL worlds
- event ledger
- runtime states
- action requests/outcomes
- checkpoints (optional accelerator)

## Rebuild algorithm

```text
1. Read world header (status, worldTime, worldSeq)
2. Read resident_runtime_states for world
3. Resolve identity/location refs via seed/fixtures/catalog
4. Build ProjectionSnapshot at sourceWorldSeq
5. Start realtime from snapshot
6. Tail commits after seq
```

Optional later:

- projection checkpoint every N minutes to speed rebuild
- still rebuildable without it

## Difference from world replay

| Kind                       | Purpose                    |
| -------------------------- | -------------------------- |
| Event ledger replay (M2)   | canonical history/hash     |
| Runtime projection rebuild | current scene-facing state |
| Life decision re-eval      | M3/M5 concerns             |
| Client frame replay        | **not required**           |

M7 does not need to replay 60 FPS frames to recover.

## Future Gate proposal

`G-PROJ-REBUILD`:

1. Seed world with N MOVE/SLEEP commits
2. Build projection and open client
3. Drop projection + kill realtime
4. Rebuild
5. Assert resident locations/activities match runtime authority and seq continuity from snapshot point
6. Assert Kernel checksums unchanged

## Note on current main

Full resident/domain replay remains incomplete (RES-M3-003 / M3-T04 path). Projection rebuild from **current runtime rows** is still valid for live current-state scenes. Historical deterministic full simulation replay is a separate gate.
