# 镜界

Persistent Digital Society 的工程仓库。M1 Milestone Gate 已通过；当前停止在 M1，不进入 M2。世界事实、居民、事件、3D、AI 与模拟能力按后续任务逐步接入。

## 当前范围

- pnpm + Turborepo 单仓库
- Node.js 24 LTS
- PostgreSQL、Redis、MinIO 本地依赖
- Drizzle migration 与 `users` / `worlds` 最小种子
- CI 基线：lint、typecheck、unit test、build
- `apps/web`：M1-T01 深色、低密度、非游戏 HUD 产品壳、M1-T02 开发身份与 M1-T03 World Overview
- `apps/api`：M1-T04 Fastify 只读健康、就绪、世界元信息接口与 OpenAPI

## 开发前提

复制 `.env.example` 为 `.env` 可覆盖本地连接配置。默认值只用于本地开发，不得用于生产。

## 常用命令

```bash
pnpm install
docker compose up -d
pnpm db:setup
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# 启动 M1-T03 World Overview 验证
MIRROR_DEV_AUTH=true pnpm --filter @mirror/web dev

# 启动 M1-T04 API skeleton 验证
DATABASE_URL=postgres://mirror:mirror_dev_only@localhost:5432/mirror \
  pnpm --filter @mirror/api start

# 生成 API OpenAPI 文档
pnpm --filter @mirror/api build
pnpm --filter @mirror/api generate:openapi
```

停止本地依赖：

```bash
docker compose down
```

M0 验证记录见 [`docs/verification/M0-report.md`](docs/verification/M0-report.md)，M1-T01 验证记录见 [`docs/verification/M1-T01-report.md`](docs/verification/M1-T01-report.md)，M1-T02 验证记录见 [`docs/verification/M1-T02-report.md`](docs/verification/M1-T02-report.md)，M1-T03 验证记录见 [`docs/verification/M1-T03-report.md`](docs/verification/M1-T03-report.md)，M1-T04 验证记录见 [`docs/verification/M1-T04-report.md`](docs/verification/M1-T04-report.md)，M1 总体验收见 [`docs/verification/M1-milestone-report.md`](docs/verification/M1-milestone-report.md)。M1 已通过 Gate，下一允许任务只记录为 M2-T01，不自动执行。
