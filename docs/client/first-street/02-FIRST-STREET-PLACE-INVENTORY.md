# 02-FIRST-STREET-PLACE-INVENTORY

来源：正式 `getFirstStreetLocationFixtures(worldId)` + `client-projection-v0` snapshot。

参考世界：

- worldId: `ae8bd0ce-c3bb-40e7-a60c-17287878804f`
- seed: `mirror-client-c1-1-real-lifecycle-v1`
- formal place count: **17**

注意：`placeId` 为 world-scoped UUID。视觉映射稳定键是 `placeKey`；运行时绑定使用服务器返回的 `placeId`。

| #   | placeKey     | placeType | placeId                                | 进入 | 独立建筑 | interior zone | external anchor | 用途           |
| --- | ------------ | --------- | -------------------------------------- | ---- | -------- | ------------- | --------------- | -------------- |
| 1   | home-unit-01 | HOME      | `e29ee0e6-75a4-5bd3-ae05-9805dbed0fe2` | yes  | unit     | simplified    | yes             | 住宅           |
| 2   | home-unit-02 | HOME      | `cf309d46-d246-537f-9510-991c9b237bcb` | yes  | unit     | simplified    | yes             | 住宅           |
| 3   | home-unit-03 | HOME      | `e69330e9-fdd5-59f9-b272-041449ef88ae` | yes  | unit     | simplified    | yes             | 住宅           |
| 4   | home-unit-04 | HOME      | `a15608d8-42a4-5fc9-adcc-a7a2b306282a` | yes  | unit     | simplified    | yes             | 住宅           |
| 5   | home-unit-05 | HOME      | `125993fb-b7d7-5678-9834-f185429c2e5c` | yes  | unit     | simplified    | yes             | 住宅           |
| 6   | home-unit-06 | HOME      | `1711fb1b-6918-55f4-9767-416cdbe4f877` | yes  | unit     | simplified    | yes             | 住宅           |
| 7   | home-unit-07 | HOME      | `32644b6f-5764-5ac1-b8b3-6b85c4e5229d` | yes  | unit     | simplified    | yes             | 住宅           |
| 8   | home-unit-08 | HOME      | `cd074b98-56ba-51cb-aa72-43ad2ff9678c` | yes  | unit     | simplified    | yes             | 住宅           |
| 9   | home-unit-09 | HOME      | `94419879-8c23-520f-8d3b-e790c17532b1` | yes  | unit     | simplified    | yes             | 住宅           |
| 10  | home-unit-10 | HOME      | `9cedfe94-9698-5082-9907-1b7bc8dcf90b` | yes  | unit     | simplified    | yes             | 住宅           |
| 11  | home-unit-11 | HOME      | `0289a188-7b79-5771-b79e-c1e47901727f` | yes  | unit     | simplified    | yes             | 住宅           |
| 12  | home-unit-12 | HOME      | `adff01e5-a3fc-5e82-8db0-77f7e09584af` | yes  | unit     | simplified    | yes             | 住宅           |
| 13  | office       | OFFICE    | `6eed59ab-6db7-5aa6-9429-d7ee973e1ad3` | yes  | block    | simplified    | yes             | 工作           |
| 14  | cafe         | CAFE      | `3dddc3cc-6381-54ad-a979-d30b3d025f9b` | yes  | block    | simplified    | yes             | 餐饮/工作/社交 |
| 15  | store        | STORE     | `84013353-fb57-57a6-91f0-ce745fadbac3` | yes  | block    | simplified    | yes             | 零售/工作      |
| 16  | park         | PARK      | `b52136bc-9513-5a44-bcf4-6608ff3d61a3` | yes  | open     | outdoor       | yes             | 公共停留       |
| 17  | transit      | TRANSIT   | `1097d3cb-3bf4-539f-95aa-4ed51fab58ee` | yes  | stop     | outdoor       | yes             | 过渡节点       |

## 类型计数

- HOME: 12
- OFFICE: 1
- CAFE: 1
- STORE: 1
- PARK: 1
- TRANSIT: 1
- **Total: 17**

## 正式 topology

当前 server fixture **没有**正式 place adjacency / movement topology API。

因此：

- visual adjacency 仅作 `VISUAL_ONLY_ADJACENCY`
- `authoritative = false`
- `future M7 reconciliation required`

不可把视觉相邻当成世界可达性 Truth。
