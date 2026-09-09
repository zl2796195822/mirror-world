# 11 Snapshot + afterSeq Recovery Protocol

## Goal

Client never guesses world state. Ordered, gap-safe recovery.

## Recommended protocol

```text
Client connects / reconnects
  → Request projection snapshot (optional AOI scope)
  → Receive snapshot { sourceWorldSeq = X, residents, header }
  → Subscribe updates afterSeq = X
  → Apply ordered deltas with seq ranges
  → If gap/duplicate/stale → recovery
```

## Message contracts (PROPOSED)

### SnapshotResponse

```ts
type SnapshotResponse = {
  protocolVersion: "m7-projection-v1";
  worldId: string;
  sourceWorldSeq: string; // decimal
  worldTime: string;
  worldStatus: "RUNNING" | "PAUSED" | "MAINTENANCE";
  lagState?: "CURRENT" | "MINOR_LAG" | "CATCHING_UP" | "SEVERELY_BEHIND";
  aoi: { kind: "STREET" | "PLACES"; placeIds?: string[] };
  residents: ProjectionResident[];
};
```

### DeltaUpdate

```ts
type DeltaUpdate = {
  protocolVersion: "m7-projection-v1";
  worldId: string;
  fromSeqExclusive: string;
  toSeqInclusive: string;
  residentUpserts: ProjectionResident[];
  header?: Partial<ProjectionWorldHeader>;
};
```

## Client apply algorithm

```text
cursor = snapshot.sourceWorldSeq
for each delta:
  if delta.worldId != expected: reject/resync
  if delta.fromSeqExclusive != cursor:
      if delta.toSeqInclusive <= cursor: drop duplicate
      else: GAP → resync(snapshot afterSeq=cursor or fresh)
  else:
      apply delta
      cursor = delta.toSeqInclusive
```

## Failure cases

| Case                   | Detection                            | Client action                                    |
| ---------------------- | ------------------------------------ | ------------------------------------------------ |
| duplicate packet       | toSeq ≤ cursor                       | drop                                             |
| out-of-order           | fromSeq mismatch / lower version     | drop or resync                                   |
| gap                    | fromSeq > cursor+1 expected          | full/partial resnapshot                          |
| stale snapshot         | snapshot seq older than cursor       | ignore, keep cursor or resync newer              |
| reconnect after 10 min | cursor far behind or unknown         | fresh snapshot                                   |
| tab suspend            | same                                 | fresh snapshot                                   |
| server restart         | disconnect + empty realtime state    | reconnect → fresh snapshot                       |
| projection rebuild     | seq continuity may jump via snapshot | accept snapshot if seq >= known truth seq policy |

## Server rules

1. Snapshot and deltas must be generated from the same projection consistency point.
2. Never send delta ranges that skip uncommitted holes.
3. Stamp every payload with `sourceWorldSeq` / seq range.
4. AOI snapshots include only interest subset but still carry global world seq.
5. If projection cannot serve contiguous range, force client snapshot.

## Why fresh snapshot on reconnect (aligned with EXP-REALTIME-001)

For 30–100 entities, full snapshot is simpler than long delta buffers:

- immune to drift
- easier correctness
- less server memory
- clearer gate tests

Do not build a sophisticated historical replay buffer for M7 v1 clients.

## Late join

Always snapshot-first. No event history replay required for street view.

Historical timeline UI is a separate read API (doc 25), not the realtime path.

## Client sleep / battery

If client was asleep long enough that seq gap is unknown:

- do not try to catch up by guessing velocities
- snapshot
- snap avatars to committed state
- resume presentation interpolation from new truth

## Gate

Must verify:

- disconnect mid-TRAVELING → reconnect shows correct activity/location
- forced gap injection triggers resync
- duplicate deltas are idempotent at client
- server restart recovery works
