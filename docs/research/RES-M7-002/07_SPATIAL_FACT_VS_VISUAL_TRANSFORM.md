# 07 Spatial Fact vs Visual Transform

## Problem

World currently has logical locations (`locationId` + kind). Scene needs coordinates.

If M7 elevates browser x/y/z into world facts too early, we permanently couple history to one mesh.

## Classification

### World Spatial Fact (authoritative)

Current + near-term:

- `locationId`
- `locationKind` (HOME/OFFICE/CAFE/STORE/PARK/TRANSIT)
- logical reachability (today kind-matrix travel times; future graph if needed)
- activity target location id

Future possible upgrade candidates (NOT v1):

- named doorway / zone id inside a building
- logical route graph edge ids
- occupancy constraints (capacity)

These remain **logical**, still not raw floats.

### Derived Presentation State (non-authoritative)

- `x/y/z`
- yaw/pitch
- navmesh path samples
- animation frame / blend tree weights
- camera distance
- LOD level
- material/emissive
- AOI cell index
- rain particle intensity

## M7 v1 recommendation

Keep world at **location-granularity only**.

Do **not** build high-fidelity physical world simulation as truth.

Rationale:

1. First street MVP places are coarse semantic venues.
2. Travel is already semantic minutes, not meters.
3. Swapping street mesh must not rewrite resident history.
4. Physics bugs (e.g. tunneling from EXP-3D-002) must never corrupt truth.

## Binding contract

```text
World locationId  ──binds──►  Place Presentation Anchor(s)
```

A place presentation package may expose:

- primary spawn anchor
- interior anchors (optional)
- entrance point
- walking route between places (presentation graph)

Binding is versioned (doc 18). Breaking mesh changes bump geometry version, not locationId.

## Example

| Truth                     | Presentation                                 |
| ------------------------- | -------------------------------------------- |
| `locationId=cafe`         | anchor at street corner cafe door / interior |
| `locationId=home-unit-03` | apartment building entry / unit marker       |
| TRAVELING home→cafe       | sidewalk path polyline or navmesh route      |

If cafe remodels:

- same `locationId`
- new `assetVersion` / `geometryVersion`
- history events still refer to cafe id

## Forbidden

- Storing navmesh hit point as Kernel location
- Using three.js object uuid as resident/location id
- Treating visual LOD distance as world distance fact
- Letting client raycast pick "true location"

## Allowed future upgrade path

If later product needs finer spatial facts:

1. ADR first
2. New logical place sub-id (e.g. `zoneId`)
3. Keep mesh floats out of Kernel
4. Migrate history by aliasing, not rewriting event payloads casually

## v1 decision

**Logical Topology owns truth. Mesh Geometry owns pixels.**

No premature physical world authority.
