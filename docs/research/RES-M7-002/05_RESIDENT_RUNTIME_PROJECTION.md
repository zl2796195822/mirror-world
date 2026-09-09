# 05 Resident Runtime → Scene Projection Contract

## Purpose

Define how durable `resident_runtime_states` (+ observation fields) become a scene-facing projection, without assuming every desired field already exists.

## Field status legend

- CURRENT FACT: exists in main authority/contract
- DERIVED: computed from CURRENT FACT
- PROPOSED: recommended new projection/contract field, not in main
- PENDING: depends on another milestone/research

## Contract draft

### World context

| Field            | Status       | Source                                    |
| ---------------- | ------------ | ----------------------------------------- |
| `worldId`        | CURRENT FACT | worlds                                    |
| `worldStatus`    | CURRENT FACT | worlds.status                             |
| `worldTime`      | CURRENT FACT | worlds.world_time                         |
| `sourceWorldSeq` | CURRENT FACT | worlds.world_seq / runtime sourceWorldSeq |
| `lagState`       | PENDING_M8   | RES-M8-001 research                       |
| `freshnessLabel` | PROPOSED     | presentation honesty label                |

### Resident identity reference

| Field               | Status                           | Source                              |
| ------------------- | -------------------------------- | ----------------------------------- |
| `residentId`        | CURRENT FACT                     | seed / runtime PK                   |
| `actorId`           | CURRENT FACT                     | ActorRef bridge                     |
| `identityKind`      | CURRENT FACT (NATIVE only today) | observation self / future M9        |
| `displayName`       | PROPOSED                         | seed profile presentation, not auth |
| `avatarAssetId`     | PROPOSED                         | presentation profile                |
| `appearanceVersion` | PROPOSED                         | asset manifest version              |

### Spatial / activity

| Field                | Status                      | Source                                                    |
| -------------------- | --------------------------- | --------------------------------------------------------- |
| `locationId`         | CURRENT FACT                | runtime.current_location_id                               |
| `locationKey`        | CURRENT FACT (fixture ref)  | location fixture / Observation location.key               |
| `locationKind`       | CURRENT FACT                | HOME/OFFICE/CAFE/STORE/PARK/TRANSIT                       |
| `activity.kind`      | CURRENT FACT                | IDLE/TRAVELING/SLEEPING                                   |
| `activityInstanceId` | CURRENT FACT                | runtime                                                   |
| `targetLocationId`   | CURRENT FACT when TRAVELING | runtime                                                   |
| `startedAtWorldTime` | CURRENT FACT when active    | runtime                                                   |
| `dueAtWorldTime`     | CURRENT FACT when active    | runtime                                                   |
| `stateVersion`       | CURRENT FACT                | runtime optimistic concurrency                            |
| `movementPhase`      | PROPOSED                    | 0..1 presentation progress derived from worldTime window  |
| `availability`       | PROPOSED                    | e.g. BUSY/AVAILABLE_FOR_INTERACTION derived from activity |

### Obligation / future displays

| Field                   | Status                                        | Source                                             |
| ----------------------- | --------------------------------------------- | -------------------------------------------------- |
| `workObligation.status` | CURRENT FACT via Observation                  | NO_CURRENT_OBLIGATION/NOT_DUE/DUE/LATE             |
| `workplaceId`           | CURRENT FACT when employed                    | Observation                                        |
| `needsSummary`          | PENDING_M3_PERSISTENCE                        | needs are pure evaluator today, not durable events |
| `relationshipSummary`   | PENDING_M4                                    | must not be owned by M7                            |
| `cashCents`             | CURRENT FACT as read-only seed snapshot today | Actor resource bridge; future M6                   |

## Important non-assumptions

Do **not** assume these exist in main:

- separate residents table
- locations table
- avatar table
- presentation profile table
- continuous position stream
- user-visible activity descriptions beyond enum kinds
- weather, traffic, crowd density as world facts

## Minimal scene-facing payload example

```json
{
  "worldId": "…",
  "sourceWorldSeq": "1842",
  "worldTime": "2026-09-09T18:10:00+08:00",
  "residentId": "…",
  "locationId": "…",
  "locationKind": "CAFE",
  "activity": {
    "kind": "TRAVELING",
    "activityInstanceId": "…",
    "targetLocationId": "…",
    "startedAtWorldTime": "2026-09-09T18:05:00+08:00",
    "dueAtWorldTime": "2026-09-09T18:15:00+08:00"
  },
  "stateVersion": 12,
  "workObligationStatus": "DUE",
  "presentation": {
    "visualLodHint": "V2",
    "avatarAssetId": "avatar_native_01",
    "appearanceVersion": "1.0.0"
  }
}
```

`presentation` block is explicitly non-authoritative.

## Mapping rules

1. Project authoritative fields verbatim (or losslessly normalized).
2. Compute presentation hints separately.
3. Never replace `locationId` with interpolated coordinates.
4. If runtime row is missing (bootstrap gap), projection marks resident `UNAVAILABLE` rather than inventing home teleport without authority.
5. Batch projection for first street should support all 30 residents, but AOI may stream fewer.

## Scene interpretation

| Activity           | Scene meaning                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------- |
| IDLE at location L | avatar stands/loafs at L's presentation anchor                                           |
| TRAVELING to T     | visual path from source anchor toward T; logical location remains source until COMPLETED |
| SLEEPING at home   | sleep presentation at current location (HOME)                                            |

## Versioning

- Runtime policy already versioned: `m3-runtime-state-v1`
- Projection contract should add its own version, e.g. `m7-projection-v1` (PROPOSED)
- Breaking projection changes must not silently reinterpret old snapshots
