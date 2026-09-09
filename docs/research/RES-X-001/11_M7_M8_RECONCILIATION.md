# 11 M7 × M8 Reconciliation

## Seq meanings

The same word `seq` appears at different layers and must not be collapsed:

| Name                              | Meaning                                                                      | Authority                                 |
| --------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| Truth current seq                 | durable `worlds.world_seq`, latest committed world event position            | Kernel/Event Ledger                       |
| Projection current seq            | last event position incorporated into a projection builder/store             | M7 projection, rebuildable                |
| Catch-up applied seq              | last committed event position applied by the M8 driver during a catch-up run | Kernel result observed by M8              |
| Visible seq                       | client cursor after applying snapshot/deltas                                 | untrusted presentation cursor             |
| `snapshot@X` / `sourceWorldSeq=X` | projection snapshot generated from a consistency point at X                  | M7 read protocol; not a truth replacement |

`snapshot@X → afterSeq=X` is a network consistency rule, not a promise that X is the current world seq. The snapshot must carry world freshness/status and the client must not treat a stale projection as current.

## Candidate return flow

```text
Open client
  → inspect world freshness / persisted vs target time
  → if needed, wait for or perform residual M8 catch-up
  → obtain snapshot at sourceWorldSeq=X
  → subscribe afterSeq=X
  → apply contiguous deltas
  → optional digest from committed history
  → enable interaction only under freshness/authority policy
```

If a client opens during `CATCHING_UP`, M7 may show the last committed snapshot with an honest lag banner; it must not invent intermediate life or enable writes by default. If the projection cannot provide a contiguous range, force a fresh snapshot. If `SEVERELY_BEHIND`, visible state is explicitly degraded.

## Finding

`PARTIALLY_ALIGNED`。M7 defines network recovery and M8 defines world recovery, but exact ordering, catch-up progress API, digest cursor, projection freshness and write gating are still pending. Registered `X-C011`, `X-C012`, `X-C013`.
