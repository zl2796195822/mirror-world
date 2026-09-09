# 18 Location Identity

## Three identities

| Concept                       | Stable?                       | Example                | Owner                                                  |
| ----------------------------- | ----------------------------- | ---------------------- | ------------------------------------------------------ |
| Place Identity (`locationId`) | YES, long-term world fact key | cafe location uuid     | World / Kernel-adjacent fixture or future places table |
| Asset Identity                | replaceable catalog id        | `qinghe-cafe-exterior` | Presentation asset catalog                             |
| Geometry Version              | bump on remodel               | `geo-1.2.0`            | Asset manifest                                         |

## Question answered

> 同一个咖啡店重新装修、模型替换、建筑资产换版本：历史事件中的 locationId 是否仍保持不变？

**YES. It must.**

Historical `RESIDENT_MOVE_*` payloads, runtime states, and future timelines continue to reference the same `locationId`.

Remodel changes only:

- assetId if package replaced
- geometryVersion
- presentation anchors if needed

## Rules

1. Never reuse a `locationId` for a different real place.
2. If a place is demolished and replaced by a different place, mint a new `locationId` and close/alias the old one in presentation catalog.
3. Asset UUIDs/three.js names are not locationIds.
4. Home unit ids in seed are already logical place ids — keep them.

## Alias / migration

If fixture keys change:

- provide alias map oldKey→newId only with ADR
- do not rewrite append-only event ledger casually
- projection can resolve display names via catalog

## Resident history UX

When user opens old event:

- show place name from catalog at current mapping
- if place replaced, show “formerly / currently” honesty if needed
- still show original locationId in technical detail

## Version fields to expose

```json
{
  "locationId": "…",
  "placeName": "青禾咖啡",
  "assetId": "qinghe-cafe",
  "geometryVersion": "1.2.0"
}
```

`placeName` is presentation metadata; truth key remains `locationId`.
