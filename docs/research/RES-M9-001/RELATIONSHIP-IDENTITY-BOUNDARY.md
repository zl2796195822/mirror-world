# Relationship and Identity Boundary

Relationship 是居民之间的有向社会状态，不是身份本体。`A → B` 与 `B → A` 不能用一条共享双向字段替代；它应绑定 resident identities，而非 avatar asset、LLM session 或当前 controller。

Proxy 代表 A 冒犯 B，若 action 有效并 commit，B 对 A 的 relationship 可以在未来 M4 policy 下改变；“是 Proxy 做的”不是世界事实的撤销理由。关系投影还应保留 observer、source event、policy version 和 applied cursor，以便区分 historical replay 与 re-derived projection。

更换 avatar/voice/provider、控制模式切换或 auth account recovery 不自动丢失关系。M4 仍拥有 relationship projection；M9 不写 trust/affinity，不创建 `RELATIONSHIP_CHANGED` 事实。
