# THIRD PARTY REGISTER

只登记实际引入的运行时/构建依赖；没有复制外部源码。所有版本以 `pnpm-lock.yaml` 为最终解析依据。

| ID        | Project / package | Version | Reuse mode | License status   | Purpose                       | Related milestone |
| --------- | ----------------- | ------- | ---------- | ---------------- | ----------------------------- | ----------------- |
| TP-M0-001 | Turborepo         | 2.5.6   | DEPENDENCY | PASS: MIT        | monorepo task runner          | M0                |
| TP-M0-002 | Drizzle ORM       | 0.45.2  | DEPENDENCY | PASS: Apache-2.0 | PostgreSQL schema/query       | M0                |
| TP-M0-003 | Drizzle Kit       | 0.31.4  | DEPENDENCY | PASS: MIT        | migration generation          | M0                |
| TP-M0-004 | postgres.js       | 3.4.7   | DEPENDENCY | PASS: Unlicense  | PostgreSQL driver             | M0                |
| TP-M0-005 | Vitest            | 3.2.4   | DEPENDENCY | PASS: MIT        | unit test runner              | M0                |
| TP-M0-006 | Prettier          | 3.6.2   | DEPENDENCY | PASS: MIT        | code formatting               | M0                |
| TP-M0-007 | @eslint/js        | 9.35.0  | DEPENDENCY | PASS: MIT        | ESLint JavaScript rules       | M0                |
| TP-M0-008 | @types/node       | 24.3.0  | DEPENDENCY | PASS: MIT        | Node.js type definitions      | M0                |
| TP-M0-009 | ESLint            | 9.35.0  | DEPENDENCY | PASS: MIT        | code linting                  | M0                |
| TP-M0-010 | tsx               | 4.20.3  | DEPENDENCY | PASS: MIT        | TypeScript script runner      | M0                |
| TP-M0-011 | TypeScript        | 5.9.2   | DEPENDENCY | PASS: Apache-2.0 | type checking/build           | M0                |
| TP-M0-012 | typescript-eslint | 8.42.0  | DEPENDENCY | PASS: MIT        | TypeScript ESLint integration | M0                |
| TP-M1-001 | Next.js           | 16.3.4  | DEPENDENCY | PASS: MIT        | App Router 产品壳与生产构建   | M1-T01            |
| TP-M1-002 | React             | 19.2.8  | DEPENDENCY | PASS: MIT        | 产品壳组件运行时              | M1-T01            |
| TP-M1-003 | React DOM         | 19.2.8  | DEPENDENCY | PASS: MIT        | 浏览器渲染                    | M1-T01            |
| TP-M1-004 | @types/react      | 19.2.2  | DEPENDENCY | PASS: MIT        | React 类型定义                | M1-T01            |
| TP-M1-005 | @types/react-dom  | 19.2.2  | DEPENDENCY | PASS: MIT        | React DOM 类型定义            | M1-T01            |
| TP-M1-006 | Fastify           | 5.12.3  | DEPENDENCY | PASS: MIT        | API skeleton HTTP server      | M1-T04            |
| TP-M1-007 | @fastify/swagger  | 9.8.1   | DEPENDENCY | PASS: MIT        | Fastify OpenAPI generation    | M1-T04            |

核验依据：安装后的包元数据与 `pnpm licenses list --json`。本轮没有复制外部源码、资产或模型进入主仓；所有条目均为依赖模式。

`pnpm audit --prod`：UNVERIFIED。当前 npm 镜像 `https://registry.npmmirror.com` 未提供 audit endpoint，命令返回 `ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`；这不等同于“无漏洞”。

官方 npm registry 审计修复记录：此前 `drizzle-orm@0.44.5` 的 `GHSA-gpj5-g38j-94v9` HIGH 已通过最小升级修复至 `0.45.2`，lockfile 已同步更新。升级后再次执行 `pnpm audit --prod --registry=https://registry.npmjs.org`，结果为 PASS：`No known vulnerabilities found`，HIGH=0、CRITICAL=0。

M0 完成前必须保持许可证状态明确；任何未知许可证不得进入主仓。
