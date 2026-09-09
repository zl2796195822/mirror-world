# 16 Asset Pipeline

## First street M7 v1 asset needs

| Category         | Examples                         | Static?              | Runtime binding?                | LOD?                 | Asset version? |
| ---------------- | -------------------------------- | -------------------- | ------------------------------- | -------------------- | -------------- |
| Street shell     | roads, sidewalks, lamps, trees   | mostly static        | zone anchors                    | instancing/props LOD | yes            |
| Buildings        | apartment, office                | static shell         | place bind                      | exterior LOD         | yes            |
| Home markers     | unit entries                     | static               | locationId bind                 | yes                  | yes            |
| Office           | workplace exterior/interior-lite | static               | locationId                      | yes                  | yes            |
| Store            | convenience store                | static               | locationId + hours presentation | yes                  | yes            |
| Cafe             | cafe                             | static               | locationId                      | yes                  | yes            |
| Park             | benches/paths                    | static               | locationId                      | yes                  | yes            |
| Transit entrance | bus/metro entry                  | static               | locationId                      | yes                  | yes            |
| Avatar bodies    | VRM/proxy                        | catalog              | residentId → asset profile      | yes                  | yes            |
| Props            | cups, signs, bags                | mostly static/attach | optional                        | yes                  | yes            |

## Pipeline stages (recommended)

```text
Source art
  → Inspector (metrics, materials, VRM metadata)
  → Budget Gate (desktop/mobile profiles)
  → Transform (Meshopt, KTX2 policy, LOD0/1/2)
  → Semantic Gate (VRM extensions preserved for LOD0/1)
  → Manifest (assetKey, hashes, LOD matrix, anchors)
  → CDN/static store
  → Client Asset Cache (lease/dedupe)
```

## Experiment input, not production approval

Usable as design input:

- KTX2 (ETC1S diffuse / UASTC quality-critical)
- Meshopt preferred over Draco for stream size (same-fixture evidence)
- LOD pipeline
- budget gate concepts
- asset cache leases

Must not claim production approved until formal M7 evidence matrix passes.

## Metric discipline

Use EXP-ASSET-001 corrected intrinsic metrics:

- official sample intrinsic ~36,470 tris, not “700k single model”
- distinguish intrinsic triangles vs multi-pass rendered triangles
- distinguish JS heap vs GPU VRAM

## Binding to world

Assets bind to **locationId** and **avatarAssetId**, never rewrite them.

Place remodel:

- same locationId
- new geometry/asset version
- history intact

## Missing / failed assets

Street must degrade honestly:

- missing building → placeholder volume + label
- missing avatar → V1 marker
- never invent a different resident/place identity

## Third-party license

Any new production dependency requires registry update in `docs/third-party/THIRD_PARTY_REGISTER.md` during formal M7 (not this research).

Experiment packages already recorded in their branches are not automatically approved for main.
