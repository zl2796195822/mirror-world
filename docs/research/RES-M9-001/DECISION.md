# Decision

## RES-M9-001 final decision

`READY_WITH_PENDING_CONTRACTS`。

### 1–4. Identity and authority

1. 层级：`AuthPrincipal → DigitalIdentity → world-scoped ResidentIdentity → Embodiment → ActorRef → ActionRequest`；Kernel outcome/event 是 action 的事实结果，不是身份层。四者永不合并：Auth、Digital、Resident、ActorRef。
2. `ResidentOrigin`：推荐 `NATIVE | HUMAN_ORIGIN`；Digital Twin 作为 human link/profile mode，而不是当前 controller。若后续保留 `DIGITAL_TWIN` origin 值，也必须保持其只描述 creation provenance。
3. `ControlAuthority`：grant 集合 + effective action decision；支持 direct/delegated/autonomous-rule/shared grants，但一次 action 只有一个有效控制决策。真人 direct takeover 显式优先。
4. `CognitionAuthority`：`HUMAN_INPUT | DETERMINISTIC_RULE | PROXY_RUNTIME | OPTIONAL_LLM | SYSTEM_FALLBACK` 等来源，独立于 Resident identity 与 control grant。M5 Agent/LLM 永无 fact authority。

### 5–8. Resident types

5. Human Resident：`HUMAN_ORIGIN`，可 direct control，现实姓名/认证与公共世界身份分层。
6. Digital Twin：human-linked resident 的可追溯 profile/representation 组合，分离 identity core、persona、memory、relationship、asset、embodiment、voice、control、consent/provenance。
7. Authorized Proxy：不是 Resident type，而是有效 Charter 下的 delegated control/cognition layer；不拥有 resident identity 或真人全部权限。
8. Native Digital Resident：`NATIVE`，无 fake human owner；具备自己的 resident continuity，future RightsPolicy 决定 capability，不在此作法律人格结论。

### 9–17. Action and proxy

9. Attribution：World Attribution 指向 resident/ActorRef；Control/Audit Attribution 独立记录 human principal、control mode、DelegationRef、charter version、AgentOperation、request、outcome 和 event refs。
10. Charter：显式 grant、least authority、bounded、revocable、versioned、auditable；不是 prompt 或 boolean。
11. Granularity：action category + resource budget + counterparty + location + world-time window + frequency + max value + risk + confirmation + expiration/revocation。M9 v1 以当前六类 Action Contract 为下界。
12. Risk：研究级 `LOW/ELEVATED/HIGH/IRREVERSIBLE`；BUY 按金额/对象/频率等组合判定，不只看 action name。
13. Version：稳定 `delegationRef/charterId` + 单调 `charterVersion`；旧版本 stale，不能用 prompt hash/worldSeq/resourceVersion 代替。
14. Revocation：撤销线性化点后未 commit 的 action 失效；未来 scheduled action dequeue 时重验。
15. In-flight：以授权检查与 action commit 的共同线性化点决定；已 commit 的历史不回滚、不删除。
16. Takeover：真人明确 direct priority，停止新 proxy cognition；旧 in-flight proxy operation 重新验证/失效。
17. Offline：offline 不启用 proxy；只能按有效 Charter 的 offline scope 或 deterministic fallback 行动。

### 18–29. Continuity, representation and privacy

18. Identity continuity：换 avatar/voice/LLM/provider/prompt、memory/relationship/runtime/account 变化均不换 ResidentId。
19. Fork/clone：独立未来 history 必须新 ResidentId；可保留 shared provenance，不复制 charter/rights/ownership。
20. Embodiment：renderer-agnostic `EmbodimentRef`；three-vrm/VRM 只是 representation provider。
21. Voice：representation，不是 identity/proof/authority；voice clone DEFER。
22. Biometric：raw/derived/artifact 分层、最小保存、显式 consent、可替换 provider；capture 不等于 proof，不等于 identity。
23. Consent/provenance：版本化、按 purpose/scope、可撤销；记录 source/provider/artifact/version，不保存 raw secret 到 world ledger。
24. Memory：resident-scoped、带 lineage；失忆不变人，M4 处理 perception/memory。
25. Relationship：directional resident projection；avatar/controller/provider 变化不丢失；M4 拥有 projection。
26. Asset：Resident ≠ Account；一个 resident 可多个 account，机构可有 account；M6 拥有 economic authority。
27. Rights vs permission：`ProxyPermission ⊆ ResidentRights`；admin plane 与 resident plane 分离。
28. Public/private：public world alias 与 private verified/auth identity 分离；origin/control 内部可审计，公共 disclosure 由 policy 决定。
29. Audit/history：Identity/Security Audit 与 World Event Ledger 分离；必要时用 refs 连接，不能将 private data 写 world events。

### 30–34. Cross-milestone contracts

30. M4：接收 resident identity与控制 lineage 的最小 projection；memory/relationship 绑定 resident，按 eligibility/lineage 入库，不能获取 auth/biometric/完整 charter。
31. M5：读取 bounded identity/control envelope；ActionIntent 经 authority preflight 后才成 ActionRequest；Agent cannot edit charter，LLM zero fact authority。
32. M6：account/asset authority 与 proxy spending budget 分离；经济 mutation 仍经 Kernel/M6，保留 delegation/version audit join。
33. M7：只消费 EmbodimentRef/visual projection；renderer 不得读取 secrets/charter/proof 或写 world truth。
34. M8：offline/dormancy 保留 resident identity/history；scheduler 只按有效 charter 唤醒，不能以 user offline 推断 proxy enabled。

### 35–40. Scope and Gate

35. Formal M9 minimum：identity/link/origin、control/cognition、charter/validation/version/revoke、attribution/audit/privacy、representation ports、M4–M8 contracts。
36. Prerequisites：M3 action-loop/scheduler/replay closure、formal M4/M5/M6/M8 contracts、fresh review、security/privacy threat model、ADR/task/TDD plan。
37. Gate：验证 separation、continuity、rights/charter bounds、stale/revoke/in-flight/takeover、audit, privacy, world isolation, economy and renderer boundaries；当前未通过。
38. Principle：镜界中的人首先是持续 Resident，不是 account/avatar/agent/prompt/memory/session。
39. Risks：fixture-only origin、coarse PROXY enum、confused deputy、revoke race、account takeover、privacy/history conflict、biometric overreach、admin leakage、cross-world coupling、research drift。
40. Port plan：then-current main → Compatibility Review → ADR → bounded port → TDD → migration/runtime → real Gate；不整包移植。

## Freeze

`FREEZE = ON`。本研究没有实现正式 M9，禁止进入 M9-T01、identity migration、Proxy Runtime、biometric scan 或 camera integration。
