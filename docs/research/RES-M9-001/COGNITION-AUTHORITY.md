# Cognition Authority

## Definition

Cognition Authority 描述“谁/什么产生了本次候选意图或解释”，不是 Resident 身份，也不是 World Fact authority。

```text
CognitionSource = HUMAN_INPUT | DETERMINISTIC_RULE | PROXY_RUNTIME | OPTIONAL_LLM | SYSTEM_FALLBACK
```

它可以与 Control Authority 组合但不可合并：

- Human resident：human input 可以直接形成 ActionRequest，也可以请求 deterministic assist。
- Human Digital Twin：M5 runtime 只能在 active charter / allowed cognition scope 内代表真人工作。
- Native resident：规则 baseline 与未来 M5 runtime 都是 cognition source，不需要伪造 human owner。
- Proxy：是 control/delegation context；其 LLM/provider 只是 cognition provider。

## M5 inheritance

RES-M5-002 的硬边界是 `Resident ≠ Agent Runtime Process ≠ LLM Session`，且 LLM 只能输出 bounded context 下的 structured intent，不能写 world facts、Needs、Goals、Memory、Relationship、cash 或 inventory。M9 必须继承这一点：Agent Runtime 不能创建/修改 Charter 或扩大权限。

## Fact authority

```text
Cognition → ActionIntent → authority validation → ActionRequest → Kernel validation/commit
```

没有 cognition、没有 provider 或 session 过期时，Resident 仍存在；世界按 M3/M8 的 deterministic/fallback policy 继续或明确停在允许边界。
