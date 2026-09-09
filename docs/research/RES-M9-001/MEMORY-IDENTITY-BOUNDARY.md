# Memory and Identity Boundary

## Rule

Memory 是 resident 的持续认知状态，不是 Resident ID。居民忘记、删除或重建一部分 memory，仍然是同一个 Resident；memory growth/consolidation 也不生成新 Resident。

## M4 inheritance

RES-M4-002 的核心边界继续适用：`World Event ≠ Observation ≠ Memory`，`World Fact ≠ Resident Belief`。Memory 应绑定 `worldId + residentId`，并保留 event/perception/policy lineage；不能用 LLM prose 覆盖 lineage，也不能反向覆写 Kernel Truth。

## Proxy interaction

Proxy 代表 A 与 B 发生有效、已 commit 的 TALK/interaction 时，世界层行为主体可以是 A，control origin 另存审计。M4 未来按 observation eligibility 和 lineage 决定是否进入 A 的 memory；不能自动把真人 private profile 或 proxy hidden prompt写成 world-visible memory。

## Access

M5 只读 bounded resident-owned memory context；不得读其他 resident private memory。M9 只定义 identity/control boundary，不实现 Memory runtime。
