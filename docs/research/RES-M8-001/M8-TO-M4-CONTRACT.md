# M8-TO-M4-CONTRACT

M4 = Memory / Relationship / Perception (research only; not implemented).

## Shared Truth

Offline world still produces World Events → Perception eligibility → Memory/Relationship projections **whether or not a human client is open**.

That is required for a Second Human World, but **M8 does not own Memory**.

## Boundary Table

| Concern | M8 | M4 |
| ------- | -- | -- |
| Advance World Time | Yes (via Kernel) | No |
| Commit interaction facts | Facilitates schedule/catch-up | No write authority |
| Perception eligibility | No | Yes |
| Episodic memory store | No | Yes |
| Relationship projection | No | Yes |
| Digest ranking with relationships | Consumes read model later | Provides strength/projection |
| Forgetting policy | No | Yes |
| Replay of memory lineage | No | Yes (dual-mode) |

## Iron Laws Inherited from RES-M4-002

- World Event ≠ Observation ≠ Memory
- World Fact ≠ Resident Belief
- No global event broadcast
- LLM zero fact authority
- Memory cannot reverse-write Kernel Truth
- Vector index ≠ memory truth
- Forgetting never deletes `world_events`
- `SocialPressure` ≠ Relationship

## M8 Must Not

- Treat every World Event as automatic memory for all residents
- Collapse Decision Observation (`m3-observation-v1`) into Perception Observation
- Implement M4 tables as a side effect of offline persistence
- Use relationship numbers that don’t exist yet as hard dependencies for v1 digest

## Offline Interaction

| Phase | Behavior |
| ----- | -------- |
| During catch-up | Interaction events commit via Kernel |
| After events | M4 pipeline (future) forms memories/relationships |
| User return | Digest may later include friend events; v1 uses fallback ranking |

M8 v1 digest **must not block** on M4.

## Replay Caution

RES-M4-002 rejects unconditional “world_events alone → identical memories” without pinned policies + intermediate decisions. M8 equivalence Gate focuses on **world authoritative state**, not cognitive memory equality, until M4 formalizes dual-mode replay.
