# Proxy Risk Classes

风险等级只用于授权与确认策略，不是法律责任结论，也不是当前代码中的 enum。

| 候选等级       | 典型范围                                   | 默认策略                                  |
| -------------- | ------------------------------------------ | ----------------------------------------- |
| `LOW`          | MOVE、EAT、SLEEP、已明确 routine WORK      | Charter allowlist + bounded rate/budget   |
| `ELEVATED`     | TALK、低金额 BUY、可逆日常安排             | 小额/对象/频率约束；可按 charter 要求确认 |
| `HIGH`         | 大额 BUY、公开代表发言、重要承诺、长期安排 | 默认 `REQUIRE_HUMAN_CONFIRMATION`         |
| `IRREVERSIBLE` | 资产转移、不可逆承诺、身份链接/删除等      | 默认 deny；未来制度与专门流程             |

BUY 风险不由动作名单独决定，应按金额、对手方、频率、资产类型和是否可逆计算。M9 v1 的正式 action surface 仍以当前六类 Action Contract 为边界；高风险扩展只记录设计方向。

## Confirmation rule

`REQUIRE_HUMAN_CONFIRMATION` 是授权状态，不是 World Event。确认后用当前 charter/version 重新校验并提交新 ActionRequest；不把旧 pending intent 直接升级为事实。
