# 18 · Security & Abuse

## 不变量

> **模型输出无 World Authority。**

任何 I3 输出与 I0 规则候选一样，必须经 ActionRequest → Kernel。

## 威胁模型

### 1. Prompt injection

| 路径 | 风险 | 缓解 |
| ---- | ---- | ---- |
| 用户消息注入居民系统提示 | 让居民产生越权 intent | 结构化 schema；参数白名单；Kernel 拒绝 |
| 世界事件文本注入 | 污染后续 cognition | 事件数据与指令分离；不把事件当 system 权限 |
| 记忆/摘要注入 | 长期操纵 | M4 检索只读；无直接写权 |

### 2. Resident manipulation

- 不能通过对话直接改 relationship 真值
- 不能通过「说服模型」加钱
- 社交结果必须走未来正式 TALK/经济事件路径

### 3. Budget exhaustion attack

| 攻击 | 防护 |
| ---- | ---- |
| 用户反复点居民逼 I3 | interaction + attention bonus 上限 |
| 制造大量失败触发 replan/upgrade | failure 升级有界；poison isolation |
| 刷消息 | per-interaction quota |
| 多世界拖垮 | cross-world isolation |

### 4. 用户诱导某居民持续 I3

- 禁止：无界、永久、绕过配额
- 允许：有界会话内提升，审计，结束后回落

### 5. Proxy 滥用高级 cognition

- Charter 上限
- 独立配额
- 无权扩大 Kernel 权限

### 6. Provider output 越权

| 越权 | 防护 |
| ---- | ---- |
| 未知 action type | schema 拒绝 |
| 非法参数 | schema/validator 拒绝 |
| 要求直接改 DB | 架构上无此通道 |
| 编造事件时间/seq | Kernel 分配，不信模型 |
| 假装 system/developer 指令 | 厂商与自有多层隔离；仍无事实权 |

## 权限分层

```text
Provider output  = untrusted subjective proposal
M5 parser        = syntax + shape
M10 policy       = whether/deep/budget
Kernel validator = world legality
PostgreSQL       = durable truth
```

## 数据与隐私（研究提示）

- Envelope 可能含用户对话摘要 → retention 与访问控制
- 不提交密钥、真实人脸/声音原始素材（项目纪律）
- 日志避免完整 CoT

## 反滥用测试主张（未来）

- 注入提示无法产生非法 committed event
- 超预算无法进入 I3
- attention spam 不饿死其他居民
- proxy 超 charter 被拒
- provider 返回越权 JSON 被拒且 fail-closed
