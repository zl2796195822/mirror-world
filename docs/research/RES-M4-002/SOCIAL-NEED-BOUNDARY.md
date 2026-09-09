# SOCIAL-NEED-BOUNDARY

## 1. 正式分离（继承 ADR-0007）

```text
SocialPressure  ≠  Relationship State
```

- SocialPressure：Life Engine Need，`0=satisfied, 100=critical`
- Relationship：对特定对象的社会关系长期状态

## 2. 禁止耦合

| 禁止                           | 原因                                   |
| ------------------------------ | -------------------------------------- |
| SocialPressure=80 → trust-=20  | 把全局生理心理压力误写成对他人的信任   |
| 朋友多 → SocialPressure 永远 0 | Need 是 deficit pressure，不是关系计数 |
| Relationship 直接改 Need rates | M3 policy 独立、可重放                 |

## 3. 允许的弱连接（未来，经正式边界）

Relationship 可以：

- 影响 TALK 候选对象排序
- 影响交互接受效用
- 影响 memory encoding salience
- 影响未来 Goal scoring

但必须经 bounded read port / policy，而不是互相直接写表。

## 4. M4 v1

- SocialPressure 继续零关系真相假设
- Relationship 系统不反向要求 M3 扩 Need
- 不引入 stress/safety/purpose（继续 DEFER，除非新 ADR）
