# 15 Story Sanity Formal Definition

## Purpose

M3-T05 is an automated validation of whether the deterministic resident model
produces causal, live, legal behavior over 30 residents and 30 World Days. It
is a verification artifact, not World Truth and not a product narrative.

The report must answer, for each accepted action: which observation and Need
state led to which Goal, Candidate, ActionRequest, Kernel outcome, event, and
next observation. Aggregate counts without this causal chain are insufficient.

## Scope

The run covers `MOVE`, `SLEEP`, `EAT`, `WORK`, and `TALK` under fixed seed,
fixed policy versions, clean PostgreSQL, the deterministic World-Time driver,
the existing lease/fence boundary, and zero LLM calls. `BUY` is an explicit
negative boundary, not an action-coverage target.

Story Sanity has three layers:

1. **Hard Gates**: machine predicates; any failure means `FAIL`.
2. **Diagnostics**: anomaly counts and distributions; they explain behavior
   and may trigger review, but do not silently alter World Truth.
3. **Human Review Notes**: bounded comments on plausibility and surprising
   patterns; they cannot turn a failed Hard Gate into PASS.

## Run contract

The run is exactly 30 residents × 30 World Days = 43,200 World Minutes. It
uses one immutable `SimulationManifest`, one deterministic action/Need policy
set, and one event history. A run may be repeated with the same manifest;
results are compared by canonical digest.

The report and all summaries are disposable verification artifacts. Deleting
them does not change World Time, resident state, resources, attendance, or
events.
