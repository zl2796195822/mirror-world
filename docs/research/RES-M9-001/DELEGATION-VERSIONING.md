# Delegation Versioning

## Decision

每个 `ProxyCharter` 使用单调递增的 `charterVersion`；`delegationRef` 稳定标识这条授权关系，版本标识其具体政策快照。不要用 prompt hash 作为 authority identity。

## Fencing rule

```text
observe charter v3
  → proxy thinks outside transaction
  → submit ActionRequest(delegationRef, charterVersion=3)
  → Kernel reads current charter
  → current v3 + active + in window: continue
  → current v4/revoked/expired: stale/deny, no event
```

任何权限修改（增删 action、预算、确认要求、expiry、delegate）都生成新版本或显式 revoke；旧版本不会因历史缓存而继续有效。版本号必须按 `worldId + residentId + delegationRef` 隔离，不能以 worldSeq、actorVersion 或 resourceVersion 代替。

## Action request fit

当前 `ActionRequest` 没有 delegation fields，只有粗粒度 `requestedBy=PROXY` 和 optional `expectedActorVersion`（`packages/contracts/src/action-contract.ts:12-22`）。因此本文件是 M9 future contract requirement，不修改当前 M3 contract。

## Race

授权判断和世界提交必须有清晰线性化点：revocation/version bump 与 action authorization 共享同一 durable authority lock/order。先完成 action commit 再 revoke，action 有效；先完成 revoke，再提交 action，旧版本拒绝。
