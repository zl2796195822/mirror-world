# FIRST-STREET-3D-V0

## 定位

Mirror World Visualization Client，不是完整游戏、开放世界、GTA、MMORPG 或电影级 Demo。

第一目标：正确表现真实世界状态。

## 引擎选择

推荐 `Unreal Engine 5`（使用本机已安装的稳定版本；若仓库后续出现版本约束，再冻结版本）。

对照仓库 research：

- `mirror-world-first-street` 的 R3F 结论属于 M7 Web 3D research input
- 本 Client 轨道是原生 3D Client，不与 Web Observer 合并成同一 UI 壳

## 空间范围

只做一条街。

建议逻辑地点（正式 placeId 必须来自当前 world fixture，不得重发明）：

| fixture key      | kind    | 视觉           |
| ---------------- | ------- | -------------- |
| home-unit-01..12 | HOME    | 住宅模块       |
| office           | OFFICE  | 公司           |
| cafe             | CAFE    | 咖啡馆         |
| store            | STORE   | 便利店         |
| park             | PARK    | 公园           |
| transit          | TRANSIT | 道路/公交/过渡 |

场景元素：道路、人行道、住宅、公司、咖啡馆、便利店、公园、路灯、树木、长椅。

## Logical Place vs Visual Transform

| 层      | 内容                         | 可变性               |
| ------- | ---------------------------- | -------------------- |
| Logical | placeId                      | 稳定世界逻辑身份     |
| Visual  | UE transform / mesh / anchor | 可变、可重建、可替换 |

Server truth 是 placeId，不是 UE 坐标。

## Resident Visual Entity

`MirrorResidentActor` 至少持有：

- ResidentId
- CurrentPlaceId
- CurrentActivity
- TargetPlaceId
- ParticipantId
- LastProjectionSeq
- VisualState

禁止把 authoritative hunger / resource / employment truth 存成客户端权威字段。它们只能是 received projection。

## Entity Registry

- ResidentId → Visual Actor
- PlaceId → Scene Anchor
- Activity → Animation State

禁止通过 Actor Name 字符串到处硬编码查对象。

## 活动表现

| Activity  | 视觉                             |
| --------- | -------------------------------- |
| IDLE      | idle                             |
| TRAVELING | walking                          |
| SLEEPING  | sleep pose                       |
| EATING    | eat animation                    |
| WORKING   | work animation                   |
| TALKING   | talk/social icon，不生成对话文本 |

MOVE：

- MOVE_STARTED：从 current visual anchor 沿 visual path 向 target 移动
- MOVE_COMPLETED：snap/resolve 到 target logical Place anchor
- 视觉路径不是世界 Truth

Server wins；客户端可插值，但 FPS 掉帧不改变世界历史。

## 相机

- Observer Camera：自由飞行 / 上帝视角
- Follow Resident：点击居民后跟随

V0 不做正式玩家角色。

## 环境

- World Time → sun rotation / sky / lighting
- 天气：若无正式 Weather Truth，只允许 static visual ambience
- 暂停渲染不暂停 World Time

## 资产策略

- placeholder / modular / free-legal / simple primitives
- 目标是世界可读，不是 AAA
- 外部资产必须登记 source / license / commercial-use / attribution

## Debug Overlay

可开关显示：

- worldSeq
- residentId / placeId / activityInstance
- projection latency
- connection state
- last update

正式体验模式可隐藏。

## 性能预算

- 30 residents
- 低/中等模型复杂度
- 不做 1000 NPC / 超大城市 / 电影级光追
- 视觉 60 FPS 目标；网络更新按正式事件频率，与渲染帧率分离
