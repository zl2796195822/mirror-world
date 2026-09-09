# 32 Gate Proposal

Future formal M7 Hard Gates. Not executable in this research.

## Gate list

### G-01 Projection rebuild

Delete all projection/realtime caches; rebuild from PostgreSQL truth; clients converge; Kernel checksums unchanged.

### G-02 Snapshot / afterSeq

Client snapshot at X then ordered deltas after X; payloads stamped with seq.

### G-03 Gap recovery

Injected seq gap forces resnapshot; no silent drift.

### G-04 Reconnect

Disconnect mid-TRAVELING/SLEEPING; reconnect shows committed current state.

### G-05 Server restart

Kill realtime; truth intact; clients recover via snapshot.

### G-06 Client tampering

Forged location/movement/state packets rejected or ignored; no Kernel mutation.

### G-07 MOVE semantic correctness

During TRAVELING projected location remains source; only COMPLETED switches location; rejected MOVE leaves no permanent visual truth.

### G-08 World truth isolation

No WebGL/avatar/realtime module writes worlds/events/runtime tables.

### G-09 Thirty residents

World population 30 observable; render model remains budgeted; list UI shows truth for all in scope.

### G-10 AOI

Outside-AOI residents continue in truth; re-enter AOI shows correct state; AOI changes do not alter Kernel rows.

### G-11 Asset failure

Missing avatar/building assets degrade to placeholders; identity/location unchanged.

### G-12 Realtime loss

Realtime process loss never corrupts truth; rebuild path proven.

### G-13 M8 catch-up display

If lagState present, UI never presents severely behind world as current; writes gated per freshness contract.

### G-14 Physical device

At least one real physical mobile device run for chosen target profile (not simulator-only).

### G-15 Performance evidence

Frozen thresholds measured on named devices with raw artifacts; no experiment FPS substitution.

### G-16 Projection replay equivalence (stretch)

Current-state rebuild matches runtime authority; if full domain replay required by M3, link that separate gate.

## Evidence discipline

Each gate needs:

- reproducible steps
- commit SHA
- raw logs/metrics
- explicit PASS/FAIL
- no cherry-picked single happy path only
