# Identity Fork and Clone

## Decision

Representation clone、memory copy、persona copy 和 Resident Identity clone 必须分开。只要产生两个可独立行动、拥有不同未来历史的实体，就必须创建新的 `ResidentId`；不能因内容相同而共享 identity ID。

## Fork record

未来可保留 shared provenance：

```text
newResidentId
forkedFromResidentId
copiedLayerSet
sourceRevision / policyVersion
forkedAtWorldTime
```

它表示来源关系，不表示两个 resident 是同一个人，也不授予新 resident 自动继承旧 control/asset rights。

## Copy boundaries

- 复制 Avatar 文件：新 representation，不改身份。
- 复制 persona：新 profile candidate，不改身份。
- 复制 memory：必须经过 privacy/lineage policy，不生成相同 resident。
- 复制资产/授权：需要 M6/institution policy；不能从内容 copy 推导 ownership。
- 复制 active charter：默认不复制，必须重新授予并产生新 delegation/version。

Identity fork 是长期制度问题，M9 v1 只冻结“不混淆”的技术边界。
