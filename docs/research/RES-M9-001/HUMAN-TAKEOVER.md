# Human Takeover

## Recommendation

M9 v1 采用“真人显式 direct control 优先”：真人明确进入某个 resident 的 direct control session 后，停止该 resident 的新 proxy cognition，并让后续提交以 direct context 重新验证。

这不是登录即接管，也不回滚 takeover 前已经 commit 的世界事实。

## State transition

```text
PROXY_ACTIVE
  -- explicit human takeover --> DIRECT_PRIORITY
  -- explicit resume + charter --> PROXY_ACTIVE
```

`ControlSession` 是短期控制状态，不是 Resident lifetime；session 过期不删除 resident，也不自动把 proxy 打开。

## Concurrent action

- 已 commit 的 action 保留原有 resident world attribution 和 control audit。
- 尚未 commit 的 proxy action 重新检查 direct-priority/control version；默认停止旧 operation。
- 同一 resident 的 action 仍由 Kernel actor/runtime version 与短事务串行化。
- 多 controller 可以有授权记录，但不能并行无序地写同一 resident；冲突必须可见、可重观察。

## Offline

真人 offline 不等于 proxy enabled。是否可运行只由 charter 的有效期、offline allowance、风险和预算决定；没有有效 charter 时可以继续 deterministic routine 或进入 limited inactive mode，不能猜测代理权限。
