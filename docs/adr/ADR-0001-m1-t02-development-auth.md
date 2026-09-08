# ADR-0001：M1-T02 开发身份边界

- 状态：Accepted
- 日期：2026-09-08
- 范围：M1-T02

## 背景

M1 需要一个可验证的开发身份入口，但真实身份、真人扫描、数字人和代理能力属于后续任务。开发入口不能被误部署为生产免登录。

## 决策

1. 通过 `AuthAdapter` 预留真实认证适配边界。
2. 当前唯一实现只在 `NODE_ENV=development` 且 `MIRROR_DEV_AUTH=true` 时返回 M0 seed 用户 `dev@mirror.local`。
3. 会话只使用 HttpOnly、SameSite=Strict 的开发 cookie；cookie 值仅为 seed 用户 ID，适配器会再次校验环境与 ID。
4. Next.js production build 在 `MIRROR_DEV_AUTH=true` 时 fail-closed；生产环境不提供开发登录入口。
5. 本任务不新增数据库 schema，不写入世界事实，PostgreSQL/Redis/World Kernel 均不改变。

## 后果

- M1-T02 可以通过浏览器验证登录、刷新保持和退出。
- 该 cookie 不是生产认证方案，真实认证接入时必须替换适配器和会话机制，并重新完成安全审查。
- 未配置真实认证时，生产界面明确显示身份认证不可用，不伪造用户或世界状态。
