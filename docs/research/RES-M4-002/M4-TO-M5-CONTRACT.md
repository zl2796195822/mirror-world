# M4-TO-M5-CONTRACT

## 1. 分工

- **M4**：Memory / Relationship cognition store & policies
- **M5**：Agent Runtime / LLM Intent / Dialogue

## 2. M5 允许

- 读取 **bounded** memory context（resident-scoped，预算限制）
- 提交 memory candidates（经 M4 validation）
- 产生 TALK / utterance facts（经 World Kernel，不得绕过）
- 使用 relationship summary 作为对话/意图输入

## 3. M5 禁止

- 直接 SQL 修改 memory tables
- 直接改 trust/affinity
- 直接写 World Fact
- 把 LLM prose 写成唯一 memory truth
- 读取其他居民 private memories

## 4. TALK 边界

```text
TALK action semantics (world interaction)
≠ M5 LLM Conversation Runtime
```

未来可能：

```text
TALK world interaction
→ conversation session
→ utterance facts / observations
→ M4 memories / relationship projections
```

M4 v1 不依赖完整 LLM conversation 才能成立；可用 structured social interactions 先验证。
