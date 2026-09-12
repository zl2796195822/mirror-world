# CLIENT-REPO-STRATEGY

## 结论

| 组件                      | 仓库策略                                                               | 理由                             |
| ------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| Web Observer              | 当前 monorepo `apps/web`（或新增 `apps/observer` 子路由/包内模块）     | 与 API/contract 联调紧密         |
| Client Projection Adapter | 当前 monorepo `apps/api` + `packages/contracts`                        | 共享类型与验证                   |
| UE Client                 | 先独立 worktree / `prototypes/client-ue` 隔离试验；规模变大后独立 repo | 避免 binary 资产拖垮 TS monorepo |

## Web Observer

优先留在当前 Mirror World repo。  
除非现有架构明显不适合，否则不拆独立前端 repo。

## UE Client 三种放置方式

### A. monorepo `apps/client-ue`

- 优点：同 PR 联调
- 缺点：binary、CI、上下文膨胀、pnpm/UE 构建体系冲突

### B. 独立 repo `mirror-world-client`

- 优点：UE 工具链干净；版本化 contracts 对齐
- 缺点：跨仓同步成本

### C. 当前先 `prototypes/client-ue` 或独立 worktree

- 优点：最小启动成本
- 缺点：仍需迁出策略

**推荐：**

1. 设计与 C0 在文档/工作树中完成。
2. C2 开始用隔离 worktree / prototype 路径。
3. 当 Content 规模、CI、资产依赖变大时，迁到独立 repo，共享 versioned `client-projection-v0` contract。

## Shared Client Contract

轻量 `client-projection-v0` DTO：

- 只包含 client 需要的正式 read fields
- 不序列化整个 DB row
- 版本化，允许未来检测不兼容

## Git LFS 策略（UE）

若使用 UE：

- Content 源资产：Git LFS 或独立资产库
- Source / Config：普通 git
- 忽略：Intermediate / Saved / DerivedDataCache / Build 产物
- 禁止把几十 GB derived files 直接提交 Git

## 版本对齐

- API contract version
- Observer build
- UE client build
- visual manifest version

启动时 handshake，不兼容则 fail-closed。
