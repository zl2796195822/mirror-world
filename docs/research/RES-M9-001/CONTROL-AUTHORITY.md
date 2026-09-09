# Control Authority

## 推荐模型

Control Authority 是针对某个 `worldId + residentId` 的有效控制授予集合和当前 arbitration 结果，不是一个永久 boolean。

```text
ControlPrincipal = HUMAN_AUTH | PROXY_DELEGATE | WORLD_RULE | SYSTEM_OPERATOR
ControlGrant     = principal + resident + scope + validity + priority + version
EffectiveControl = one decision for one action at commit linearization
```

`SYSTEM_OPERATOR` 只属于 Operator/Admin plane；它不自动成为 world resident，也不获得 resident 的世界资产或关系权力。

## Recommended modes

- `DIRECT`：真人明确控制；不是“已登录就获得全部行为权力”。
- `DELEGATED`：代理基于有效 Proxy Charter 执行有限动作。
- `AUTONOMOUS_RULE`：规则系统代表 resident 处理允许的 deterministic routine。
- `SHARED`：多个 grant 可以存在，但对同一个 ActionRequest 只有一个有效授权结果，Kernel 以 resident/runtime lock 和版本 fencing 串行化。

模式是运行态结论；origin、rights、cognition provider 不从 mode 推断。

## Arbitration

1. 一次 action 只能有一个 effective control decision。
2. 明确的 human direct takeover 优先阻止新的 proxy cognition，但不回滚已 commit 的事实。
3. 同一 resident 的并发 action 由 Kernel 当前 actor/runtime version 和短事务冲突处理。
4. 多 controller 不能通过共享 cookie、guessable resident ID 或未授权 link 静默控制另一个 resident。

## Current gap

现有 action validator 的 `allowedRequesters` 是 actor snapshot 上的粗粒度请求源检查（`packages/world-kernel/src/action-validator.ts:24-34,102-112`），不能替代此模型。
