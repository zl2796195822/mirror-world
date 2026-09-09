# 14 · Human Attention Bias

## 问题

> 「用户正在看谁，会不会让谁变聪明？」

产品直觉：可见居民应更细、更生动。  
世界公平：不能因为点击张三，张三就获得比李四更高的**真实能力**。

## 三层边界

| 层 | 定义 | 可否因观察提高 |
| -- | ---- | -------------- |
| **Presentation fidelity** | 画面、动画、旁白、思考气泡、UI 细节 | **可以** |
| **Cognition fidelity** | 本次 wake 实际使用的 I 层与上下文丰富度 | **仅在有界 bonus 内** |
| **World consequence** | Kernel 接受/拒绝、资源、事件合法性 | **不可以** |

```text
Observation  ──►  Presentation (V)     自由提高
     │
     └──► Cognition (I)  有界 bonus + 配额
              │
              ▼
         ActionRequest ──► Kernel  规则不变
```

## 推荐政策

### 允许

1. **AOI / visibility 提高 V LOD**（M7）
2. **对当前人类会话对象**提供有限 attention bonus（例如允许更常进入 I2）
3. Bonus **必须**：
   - 有上限（次数/时长/并发）
   - 计入该居民配额
   - 可审计
   - 可配置关闭
4. 表现层可以展示「更投入的演出」，即使底层仍是 I0/I1（注意诚实性：不得假装 I3 却编造事实）

### 禁止

1. 因被观看获得永久智能/特权动作
2. 绕过 Kernel 校验
3. 从其他居民静默抽走预算且无记录
4. 用「用户喜欢」直接改写 relationship/memory 真值
5. 把 attention 写成世界事实（除非未来正式事件类型）

## 公平性证明要点

设用户只看张三：

- 张三可能在观察期内有更高 `W_I2`（cognition wake 质量）
- 李四的 due 仍按 deterministic order 被处理（I0 也完成 SLEEP/WORK）
- 李四不会饿死
- 张三无法通过观看获得额外 cash/location 等事实
- 取消观察后，张三回到基线

因此：**presentation 可偏心，世界法则不偏心。**

## 与 M5「玩家邻近度」的修正

RES-M5 I-LOD 公式含 $P_{user}$ 高权重。  
M10 修正：

- 保留 proximity/attention 作为 **信号**
- 但必须被 `fairness.quota` 与 `world.cap` clamp
- 不得让 $P_{user}$ 单独把 Score 冲到无界 I3

## 产品诚实性

若产品展示「居民正在深思」：

- 最好与真实 I 层一致
- 若仅为 presentation flair，应避免让用户以为世界规则被改变
- 可在 debug/透明模式显示真实 I 层（未来）

## 人类代理自身

- HUMAN 身份亲自操作时，预算语义不同（那是人类输入，不是系统 cognition）
- 系统 assist 的 deterministic help 仍走受审计路径
- 详细身份规则：`PENDING_RES_M9_001`

## 非目标

- 不设计具体 UI
- 不实现 attention detector
- 不规定像素 LOD
