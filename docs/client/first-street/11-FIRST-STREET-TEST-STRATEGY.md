# 11-FIRST-STREET-TEST-STRATEGY

## Mapping Validator（本任务实现 client tooling）

检查：

1. formal place count = 17
2. mapped place count = 17
3. no duplicate placeId
4. no missing placeKey/placeId
5. every place has anchorId / sceneZone / entryAnchor
6. fallback anchor present
7. manifest version compatible with `client-projection-v0`

## 未来 C3 Greybox tests

- 17/17 visual spawn
- unknown place fallback
- resident visual registry uniqueness
- stable anchor selection
- camera bounds
- no server mutation

## 未来 Projection integration tests

- snapshot → place registry bind
- snapshot → resident registry bind
- MOVE visual start/end against world time
- reconnect snapshot correction

## 边界

Visual-only fields must never enter server DTOs.
