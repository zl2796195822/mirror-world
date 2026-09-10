# 25 M4/M5 Compatibility Boundary

## M3 TALK output

M3 TALK produces only:

- a same-world, same-location, two-resident accepted contact;
- start/completion event facts;
- deterministic `SocialPressure` relief for the two participants;
- replayable paired activity state.

## Deferred ownership

| Capability                                       | Owner            | M3 disposition             |
| ------------------------------------------------ | ---------------- | -------------------------- |
| relationship/familiarity/trust/affinity/conflict | M4 Relationship  | no mutation or score in M3 |
| semantic memory/timeline                         | M4 Memory        | no memory record in M3     |
| dialogue/content/transcript/summary              | M5 Dialogue      | `message` omitted; no LLM  |
| agent cognition/model calls                      | M5 Agent Runtime | zero-LLM M3 run            |

Future milestones may consume M3 TALK events as inputs. They may not reinterpret
the M3 event as if a relationship or transcript already exists.
