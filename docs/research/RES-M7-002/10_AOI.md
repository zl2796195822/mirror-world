# 10 AOI (Area of Interest)

## Definition

AOI is a **stream bandwidth and compute filter** in the projection/realtime layer.

It is **not** a world existence filter.

```text
Resident outside AOI ≠ Resident does not exist
Resident not rendered ≠ Resident paused
```

## Compatibility with EXP-REALTIME-001

Experiment proven (lab):

- spatial grid rebuild cheap
- AOI vs global broadcast saved ~89% outbound in 100-entity / 4-observer setup
- spatial index must stay in projection layer

M7 v1 should adopt AOI early even at 30 residents, because:

- reconnect and late-join correctness is simpler with explicit interest sets
- future 300/1000 scaling depends on it
- prevents accidental full-world spam architecture

## AOI basis options

| Basis                          | v1 fit            | Notes                                       |
| ------------------------------ | ----------------- | ------------------------------------------- |
| logical place / building       | good              | matches locationId truth                    |
| street/zone                    | good              | first street natural                        |
| room                           | later             | if interiors exist                          |
| metric distance                | presentation only | needs visual coords; not truth              |
| hybrid: zone + distance refine | recommended       | zone from truth, distance from presentation |

Recommended v1:

- Primary interest: **logical street / place set**
- Secondary refine: presentation camera radius (optional)
- Never require precise physical distance for existence

## Scenarios

### Enter AOI

1. Client camera/zone interest includes place P
2. Server sends snapshot subset: residents currently at P + travelers targeting/leaving P as policy defines
3. Client spawns avatars at committed locations / travel progress

### Leave AOI

1. Stop deltas for those residents
2. Client despawns or freezes cheaply
3. Resident continues in truth

### Teleport / far jump

If user camera jumps across street:

- new AOI snapshot
- no need to animate all intermediate residents

### Late join

Snapshot at current `sourceWorldSeq` for AOI subset, then `afterSeq`.

### High churn

At 30 residents, churn is low. Still:

- coalesce enter/leave
- avoid thrash hysteresis (presentation distance band)

### Future 300 / 1000

AOI mandatory. May need:

- interest management hierarchy
- room/zone sharding in realtime
- reduced fidelity for distant entities (Visual LOD)

None of that changes world population facts.

## Travelers and AOI edge cases

A resident TRAVELING from A to B:

- include if A in AOI or B in AOI or path crosses presentation AOI (policy)
- do not drop mid-move in a way that corrupts client state; either keep until complete or provide clear despawn rule
- recommended v1: if either endpoint in logical AOI, keep streaming until activity completes

## Metrics

- entities streamed per client
- AOI churn rate
- bandwidth
- snapshot size
- false despawn/respawn counts

## Gate

Formal M7 must show:

- resident exists in truth while outside AOI
- re-enter AOI shows correct current committed state
- AOI off/on does not change Kernel rows
