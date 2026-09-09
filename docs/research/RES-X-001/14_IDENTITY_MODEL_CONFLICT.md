# 14 Identity Classification Conflict

## Result

`CONFLICT / C3`，并伴随 `C5` 身份与隐私风险（`X-C007`、`X-C015`）。本包登记冲突，不修改旧蓝图、M10 冻结研究或 M9 冻结研究。

## Competing models

| 来源                  | 模型                         | 语义问题                                                                                   |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | ----------- | ----------------- | --------------------------------------------- | ------ | --------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| 旧蓝图/旧表述         | `HUMAN` / `PROXY` / `NATIVE` | 把居民来源、当前控制者和认知执行者压成一个类型；调用方容易从类型推导权限、预算和展示标签。 |
| RES-M10-001 shorthand | `NATIVE` / `HUMAN` / `PROXY` | 在 LOD、预算和 Provider 讨论中仍使用简写，未承担完整身份合同。                             |
| RES-M9-001 推荐       | `ResidentOrigin`=`NATIVE`    | `HUMAN_ORIGIN`；`ControlAuthority`=`Direct`                                                | `Delegated` | `Autonomous Rule` | `Shared Grants`；`CognitionAuthority`=`Human` | `Rule` | `Proxy Runtime` | `Optional LLM`；另有 `Embodiment`、`ActorRef` | 维度正交；Proxy 是控制/认知层，不是 Resident 类型；ResidentId 是连续性主键。 |

## Compatibility impact

- **旧模型问题**：不能表达真人来源但当前由规则运行、同一 Resident 被 Proxy delegated control、或同一 Resident 更换 Avatar/Voice/Provider 后仍保持连续性的情况。
- **新模型优势**：权限、来源、认知、身体和行动引用可分别审计；`ProxyPermission ⊆ ResidentRights`；撤销只影响尚未 commit 的行为。
- **Migration risk**：任何单列 `resident_type` 的历史数据需要保守映射；`PROXY` 不能无证据直接映射为 `ResidentOrigin`，最多作为待审计的控制/认知历史标签。
- **Event/history impact**：既有历史的 ActorRef、ActionRequest、Outcome 不得因模型迁移而重写；fork/clone 才产生新的 ResidentId。
- **API impact**：API 应分别传递 identity-safe projection、control/audit metadata 和 private identity data；禁止客户端提交“我有 Proxy 权限”作为事实。
- **UI impact**：M7 只消费经过隐私合同裁剪的 projection；是否显示“代理执行”是产品投影/审计策略，不等于新增 World Event。
- **Privacy impact**：`HUMAN_ORIGIN`、真人在线状态、delegationRef 与 Proxy 活动可能是私有或仅审计信息，不得默认公开给街道/居民投影。

## Recommendation

未来 Compatibility Review 应先确认 M9 正交字段作为唯一正式身份端口，再决定旧字段的只读兼容映射；必要时创建蓝图 minor version 与 `ADR-X-002`。在此之前不得实现迁移、API 字段合并或 UI 标签规则。
