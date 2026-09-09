# Proxy Charter

## Definition

Proxy Charter 是 human-linked resident 明确授予代理的、可机器校验的控制范围。它不是 prompt、不是 `proxyEnabled` boolean、不是永久授权，也不是通用 IAM 平台。

## Minimum conceptual record

```text
ProxyCharter
  charterId / delegationRef
  worldId / residentId
  grantorDigitalIdentityRef
  delegateRef
  status: ACTIVE | SUSPENDED | REVOKED | EXPIRED
  charterVersion
  effectiveFrom / expiresAt (world time)
  allowed action capabilities
  resource/counterparty/location/time/frequency bounds
  risk and confirmation policy
  consent/provenance reference
  issued/revoked audit timestamps
```

字段是研究模型，不是 migration schema。

## Hard invariants

1. least authority：默认 deny；只允许列出的 scope。
2. bounded：每次、周期、金额、对象和时间均可限制。
3. revocable：撤销和版本变化会阻断未来未 commit action。
4. auditable：每次有效授权决策关联 charter/version。
5. resident rights bound：`ProxyPermission ⊆ ResidentRights`。
6. no prompt authority：prompt 文字不产生、扩大或延长权限。
7. no long transaction：人类确认不能占用 Kernel transaction。

## Lifecycle

```text
draft → issued(v1) → active
                  ↘ suspended / revoked
active → amended(v2) → old version stale
active → expires
```

需要确认的动作停留在 control/authorization state；确认后重新生成有效 ActionRequest，不能把 pending confirmation 当 World Fact。

## Grantor boundary

Human-linked resident 的真人 grantor 只能授权其有权控制的 resident。Native resident 的代理机制需要未来 world/institution policy；不能用平台 operator 伪造真人 owner。管理员 plane 与 resident plane 分离。
