# NO_LLM_DEGRADATION.md

> 统一说明：本文件为 `20-failure-degradation.md` 的规范镜像。

详情请完整参阅：[20-failure-degradation.md](./20-failure-degradation.md)

### 核心结论摘要：

1. **AI 不是生命发动机**：M5 Agent Runtime 是认知增强，不是生存基石；
2. **三级降级防线**：从轻度限流、厂商热切到全网断网切入 `ZERO_LLM` 确定性保活；
3. **16 类故障矩阵**：全景覆盖 Provider Down、超时、版本冲突、乱码与队列过载，确保世界时钟永不停摆。
