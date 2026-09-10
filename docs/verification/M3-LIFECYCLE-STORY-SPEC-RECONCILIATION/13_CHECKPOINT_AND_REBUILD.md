# 13 Checkpoint and Genesis Rebuild

## Checkpoint contract

The checkpoint stores the complete v2 canonical resident projection, world
time, world sequence, registry version, replay schema version, and checksum.
It is a deletable acceleration artifact. It is never a new source of World
Truth.

The checkpoint sequence must equal the snapshot sequence, and the checksum
must equal the canonical snapshot hash. Its resident list and actor mapping
must be complete for the 30-resident manifest.

## Required checks

The expanded verification must:

1. replay all events from resident genesis;
2. create a checkpoint at a non-terminal prefix;
3. replay the suffix from the checkpoint;
4. delete the checkpoint through a disposable verification database/path;
5. rebuild from genesis;
6. compare live, full, suffix, and rebuilt hashes and all action/resource/work
   fields.

No checkpoint deletion may alter the event ledger, World Time, resource
balance, attendance, or social-contact facts. A corrupt, wrong-world,
wrong-sequence, or wrong-checksum checkpoint fails closed and falls back to
an explicit genesis replay for diagnostics.
