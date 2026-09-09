# ZERO-LLM-BASELINE

## 1. 要求

M4 v1 必须在 **0 LLM** 下可确定性运行：

```text
same world facts
+ same resident state
+ same observation/eligibility policy
+ same attention/encoding policy
+ same relationship projection policy
→ same structured results
```

## 2. LLM 未来插入点

```text
Observation
→ deterministic structured core
→ optional interpretation/enrichment
→ validated candidate
→ bounded write through M4 validation
```

LLM 可生成：

- narrative candidate
- belief interpretation
- conversation wording

LLM **不能**：

- 绕过 schema
- 直接写 World Fact
- 直接改 trust
- 成为唯一 memory/relationship engine

## 3. 失败降级

LLM 不可用时：

- 世界继续运行
- 记忆/关系继续按 deterministic baseline 更新
- 仅 enrichment 降级

## 4. 测试含义

未来 M4 Gate 必须有 zero-LLM deterministic baseline tests。
