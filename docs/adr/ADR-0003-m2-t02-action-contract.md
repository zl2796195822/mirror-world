# ADR-0003 M2-T02 Action Contract

- 状态：Accepted
- 日期：2026-09-08
- 范围：M2-T02

## 背景

M2-T02 只要求定义 MOVE、EAT、SLEEP、WORK、TALK、BUY 的基础 Action Contract，并让非法参数在 schema 层被拒绝。World Kernel 规格已经规定了 ActionRequest 的请求元数据字段，但没有为六类动作给出可执行的参数字段表。

## 决策

1. 在 `@mirror/contracts` 中建立 Zod 运行时 schema 与 TypeScript 类型，使用 ActionRequest 的结构化元数据：`id`、`worldId`、`actorId`、`actionType`、可选 `targetId`、`parameters`、`requestedBy`、`idempotencyKey`、可选 `expectedActorVersion`、`requestedAtWorldTime`、`traceId`。
2. 六类基础参数采用最小结构约束：MOVE 需要 `destinationId`；EAT/BUY 需要 `itemId` 与正整数 `quantity`；SLEEP 只接受空对象；WORK 需要 `workplaceId`；TALK 需要 `participantId`，并允许非空 `message`。
3. 顶层请求与每类参数均拒绝未知字段；schema 只做类型、格式、结构和基本数值边界检查，不判断目标是否存在、地点是否可达、资源是否充足、权限是否有效或动作是否能提交。
4. 使用固定版本 Zod 作为直接 production dependency；不复用 Fastify 的传递依赖作为 contracts 包的隐式 API。

## 不在本 ADR 范围内

本任务不实现 Kernel 校验器、ActionResult、幂等执行、数据库 `action_requests`、事件、事务提交、API 路由、Simulator、Replay 或任何 M2-T03 及后续能力。

## 后果

调用方可以在进入 Kernel 前获得稳定的结构化解析结果；未来 Kernel 可以复用同一 schema，并在此基础上增加身份、权限、时间、位置、资源和并发规则。六类参数字段是当前最小契约，若后续需要兼容性变化，应新增版本或采用向后兼容字段，不应静默改变既有语义。

## 验证计划

- 六类合法请求均能解析。
- 缺失字段、错误类型、非法 UUID、非法枚举、非正整数、非法时间和未知字段均被拒绝。
- 解析是纯函数，不访问数据库、不推进 World Clock、不生成事件。
