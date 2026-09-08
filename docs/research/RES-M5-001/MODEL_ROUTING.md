# MODEL_ROUTING.md

> 统一说明：本文件为 `13-model-routing.md` 的规范镜像。

详情请完整参阅：[13-model-routing.md](./13-model-routing.md)

### 核心结论摘要：

1. **去商业品牌化**：严禁将特定模型名写死为系统标准，建立 `TIER_0_HEURISTIC`、`TIER_1_LIGHT`、`TIER_2_STANDARD`、`TIER_3_ADVANCED` 与 `TIER_OFFLINE_BATCH` 能力分层。
2. **多模态与混合部署**：支持云端前沿 SOTA 与本地开源模型（如 Qwen2.5 / vLLM）动态热切。
3. **动态路由防线**：结合玩家参与度、事件重要性与队列背压，实现毫秒级算力动态分派。
