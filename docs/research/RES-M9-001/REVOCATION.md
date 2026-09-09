# Revocation

## Effective rule

撤销影响撤销线性化点之后仍未 commit 的 action；不重写、不删除、不伪造已提交的世界历史。

```text
current charter/version at commit linearization
  = authority for this action
```

撤销记录需要 durable `effectiveAt`（world time）和系统记录时间；两者用途不同：world time 参与世界策略，recorded time 支持安全审计。

## State handling

| 状态                           | 处理                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| Agent 正在思考                 | 取消/标 stale；思考本身不是 World Fact                     |
| 已生成未提交 ActionIntent      | 丢弃，重新 observe；不能重试旧授权                         |
| 已发 ActionRequest 未 commit   | Kernel 重新检查 charter/version；撤销先发生则 reject       |
| Kernel transaction 正在 commit | 与 revoke 通过同一线性化点排序                             |
| 已 `COMMITTED`                 | 保留 World Event、Outcome 和 audit；不得 retroactive erase |
| 未来 scheduled action          | 在 dequeue/submit 时再次校验；撤销后不能执行               |
| pending human confirmation     | 标为失效 control state；确认后需新 request                 |

## No prompt deletion

删除系统 prompt 或停止 agent 不是 revoke proof。必须由 durable authority/status/version 使所有提交路径都能 fail closed。
