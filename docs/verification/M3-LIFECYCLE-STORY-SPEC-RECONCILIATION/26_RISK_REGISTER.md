# 26 Risk Register

| ID                               | Risk                                                                  | Severity | Mitigation / gate                                                     |
| -------------------------------- | --------------------------------------------------------------------- | -------: | --------------------------------------------------------------------- |
| `RISK-EAT-RESOURCE-AUTHORITY`    | Read-only resource bridge is mistaken for a consumable authority.     |       P1 | Accept EAT ADR; Kernel CAS and event-backed projection only.          |
| `RISK-TALK-PAIR-RACE`            | Reciprocal requests create two contacts or half-lock a pair.          |       P1 | Two-row UUID-byte lock, shared activity id, reciprocal race test.     |
| `RISK-WORK-LATE`                 | A late resident is silently counted as working.                       |       P1 | Exact shift-start gate; `LATE` is never start authorization.          |
| `RISK-REPLAY-GAP`                | New fields are live-only or checkpoint-only.                          |       P1 | v2 reducer, full/suffix/genesis hashes include resources/work/TALK.   |
| `RISK-FAKE-STORY`                | Action counts pass while causal Need/context evidence is absent.      |       P1 | Hard Gate 4 and per-resident causal evidence artifact.                |
| `RISK-UNBOUNDED-RECOVERY`        | Resource/participant failure spins a resident forever.                |       P1 | Existing PRE-AL-06 budgets and scheduler bounded step.                |
| `RISK-SCOPE-CREEP`               | BUY, payroll, dialogue, Memory, or Relationship enters M3.            |       P1 | Hard Gate 15, explicit boundary docs, scope audit.                    |
| `RISK-STALE-PROJECTION`          | Work/participant context is observed from a different world sequence. |       P1 | fresh Observation and expected state/resource versions.               |
| `RISK-HISTORICAL-PASS-OVERCLAIM` | Old PRE-AL-GATE PASS is treated as expanded Story Sanity proof.       |       P1 | retain historical profile label; require new lifecycle gate.          |
| `RISK-DOC-SOURCE-DRIFT`          | Ignored DOCX sources or review branches drift from Git main.          |       P2 | authority/conflict register and manifest/source hashes in future run. |
