# 镜界

Persistent Digital Society 的工程仓库。当前只完成 M0 工程地基，不包含 M1 及后续世界、居民、3D、AI 或数字人功能。

## 当前范围

- pnpm + Turborepo 单仓库
- Node.js 24 LTS
- PostgreSQL、Redis、MinIO 本地依赖
- Drizzle migration 与 `users` / `worlds` 最小种子
- CI 基线：lint、typecheck、unit test、build

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
```

停止本地依赖：

```bash
docker compose down
```

M0 验证记录见 [`docs/verification/M0-report.md`](docs/verification/M0-report.md)。后续里程碑必须在 M0 DoD 全部通过后单独执行。
