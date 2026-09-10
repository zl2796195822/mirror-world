# 20 Formal Implementation Task Specification

## Proposed task identity

`PROPOSED_FORMAL_IMPLEMENTATION_TASK = M3 Behavioral Lifecycle Extension`

`TASK_ID = PENDING_FORMAL_REGISTRATION`

No permanent task number is invented by this reconciliation. The next
implementation session may execute only after this name is formally
registered/authorized and the two ADR gates are accepted.

## Scope

Implement exactly:

- the common lifecycle extension and v2 activity/runtime contract;
- Kernel-backed EAT with Kernel-owned versioned food consumption;
- Kernel-backed WORK attendance/shift completion;
- Kernel-backed paired TALK;
- `m3-rule-decision-v2` candidate/action-loop integration;
- existing scheduler due/wake extension;
- typed event registry v2 and resident projection replay v2;
- checkpoint/suffix/genesis equivalence;
- deterministic causal evidence needed by M3-T05.

## Explicit non-scope

No BUY settlement, price/account/merchant/inventory economy, payroll,
arrears, journal, dialogue, transcript, LLM, Memory, Relationship mutation,
M4/M5/M6 work, 3D, realtime, scale work, or new scheduler is included.

## Required implementation order

1. Accept/register the EAT resource and TALK paired-lock ADR decisions.
2. Extend contracts/runtime/schema through migration, preserving MOVE/SLEEP.
3. Add contract/unit tests first for action, event, due, replay, lock, and
   resource semantics.
4. Implement Kernel start/completion transactions.
5. Extend Life candidates/action loop and bounded recovery.
6. Extend the existing scheduler and replay/checkpoint projection.
7. Run the verification task and the new M3 lifecycle gate.

No step may update `PROJECT_STATE.md` to M3 PASS before the future Final Status
Review accepts the resulting evidence.
