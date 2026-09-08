# ADR-0002 M2-T01 世界时钟持久化边界

- 状态：Accepted
- 日期：2026-09-08
- 范围：M2-T01

## 背景

M2-T01 只要求世界时钟：区分 real time、world time 和 time scale，开发环境支持暂停与 1x/10x/100x，生产默认 1x，并满足重启后时间不倒退、暂停不产生 tick。当前仓库只有 `worlds.world_time`、`status`、`time_scale` 和 `updated_at`，没有时钟计算或持久化写边界。

## 决策

1. `worlds.world_time` 是当前世界时间事实；`clock_anchor_at` 是与该事实对应的最后一次 wall-clock 锚点。两者始终分开保存。
2. 只有 `@mirror/world-kernel` 的 World Clock 入口可以更新这两个字段、`status` 和 `time_scale`。API 只调用该入口，不直接更新世界表。
3. 时钟计算接收显式 `now`，不在核心逻辑调用 `Date.now()` 或 `Math.random()`。wall clock 回拨时保持已有 world time 和锚点单调不退。
4. `PAUSED` 和 `MAINTENANCE` 不推进 world time，但同步锚点到当前 wall time，避免恢复时补算暂停期间。
5. 开发环境允许 `RUNNING/PAUSED/MAINTENANCE` 与 `1/10/100` 倍率；生产环境强制有效倍率为 `1x`，开发控制接口关闭。
6. 本任务不创建 `world_events`、ActionRequest、Checkpoint 或 Replay 表。`WORLD_TIME_ADVANCED` 的 append-only 记录和 seq 归 M2-T04；本次接口保留未来接入边界。

## 备选

- 复用 `updated_at` 作为 wall-clock 锚点：拒绝，因为它是通用元数据，未来其他更新会改变时钟语义。
- 使用 Redis 保存当前时钟：拒绝，Redis 只能做 cache/lease/queue，不能成为 durable truth。
- 在 API handler 中直接更新 `worlds`：拒绝，会形成绕过 World Kernel 的事实写入口。

## 后果

- 世界时钟可在 PostgreSQL 重启/API 重启后从 durable 状态恢复，且 wall time 与 world time 语义清晰。
- M2-T01 增加一个最小 migration 和一个 Kernel package；未来 Simulator、ActionRequest、Event Ledger 可复用同一时钟写边界。
- 本任务尚未提供多实例 lease、Event Ledger、checkpoint 或 replay；这些保持在原始后续任务范围内。

## 可逆性

删除 M2-T01 migration、World Clock package、时钟路由和对应测试即可回滚；现有 `worlds` 核心字段保持兼容。

## Data API Event Migration

- Data：新增 `worlds.clock_anchor_at`，并约束 `status` 为 `RUNNING/PAUSED/MAINTENANCE`、`time_scale` 为 `1/10/100`。
- API：新增 `GET /api/v1/worlds/:worldId` 与开发态 `POST /api/v1/worlds/:worldId/admin/time`；同步 OpenAPI。
- Event：本任务不落 `WORLD_TIME_ADVANCED`，不创建 Event Ledger。
- Migration：新增单独的 M2-T01 migration，可从空库和现有 M1 数据顺序执行。

## Test Verification

覆盖纯计算的倍率、暂停、回拨单调性和生产守门；覆盖数据库 migration/seed、重启锚点恢复、API contract 与 M1 回归。

## Documents to Update

- `docs/PROJECT_STATE.md`
- `docs/verification/M2-T01-report.md`
- `MEMORY.md`
- `docs/third-party/THIRD_PARTY_REGISTER.md`（无新增依赖，仅核对）
