# Proxy Permission Model

## Minimal evaluator input

```text
world/resident/actor
+ current resident rights
+ charter status + version + effective window
+ action type + validated parameters
+ resource/counterparty/location bounds
+ risk/confirmation policy
→ ALLOW | DENY | REQUIRE_HUMAN_CONFIRMATION | STALE
```

## Granularity

M9 v1 只需覆盖当前 Action Contract 能表达的 bounded actions：`MOVE`, `EAT`, `SLEEP`, `WORK`, `TALK`, `BUY`。每一类可以附加：

| 维度                  | 研究语义                                            |
| --------------------- | --------------------------------------------------- |
| action category       | explicit allowlist，不能用任意 tool name            |
| resource budget       | cash/food/time/quantity 上限；余额不是 proxy budget |
| maximum value         | 单次和周期金额上限，整数分                          |
| counterparty          | allowlist/denylist；不能把任意 resident 当对手方    |
| location              | 允许的 world/location 范围                          |
| time window           | world-time effective window                         |
| frequency             | per action/day/world period limit                   |
| risk                  | low/elevated/high/irreversible policy               |
| human confirmation    | action-specific requirement                         |
| expiration/revocation | mandatory validity fence                            |

未来 public statement、contract、asset transfer、identity link 等能力要作为更高风险扩展，不因本研究提前改变 M3 contract。

## Validation placement

```text
M5/interaction preflight (early)
  → Authorization/Permission Port (current charter decision)
  → ActionRequest with delegation ref/version
  → Kernel recheck under short transaction
  → domain/resource validation
  → commit
```

M5 preflight 不能是唯一安全层。Kernel 不读取 prompt/LLM，但必须能验证 delegation validity/version、resident rights 与 world/domain constraints。未来优先使用同一 durable authority 的 read/lock boundary；不要在 Kernel transaction 中等待 provider 或 human。

## Fail closed

缺少 charter、过期、版本不匹配、跨 world/resident、超预算、超频率、需要确认但未确认，均拒绝或返回 pending authorization；不得静默改写成另一 action。
