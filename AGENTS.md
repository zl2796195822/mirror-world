# 镜界开发规则

## 当前范围

- M0、M1-T01、M1-T02、M1-T03 已通过；下一允许任务为 M1-T04。
- 本轮不得执行 M1-T04、M2 或任何后续任务。
- M1-T03 只实现 World Overview 的世界时间、运行状态、30 居民占位与最近事件占位；未接入的事实必须显示诚实空/不可用状态，不实现 API、World Kernel、世界、居民行为、3D、AI、数字人、模拟器或 Worker。
- 每个任务完成后必须运行真实验证；未通过不得宣布 M0 完成。

## 不可破坏边界

1. 镜界是 Persistent Digital Society，不是普通 AI 游戏或 AI Town Clone。
2. PostgreSQL 是 durable truth；Redis 只能做 cache、lease、queue。
3. World Kernel 是世界事实唯一写入口；后续所有业务写入必须通过 Kernel。
4. LLM 永远不能直接修改世界事实。
5. 核心模拟必须使用固定 seed 并支持 replay。
6. 产品参考图表达交互状态和视觉语言；不得把设计稿当作静态页面或提前实现 UI。

## 工程规则

- 一次只执行一个里程碑；架构或范围冲突写 ADR。
- schema 变化必须由 migration 产生；不得手工修改生产数据库结构。
- 随机行为必须使用可注入 seed；金额使用整数分。
- 不提交密钥、真实人脸/声音/扫描原始素材。
- 新增外部依赖前检查许可证、固定版本并登记到 `docs/third-party/THIRD_PARTY_REGISTER.md`。
- 完成一个里程碑后更新 `docs/PROJECT_STATE.md` 与 `docs/verification/<milestone>-report.md`。

## M0 验证门槛

```text
pnpm install
docker compose up -d
pnpm db:setup
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

真实结果必须记录在 M0 verification report 中。
