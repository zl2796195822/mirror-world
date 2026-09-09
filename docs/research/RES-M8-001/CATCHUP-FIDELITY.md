# CATCHUP-FIDELITY

## Question

Can offline catch-up use cheaper “coarse” simulation for long idle periods?

## Fidelity Levels (research)

| Level | Name | Mechanism | History risk |
| ----- | ---- | --------- | ------------ |
| **S0** | Exact event simulation | Same Kernel commits as realtime | None — canonical |
| **S1** | Aggregated deterministic routines | Batch same-class routine outcomes | Different events/state vs S0 |
| **S2** | Macro / institutional simulation | Statistical or scheduled bulk facts | High divergence risk |

## Danger

Different fidelity can produce **different histories**.

If S1 invents “worked 8 hours” as one blob while S0 produced 47 discrete events, then:

- Replay hashes diverge
- Memory/relationship projections diverge
- Digest content diverges
- “Truth” becomes mode-dependent

That violates the Second Human World integrity promise.

## M8 v1 Recommendation

**Prefer S0 exact deterministic event-driven catch-up only.**

- Event-jump already reduces cost without changing semantics.
- Need threshold analytic wakes still commit real actions via Kernel.
- No “skip details then pretend it happened.”

## When S1/S2 Might Be Acceptable (future, formal ADR required)

Only if:

1. Semantics are first-class (not silent approximation)
2. Equivalence class is defined (“S1 is defined history for world mode X”)
3. Replay pins fidelity in SimulationManifest
4. Product accepts that mode change is a world-policy change, not a perf tweak
5. Canonical comparison uses fidelity-aware rules

This research does **not** authorize S1/S2.

## Relationship to RES-M3-003

RES-M3-003 already separates:

- Event Ledger Replay
- Runtime Projection Replay
- Decision Re-evaluation
- Simulation Re-run

Fidelity changes would break Simulation Re-run equivalence unless manifest-bound. M8 must not weaken that.

## Cost Without Faking Truth

Acceptable cost controls (all S0):

| Control | Effect |
| ------- | ------ |
| Event-jump | Skip empty minutes |
| Batch due completions in stable order | Fewer round trips |
| Checkpoint | Faster restore, not cheaper history |
| Chunked catch-up | Bound burst size |
| Intelligence LOD I0/I1 offline | Fewer LLM calls, same rule determinism |
| Defer presentation | No render cost |

## Explicit Non-Claims

- Do not claim 2-year catch-up is cheap.
- Do not solve cost by mutating World Truth.
- Do not use LLM to summarize-away intermediate events and write the summary as fact.
