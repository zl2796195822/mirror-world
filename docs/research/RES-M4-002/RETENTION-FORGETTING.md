# RETENTION-FORGETTING

## 1. 铁律

Forgetting **只影响 Resident Memory State**。  
**不得删除/修改 World Event。**

## 2. RES-M4-001 裁决

| 主张                                | 裁决                          |
| ----------------------------------- | ----------------------------- |
| 艾宾浩斯式动态衰减                  | KEEP 作为方向                 |
| ACTIVE→DECAYED→ARCHIVED             | KEEP                          |
| identity milestone decay=0 永恒常数 | ADAPT → high-retention policy |
| 具体半衰期/AUC 参数                 | CALIBRATION，不进世界物理法则 |

## 3. v1 策略骨架

```text
retentionScore = f(importance, salience, accessReinforcement, identityPolicy, age)
status transitions by versioned retention policy
```

建议 policy version：`m4-retention-v1`。

## 4. 强化因素

- 再次被检索/使用
- 被 consolidation 引用
- 与高重要互动关联
- identity milestone flag（policy protected，不是数学上绝对不可忘）

## 5. 不做

- 复杂 archive infrastructure
- 冷热分层平台
- 跨设备真人记忆合规系统（Digital Identity 后续）
