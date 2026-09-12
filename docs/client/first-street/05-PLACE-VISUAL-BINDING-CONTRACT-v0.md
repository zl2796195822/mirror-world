# 05-PLACE-VISUAL-BINDING-CONTRACT-v0

## 原则

- Server Truth = `placeId` + `activity`
- Client Presentation = anchor / transform / mesh
- Visual binding **不进** PostgreSQL / World Kernel

## PlaceVisualBinding

```ts
type PlaceVisualBindingV0 = {
  placeId: string; // runtime, from server projection
  placeKey: string; // stable client key, e.g. cafe
  placeType: string;
  visualKey: string; // asset lookup, not world truth
  anchorId: string; // BP_FirstStreetCafe
  sceneZone: string;
  entryAnchor: string;
  exitAnchor?: string;
  residentAnchorSet: string[];
  visualBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  interactionZone?: string; // future only
};
```

## FirstStreetVisualManifest

文件：`first-street-place-mapping-v0.json`

- `manifestVersion = first-street-visual-v0`
- `compatibleProjectionVersion = client-projection-v0`
- 不写入 World DB

## 绑定规则

1. 启动时加载 manifest
2. 运行时用 snapshot 的 `placeId` 匹配
3. 若只有 `placeKey` 可匹配，使用 placeKey 兜底
4. 无匹配 → `UNKNOWN_PLACE_DEBUG_ANCHOR`
5. 禁止把 `UE_CAFE_01` 当第二套正式 Identity

## 坐标/Transform

Transform 可变、可重建、可替换。  
UE Actor Location 永远不是世界事实。
