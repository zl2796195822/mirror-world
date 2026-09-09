# 06 MOVE Presentation Semantics

## Current formal semantics (CURRENT FACT)

From ADR-0009 / PRE-AL-05:

1. MOVE start: activity → `TRAVELING`, **location unchanged**
2. Travel duration from `m3-action-semantics-v1` kind matrix
3. MOVE complete: activity → `IDLE`, **location → destination**
4. Same-location MOVE rejected
5. World facts change only through Kernel commits

Therefore world location is **not** a continuous path. It is a discrete authority.

## The visualization problem

User must see a person walking from A to B, while truth says:

- until completion: resident is still at A
- at completion: resident is at B

If the browser invents continuous location and writes it back, we get a second truth. Forbidden.

## Four-way separation (recommended)

```text
1. Authoritative logical location
   resident_runtime_states.current_location_id
   Owner: Kernel
   Changes: only on MOVE COMPLETED

2. Movement intent
   activity=TRAVELING + targetLocationId + started/due worldTime + activityInstanceId
   Owner: Kernel
   Purpose: tells projection "a move is in progress from current toward target"

3. Presentation interpolation
   path progress t in [0,1] derived from worldTime window
   Owner: Projection / Client
   Formula (PROPOSED):
     t = clamp((worldTime - startedAt) / (dueAt - startedAt), 0, 1)
   Not durable. Not a fact.

4. Visual transform
   x/y/z, rotation, animation phase, navmesh route sample
   Owner: Scene / Avatar
   Not durable. Never sent to Kernel as location.
```

## Mapping table

| World fact                                 | Visual representation                                   |
| ------------------------------------------ | ------------------------------------------------------- |
| location=A, activity=IDLE                  | stand/loaf at A anchor                                  |
| location=A, activity=TRAVELING→B           | walk along A→B presentation path, progress by worldTime |
| location=B, activity=IDLE (after complete) | snap or blend to B anchor; stop walk                    |
| SLEEPING at HOME                           | sleep pose at home anchor                               |

## Critical rules

1. **Never write browser coordinates into `current_location_id`.**
2. If MOVE is REJECTED after visual anticipation started, presentation must roll back to last committed state (doc 20).
3. If client worldTime is stale, interpolation may lag; it must not invent faster completion.
4. On COMPLETED event, even if animation is mid-path, authority says B. Presentation should finish quickly or cut to B — **truth wins**.
5. Travel duration for animation should use the same world-time window from the start event, not a separate client random speed as authority.

## Example projection delta for MOVE

```json
{
  "type": "RESIDENT_MOBILITY",
  "sourceWorldSeq": "901",
  "residentId": "…",
  "from": {
    "locationId": "home-01",
    "activity": { "kind": "IDLE" }
  },
  "to": {
    "locationId": "home-01",
    "activity": {
      "kind": "TRAVELING",
      "targetLocationId": "cafe",
      "startedAtWorldTime": "2026-09-09T18:00:00+08:00",
      "dueAtWorldTime": "2026-09-09T18:10:00+08:00",
      "activityInstanceId": "…"
    }
  }
}
```

On completion:

```json
{
  "type": "RESIDENT_MOBILITY",
  "sourceWorldSeq": "940",
  "residentId": "…",
  "from": { "activity": { "kind": "TRAVELING", "targetLocationId": "cafe" } },
  "to": {
    "locationId": "cafe",
    "activity": { "kind": "IDLE" }
  }
}
```

## Path geometry

Path geometry is presentation:

- may use navmesh / waypoints / straight spline
- may differ per asset version
- **must not** change logical destination id
- may be absent: still valid to show simple teleport cut if assets unavailable

Logical duration matrix is world semantics. Visual path length is not.

## Out-of-order / late clients

If client receives COMPLETED before finishing previous animation:

- apply authoritative state
- cancel/blend animation
- do not keep walking forever toward a destination that is already committed

If client misses STARTED and only sees COMPLETED:

- place avatar at destination
- do not reconstruct a fake historical walk unless timeline UI is explicitly requested later

## Relationship to RESIDENT_MOVED event type

Main currently registers both `RESIDENT_MOVED` and `RESIDENT_MOVE_STARTED/COMPLETED`.

For M7 v1 projection, prefer folding **STARTED/COMPLETED** lifecycle events + runtime rows.

Do not require a separate continuous `RESIDENT_MOVED` coordinate stream. If a future high-frequency position event is added, it must be presentation feed, not location authority, and must be clearly non-durable or derived.

## Gate implication

Formal M7 gate should verify:

- during TRAVELING, projected `locationId` remains source
- only COMPLETED moves `locationId`
- client cannot force location by sending coordinates
- rejected MOVE does not leave permanent visual teleport
