# 16 · Failure & Degradation Matrix

对齐 `m3-replan-v1` 与 RES-M8 isolation；M10 增加 cognition 特有失败。

| 失败类 | Effect | Fallback | World truth impact | Retry policy | Operator visibility |
| ------ | ------ | -------- | ------------------ | ------------ | ------------------- |
| provider timeout | I2/I3 未完成 | 降级 I1/I0 或 defer | 无新事实则无事件 | 有界次数后降级 | timeout rate |
| provider 5xx/network | 同上 | 切换/降级 | 同上 | 有界 | provider health |
| malformed output | Intent 无法 parse | 有界修复→I0 | 不提交非法 intent | 修复 ≤1–2 | parse fail rate |
| schema validation fail | 同上 | I0 | 不提交 | 不自动改写世界 | reject reason |
| budget exhausted | 不能进入高 I 层 | 强制低层 | 事实仍按规则推进 | 不重试超预算 | utilization |
| resident repeatedly promoted | 风暴/中毒 | 临时降配额 | 不影响事实合法性 | 冷却 | top consumers |
| world overloaded / lag | W1/W2，延迟 | 降 I、event-jump | 不伪造 | 自动 | lag, queue depth |
| queue backlog | wake 延迟 | 保持 due order | 不跳过事实 | 重建 queue | backlog age |
| replay missing cognition evidence | decision digest 不可复现 | 标 unavailable | **事实 replay 仍可** | 不调 LLM | missing envelope count |
| policy version missing | 无法解释 LOD | fail-closed 到 I0 | 事实仍推进 | 需配置修复 | config error |
| local model unavailable | I1/I2 本地路径失败 | I0 | 无 | 有界 | local model health |
| cost cap exceeded | 停新 I2+ | I0 only | 继续生活 | 不绕过 | cost alerts |
| idempotency conflict | 不自动新 key | STOP | 不双写 | 人工/规则 | conflict rate |
| kernel conflict | stale | REOBSERVE | 不旧快照重试 | replan 预算 | conflict rate |
| clock/pause | 世界不推进 | 等待 | 无新事件 | 不适用 | world status |
| poison resident loop | 本居民 STOP | 隔离 | 他人继续 | 不无限重试 | isolated count |

## 统一原则

1. **无限 retry 禁止。**
2. **预算耗尽 ≠ 居民删除。**
3. **Provider 失败 ≠ 世界停摆。**
4. **缺 evidence ≠ 编造历史。**
5. **失败恢复是 orchestration decision，不是 World Fact**（除非 Kernel outcome）。

## 与 replan directive 映射

| cognition 失败 | 倾向 directive |
| -------------- | -------------- |
| timeout | 有界 retry / degrade / DEFER |
| schema fail | 降级新 decision，不 RETRY 非法 payload |
| budget | STOP 高层，走 I0 新 decision 或 DEFER |
| provider down | DEFER 或 I0 immediate |
| quota | 降级 immediate |

精确表以 `m3-replan-v1` 为 outcome 侧权威；M10 不另造 Kernel 失败类型。
