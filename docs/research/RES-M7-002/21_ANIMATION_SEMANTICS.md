# 21 Animation Semantics

## Principle

**Animation ≠ World Action**

World action is Kernel-committed fact. Animation is a presentation reaction.

If animation fails, world fact remains.

## Mapping table

| World state / event             | Animation presentation    |
| ------------------------------- | ------------------------- |
| IDLE                            | idle loop / look around   |
| MOVE STARTED (TRAVELING)        | walk/run cycle along path |
| MOVE COMPLETED                  | arrive blend → idle       |
| SLEEP STARTED                   | lie down / sleep loop     |
| SLEEP COMPLETED                 | wake → idle               |
| EAT COMMITTED (future)          | eating anim (optional)    |
| WORK COMMITTED/ongoing (future) | work loop                 |
| TALK COMMITTED (future)         | talk gestures             |
| BUY COMMITTED (future)          | bag prop / brief anim     |

## Failure semantics

| Animation failure         | World impact                                                            |
| ------------------------- | ----------------------------------------------------------------------- |
| walk clip missing         | none; fall back to slide/teleport/idle move                             |
| anim blend glitch         | none                                                                    |
| client crash mid-eat anim | none; EAT stays committed                                               |
| network drop mid-walk     | none; on resync show committed TRAVELING progress or completed location |

Never reverse EAT/MOVE/SLEEP facts because a clip failed.

## Timing

Preferred source of progress:

- worldTime window from activity started/due

Secondary:

- local smoothing for 60 FPS interpolation

Do not use animation frame index as completion authority.

## Reduced-motion / accessibility

Presentation policy should support:

- reduced motion
- instant cuts
- simplified V1 markers

Accessibility choices never alter simulation.

## Gate

- kill animation subsystem → residents still exist and facts unchanged
- force anim error → projection still correct
