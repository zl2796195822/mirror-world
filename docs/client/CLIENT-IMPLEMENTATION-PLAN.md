# CLIENT-IMPLEMENTATION-PLAN

## 当前状态

- 架构设计：已获用户「继续」批准
- C0/C1：已在隔离分支 `task/client-v0-observer` 开始实现
- production merge：仍禁止（`M3 != PASS`）
- 下一步：完成 C0/C1 验证，不进入 UE 大规模开发

## 批准后的推荐顺序

```text
Web Observer
  ↓
Projection/read contract
  ↓
First Street Static 3D
  ↓
Snapshot integration
  ↓
Resident visual states
  ↓
MOVE visualization
  ↓
Realtime/reconnect
  ↓
Cross-client verification
```

不要 Web 与 UE 同时大规模开工。

## 第一个实现任务（批准后）

`CLIENT-C0 / C1 IMPLEMENTATION PLAN` 会话：

1. 再读 `docs/PROJECT_STATE.md` 与 `task-registry.json`
2. 确认 M3 状态
3. 注册正式 Client 任务（若仓库治理要求）
4. 实现 `client-projection-v0` 只读 API 的最小集：
   - contract
   - snapshot
   - places
   - events
5. 让 `apps/web` Observer 首页显示真实 World Time / 30 residents / places / activities / events
6. 补 contract tests 与 stale/error UI

## 后端变更预期

### Required new backend APIs

- `GET /api/v1/client/v0/contract`
- `GET /api/v1/client/v0/worlds/:worldId/snapshot`
- `GET /api/v1/client/v0/worlds/:worldId/events`
- `GET /api/v1/client/v0/worlds/:worldId/residents/:residentId`
- optional: replay / evidence

### Required backend changes

- API 路由与 DTO mapper
- OpenAPI 更新
- 只读 query composition over existing stores

### Required schema changes

**preferably NONE for V0**

复用：

- worlds
- resident_runtime_states
- resident seed fixtures
- world_events
- existing projection replay

若证据链必须物化，再单独 ADR，不在 V0 默认路径。

## ADR

- V0 临时 projection adapter：建议单独 ADR，标注 temporary/non-M7。
- 是否 required：YES（当开始实现时）

## M3 / M4+ 依赖

| 项                   | 关系                                    |
| -------------------- | --------------------------------------- |
| M3                   | 实现合入主线前需 M3 PASS 或明确隔离授权 |
| M4 Memory            | 不依赖，不做 UI                         |
| M5 Agent/Dialogue    | 不依赖，不伪造对话                      |
| M6 Economy           | 不依赖，不做 settlement UI              |
| M7 formal projection | 未来替换点，不是 V0 前提                |
| M8 offline           | 不做                                    |
| M9 identity          | 不做；User ≠ Resident                   |

## 工作量粗估（设计阶段）

| 工作包                  | 复杂度 | 说明               |
| ----------------------- | ------ | ------------------ |
| C0 contract + adapter   | 中     | 只读组合现有能力   |
| C1 Observer             | 中高   | 页面多但数据面可控 |
| C2 static 3D            | 中     | placeholder 场景   |
| C3 snapshot in UE       | 中     | 网络层 + registry  |
| C4–C5 visual state/MOVE | 中高   | 插值与 correction  |
| C6 realtime             | 中高   | 可后置             |
| C7 cross-client         | 中     | 测试重点           |
| C8 alpha                | 中     | 集成验收           |

## STOP

本文件结束设计阶段。  
在用户明确批准前，不创建 UE project、不 scaffold 正式前端、不新增 production API、不改 DB/Kernel。
