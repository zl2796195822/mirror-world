# WEB-OBSERVER-V0

## 优先级

Web Observer 是 Client V0 第一优先级。  
目标：打开浏览器以后，第一次真正看见镜界“活着”。

## 技术栈

复用当前 monorepo `apps/web`（Next.js App Router + React）。  
不另起前端服务，除非后续审计证明现有壳无法承载。

## 首页信息架构

```text
镜界 / FIRST STREET
World Day N  HH:MM
[LIVE]

WORLD STATUS
Residents 30
MOVE / SLEEP / EAT / WORK / TALK / IDLE

FIRST STREET LIVE
住宅区 | 公司 | 咖啡馆 | 便利店 | 公园
（按 placeId 聚合居民数与活动）

LIVE WORLD EVENTS
08:40 R017 MOVE_STARTED
08:41 R004 EAT_COMPLETED
...
```

必须回答：

1. 现在是什么 World Time？
2. 有多少居民？
3. 他们在哪里？
4. 他们正在做什么？
5. 刚刚发生了什么？

## 屏幕清单

### 1. World Overview

- World Time / Day / status
- activity distribution
- connection freshness
- live vs replay badge

### 2. First Street Map（2D schematic）

- 每个正式 place 有稳定 placeId
- 显示居民数、活动分布、简单连接关系
- 点击打开 place detail
- 不是空间 Truth，只是 read-model visualization

### 3. Resident Detail

- Resident ID / display label
- current place / activity
- activity start / due
- target place / participant
- employment / workplace（若正式可读）
- recent events
- optional needs（若正式 read-side 允许）

### 4. Resident Causal Chain

对一次 Action 显示：

- World Time
- Observation
- Need
- Goal
- Candidates
- Selected Action
- ActionRequest
- Kernel Outcome
- Events
- Next Observation

这是 structured evidence，不是模型思维链。

### 5. Timeline

过滤：

- resident
- place
- action type
- world time
- event type

支持 MOVE / SLEEP / EAT / WORK / TALK / WORLD_TIME。只读。

### 6. Replay Viewer

- 选择历史 world time
- 拖动时间轴
- 观察 location / activity projection
- UI 强制 `REPLAY` 标识

## LIVE / REPLAY 分离

- LIVE：当前 projection + events
- REPLAY：历史只读快照
- 不得让用户误以为 Replay 正在改变现在世界

## 管理能力边界

V0 Observer 默认只读。不做：

- God Mode
- 传送居民
- 改资源 / Need / World Time

调试工具未来必须走独立 admin/dev contract。

## 错误与空状态

| 场景              | UI                  |
| ----------------- | ------------------- |
| API 不可达        | DISCONNECTED        |
| 数据过期          | STALE               |
| 重连中            | RECONNECTING        |
| place 无视觉/标签 | UNKNOWN_PLACE       |
| activity 未识别   | UNKNOWN_ACTIVITY    |
| evidence 缺失     | UNAVAILABLE，不编造 |

## 认证

若当前仅有 development auth：

- 明确标注 `TEMPORARY DEVELOPMENT ACCESS`
- User ≠ Resident
- 不提前实现 M9 Identity

## 测试要点

- snapshot rendering
- resident detail
- timeline filter
- replay mode
- LIVE/REPLAY separation
- error / stale / empty
- 30 residents
- event filtering
