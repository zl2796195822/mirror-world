# Identity Continuity

## Invariants

同一 `ResidentId` 表示同一 world resident 的连续存在，除非正式 identity lifecycle/fork policy 明确创建新身份。以下变化不应自动改变 ResidentId：

- auth session 过期、auth account recovery 或 provider change；
- Avatar/VRM/body/renderer 更换；
- voice provider 或 voice representation 更换；
- LLM/provider/model/prompt/version 更换；
- memory 增长、忘却或 consolidation；
- relationship projection 变化；
- 住所、工作、activity 或 runtime state 变化；
- control mode 从 direct 到 proxy 或反向切换；
- 经济账户变更或 account ownership policy 的正常更新。

## Identity core

最小 identity core 只需保持：world-scoped ResidentId、origin、creation/lineage reference、生命周期状态和对外 link references。它不需要把全部 persona/memory/asset 复制进去。

## Continuity vs cognition

```text
Identity continuity = “是不是同一个世界存在？”
Cognitive continuity = “记得什么、如何解释、如何思考？”
```

失忆可以降低 cognitive continuity，但不生成新 Resident。反之，复制全部 memory/persona 也不会自动复制 identity continuity。
