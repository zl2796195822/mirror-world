# RESIDENT-VISUAL-STATE

## 数据来源

居民视觉状态只来自 server projection：

- placeId
- activity
- activityInstanceId
- startedAt / dueAt
- targetPlaceId
- participantId
- worldSeq

客户端不得自行推演 Need、补全行为或“让居民看起来更活”而改变逻辑状态。

## Activity Visual Mapping

| Server activity  | Visual state              |
| ---------------- | ------------------------- |
| IDLE             | idle loop                 |
| TRAVELING        | walking / travel          |
| SLEEPING         | sleep pose                |
| EATING           | eat animation             |
| WORKING          | work animation            |
| TALKING          | paired social anim + icon |
| UNKNOWN_ACTIVITY | debug pose + warning      |

## MOVE 表现

输入：

- start world time
- current placeId
- target placeId
- completion world time（若 projection 提供）

客户端：

1. 从 current place anchor 出发
2. 沿 client visual path 插值
3. 在 completion 到达 target place anchor
4. snap 到 target logical place

若丢帧或掉线：

- 不改变世界历史
- 重连后以 server projection 重新对齐

## TALK 表现

- 两名 resident 在同一 place
- 根据 shared activity 播放社交动画
- 可显示 `TALKING` icon
- 不生成对话文字（M5 未正式提供 Dialogue）

## WORK / EAT / SLEEP

- WORK：在 workplace 工作区域站立/坐桌/简单循环；不模拟工资
- EAT：只表现动作；resource CAS / hunger relief 已由服务器处理
- SLEEP：在 home 表现 sleep；客户端不决定何时醒

## Avatar

V0：

- 占位人物
- 少量基础模型
- 稳定 residentId 映射

不做：

- full avatar customization
- facial animation
- MetaHuman identity
- voice
- digital clone

## 名称

若正式 M3 没有 display names：

- UI 显示 `Resident 001` 或 short id
- 不给后端凭空创建正式 Identity
