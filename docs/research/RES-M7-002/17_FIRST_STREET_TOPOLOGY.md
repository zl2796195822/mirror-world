# 17 First Street Topology

## Current logical fixture (CURRENT FACT)

`first-street-v1` seed produces 17 locations:

- 12 × HOME (`home-unit-01`..`home-unit-12`)
- 1 × OFFICE
- 1 × CAFE
- 1 × STORE
- 1 × PARK
- 1 × TRANSIT

30 residents live in these homes/workplaces via deterministic seed.

Travel times are kind→kind matrix minutes, not meters.

## Core decision

**Logical Topology ≠ Mesh Geometry**

```text
World Location Graph (truth-adjacent)
   locationId, kind, reachability, occupancy later

Place Presentation Graph
   anchors, entrances, nav paths, meshes

3D Geometry Assets
   glTF/GLB/VRM, materials, LODs
```

Replacing the street mesh must not change:

- residentId
- historical location references
- action outcomes
- event payloads' location ids

## Recommended topology model for M7 v1

### World side (already exists as fixtures; may later be table)

- stable `locationId`
- `kind`
- semantic reachability (today implicit via matrix; optional explicit edges later)

### Presentation side (PROPOSED)

```ts
type PlacePresentation = {
  locationId: string;
  kind: "HOME" | "OFFICE" | "CAFE" | "STORE" | "PARK" | "TRANSIT";
  anchors: {
    exterior?: [number, number, number];
    interior?: [number, number, number];
    sign?: [number, number, number];
  };
  assetRef: {
    assetId: string;
    geometryVersion: string;
  };
  hoursPresentation?: { openMinute: number; closeMinute: number }; // presentation only unless M6 owns truth later
};
```

### Route presentation

- sidewalk/path graph or navmesh
- used only to animate TRAVELING
- not written back as world distance truth

## Why separate

1. Art iteration speed
2. Multiple visualizations of same history
3. Mobile simplified street vs desktop rich street
4. Prevents physics/nav bugs from becoming Kernel bugs

## First street v1 scene scope suggestion

- one continuous street block
- exterior-first, light interiors optional
- clear place anchors for all 17 logical locations
- transit entrance as portal marker, not full subway sim
- park as open zone

Do not overbuild multi-district open world before projection contract is proven.

## Gate

- swap presentation asset version under same locationIds
- replay/history APIs still resolve place names
- MOVE still uses logical destination ids only
