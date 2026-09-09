# 15 · Identity / Native / Human / Proxy Boundary

> 本文件只研究 M10 所需交叉边界。  
> 身份/代理详细合同标 `PENDING_RES_M9_001`，不得在此创建正式身份规则。

## 身份类型（研究输入）

| Kind | 含义（研究） | M10 关注点 |
| ---- | ------------ | ---------- |
| NATIVE | 数字原生居民 | 默认全 LOD 可用（受预算） |
| HUMAN | 真人直接/接管 | 人类输入 vs 系统 cognition |
| PROXY | 代理控制上下文 | Charter 限制下的 cognition |

## 谁消耗 cognition budget？

| 来源 | 消耗 M10 cognition budget？ |
| ---- | --------------------------- |
| NATIVE I0 规则 | 否（CPU/DB，不占模型预算） |
| NATIVE I1 heuristic | 否或近似否 |
| NATIVE I1 local model | 是（本地资源/配额） |
| NATIVE I2/I3 | 是 |
| HUMAN 直接 ActionRequest | 否（人类输入） |
| HUMAN 使用系统 deterministic assist | 否或极低 |
| HUMAN 触发的 LLM assist/推荐 | 是（交互配额） |
| PROXY runtime LLM cognition | 是（proxy 配额 + charter） |
| SYSTEM FALLBACK（I0） | 否 |

## HUMAN

- 人类不需要「系统 cognition」才能存在。
- 若产品提供 AI 辅助对话/推荐，那是 optional service，必须可关。
- 人类操作产生的 ActionRequest 仍过 Kernel。
- 人类在线可能触发 attention bonus（见 `14`），但不等于无限 I3。

## PROXY

M10 必须尊重未来 Proxy Charter：

- Proxy 可用 I 层 ⊆ charter 允许范围
- 不得用高 I 层扩大权限
- 预算独立记账，防止代理刷爆世界配额
- 代理失败时居民仍可 I0 存续

详细：`PENDING_RES_M9_001`。

## NATIVE

- 可使用全部 I 层（受预算与公平）
- 不伪造 human owner
- I0 是默认生存层

## 组合合法性

| 组合 | 合法 | 说明 |
| ---- | ---- | ---- |
| NATIVE + I0 + W1 | 是 | 背景生活 |
| NATIVE + I3 + W0 | 是 | 配额内 |
| HUMAN input + I0 assist | 是 | 人类主导 |
| PROXY + I3 超 charter | 否 | M9 将拒绝控制面；M10 也不应授予 |
| 任何身份 + 绕过 Kernel | 否 | 唯一红线 |

## Cognition Authority 对齐

RES-M9 `COGNITION-AUTHORITY.md`：

```text
CognitionSource = HUMAN_INPUT | DETERMINISTIC_RULE | PROXY_RUNTIME | OPTIONAL_LLM | SYSTEM_FALLBACK
```

M10 I 层描述的是 **OPTIONAL_LLM / 高级结构化决策** 的深度；  
`DETERMINISTIC_RULE` ≈ I0/I1 heuristic；  
`SYSTEM_FALLBACK` ≈ 降级路径。

二者正交：source 说「谁产生候选」，I 层说「多深」。

## 不变量

1. 身份高于模型、Prompt、Avatar、Provider。
2. LOD 不改变身份。
3. 无 Provider 时身份仍存在。
4. Replay 不依赖身份代理会话重放模型。
