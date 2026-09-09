# Asset and Identity Boundary

## Rule

Resident Identity 与 Economic Account/Asset Ownership 分离。一个 resident 可关联多个账户；机构也可拥有账户；不能使用 `residentId = accountId`。

Auth account、avatar、LLM provider 或 control mode 的变化不应自动改写资产所有权。Identity transfer、inheritance、retirement 和 legal delegation 属 future institution/M6 policy，不在 M9 v1 做制度结论。

## M6 inheritance

RES-M6-002 的 resource bridge 只读 `cashCents/foodUnits/version`，M3 `version=0` 是 fixture snapshot，不是正式经济 authority。未来 M6 由 accounts/inventory/journal provider 提供 durable aggregate revision；Proxy spending permission 必须独立于 resident balance。

```text
Resident rights: 允许 A 拥有什么/做什么
Account authority: 账户与余额的事实
Proxy budget: 代理可代 A 使用的有限额度
```

Proxy 不能因为 A 有 100000 cash 就自动获得 100000 spending authority。
