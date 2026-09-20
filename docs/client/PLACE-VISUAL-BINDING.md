# PLACE-VISUAL-BINDING

## 原则

- 世界逻辑身份 = placeId
- 客户端视觉身份 = scene anchor / transform
- 二者通过 `ClientVisualManifest` 绑定
- manifest 属于 presentation config，不是 world database truth

## 当前正式地点来源

`getFirstStreetLocationFixtures(worldId)`：

| key                          | kind    | 说明              |
| ---------------------------- | ------- | ----------------- |
| home-unit-01 .. home-unit-12 | HOME    | 稳定 home fixture |
| office                       | OFFICE  | 工作地点          |
| cafe                         | CAFE    | 咖啡馆            |
| store                        | STORE   | 便利店            |
| park                         | PARK    | 公园              |
| transit                      | TRANSIT | 过渡/交通         |

placeId 是 world-scoped UUID。不同 world 的同一 key 可能得到不同 UUID；客户端以 projection 返回的 placeId 为准，不硬编码 UUID。

## ClientVisualManifest（客户端侧）

```ts
type ClientVisualManifestV0 = {
  schemaVersion: "client-visual-manifest-v0";
  places: Array<{
    placeKey: string;
    placeKind: string;
    displayName: string;
    anchorId: string; // e.g. BP_FirstStreetCafe
    notes?: string;
  }>;
  residents: {
    defaultPlaceholderProfile: string;
  };
};
```

示例：

```text
placeKey=cafe
placeId=<server uuid>
anchorId=BP_FirstStreetCafe
```

## 未映射行为

- place 无视觉映射：显示 `UNKNOWN_PLACE`
- resident 放到 fallback debug anchor
- 记录 warning
- 不崩溃、不伪造地点

## 视觉网络不是 Truth

道路连通、人行道、建筑内部布局均可调整，只要 placeId 绑定正确。  
Observer 的 2D map 与 UE 的 3D layout 可以视觉不同，但逻辑 placeId 必须一致。
