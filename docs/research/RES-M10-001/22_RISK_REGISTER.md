# 22 · Risk Register

| ID | 风险 | 等级 | 影响 | 缓解 | 状态 |
| -- | ---- | ---- | ---- | ---- | ---- |
| R-M10-01 | 与 RES-M5 I-LOD 编号冲突导致实现混乱 | 高 | 双标准 | 正式 ADR 统一；本研究已重述 | OPEN |
| R-M10-02 | 把 attention 做成「点谁谁聪明」 | 高 | 公平/成本/叙事崩坏 | 有界 bonus + 配额 + 可关 | OPEN |
| R-M10-03 | 执行层（M5）自行决定预算 | 高 | 权威边界破坏 | 合同矩阵；代码评审 | OPEN |
| R-M10-04 | Catch-up 用新 LLM 补历史 | 高 | 分叉/伪造 | G-06/G-11；禁止重调 | OPEN |
| R-M10-05 | 预览性能不足导致过早分片 | 中 | 过度工程 | 分阶段 P30→1000 | OPEN |
| R-M10-06 | 假 benchmark 被当真 | 中 | 错误决策 | 文内强制 UNVERIFIED | 已缓解 |
| R-M10-07 | Envelope 存储爆炸 | 中 | 运维成本 | 只存 I2/I3；retention | OPEN |
| R-M10-08 | Policy 非确定性（浮点/遍历序） | 高 | replay 失败 | 纯函数 + 稳定排序 + 测试 | OPEN |
| R-M10-09 | PRE-AL-07 排序变更 | 中 | 公平假设失效 | PENDING 登记；兼容层 | OPEN |
| R-M10-10 | M9 Charter 未定时 Proxy 滥用 | 中 | 成本/权限 | 先 NATIVE；proxy 默认禁高 I | OPEN |
| R-M10-11 | 把 importance 写成 World Fact | 高 | 污染 ledger | 明确四类 importance 分离 | 已在模型禁止 |
| R-M10-12 | 无限 retry / I3 storm | 高 | 雪崩 | 失败矩阵 + 并发硬顶 | OPEN |
| R-M10-13 | 为 100k 破坏 30 人正确性 | 高 | 主线质量 | 范围提案限制 v1 | OPEN |
| R-M10-14 | Observation/localContext 仍缺失 | 中 | trigger 受限 | 诚实 UNAVAILABLE；不伪造 | 已知 |
| R-M10-15 | Provider 私有数据进 envelope | 中 | 隐私 | 字段最小化；访问控制 | OPEN |

## 风险接受

研究阶段接受上述 OPEN 项，不实现缓解代码；正式 M10 必须关闭高风险项对应 Gate。
