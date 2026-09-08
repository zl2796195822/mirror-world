# ACTION_OUTCOME_REQUIREMENTS.md

> 统一说明：本文件为 `09-action-outcome-requirements.md` 的规范镜像，供未来 Pre-M3 / M5 开发直接引用。

详情请完整参阅：[09-action-outcome-requirements.md](./09-action-outcome-requirements.md)

### 核心结论摘要：

1. **现有缺口**：`action-request-store.ts` 仅持久化请求行，重复请求仅报 `duplicate`，缺乏执行状态 `status`、关联事件指针 `committed_event_id` 与业务结果回写。
2. **新增契约**：正式提出 `KernelActionOutcome` 概念规范，包含 `ACCEPTED`、`REJECTED`、`CONFLICT`、`DUPLICATE`、`TIMED_OUT` 五大机器可判状态。
3. **闭环价值**：为 M3 生命引擎动作闭环与 M5 Agent Runtime 失败重规划提供确定性事实反馈。
