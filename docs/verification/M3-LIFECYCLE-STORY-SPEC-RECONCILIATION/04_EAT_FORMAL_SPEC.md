# 04 EAT Formal Specification

## Purpose and scope

M3 EAT is the smallest Kernel-backed nutrition action that can lower the
derived `HungerPressure`. It is not a food economy. It does not buy, price,
sell, restock, transfer money, or create merchant truth.

## Preconditions

At START:

- world is `RUNNING` and `request.worldId` matches it;
- actor is the active native resident in that world and is `IDLE`;
- current location exists in the same world and has `EAT` capability;
- `itemId` resolves to a food item in the same world at the current location;
- `quantity` is a positive safe integer; M3 rule candidates use `1`;
- Kernel-owned food units for the resident are at least `quantity`;
- resource version and actor state version match the re-read snapshot;
- requested-by permission and idempotency pass.

The item directory and resource snapshot are read through the existing Kernel
validation context. The M3 fixture supplies one deterministic resident-owned
food item at an EAT-capable home. No resident is moved or teleported to eat.

## Resource decision

The current `ResourceReadPort` is insufficient for an accepted consuming
action. The implementation task therefore requires a narrow
`KernelOwnedFoodConsumption` capability under the same Kernel/Economy owner:

```text
consumeFood(worldId, residentId, itemId, quantity, expectedVersion)
  -> { beforeUnits, afterUnits, beforeVersion, afterVersion }
```

It must execute in the start transaction, use compare-and-swap/version
semantics, and be represented by the EAT start event. It must not add a second
inventory table or a Life Engine write port. If the existing formal M6 bridge
cannot expose this capability, implementation stops at the ADR/M6 gate rather
than inventing a fixture-only mutation.

## Lifecycle

```text
EAT ActionRequest(itemId, quantity)
 -> RESIDENT_EAT_STARTED + EATING runtime + due = start + 30m
 -> ACTIVITY_COMPLETION due item
 -> RESIDENT_EAT_COMPLETED + Hunger relief + IDLE runtime
```

Food units are consumed at START so the reservation cannot disappear during
the 30-minute activity. `RESIDENT_EAT_COMPLETED` is the accepted nutrition
fact used by the next Need evaluation. A start is not counted as an eaten meal
until its completion exists.

## Need effect

`HungerPressure` remains derived and lazy. No `HUNGER_CHANGED` event is added.
The accepted completion contributes one versioned nutrition effect:

```text
Need effect policy: m3-need-effects-v1
EAT quantity: q
Hunger relief: 55 * q pressure points, clamped at zero
anchor activity after completion: AWAKE
```

The `55` value is policy, not World Law; it is frozen in the run manifest and
the completion payload's policy reference. Replay uses the referenced policy,
not a current mutable configuration. The next `Needs` evaluation starts from
the accepted completion boundary and therefore observes lower hunger.

## Failure handling

| Failure                                 | Kernel result                                                        | Recovery                                                                        |
| --------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| stale actor/resource version            | `CONFLICT`                                                           | `REOBSERVE_NOW`, bounded by two conflict recoveries                             |
| no food or invalid item/location        | `REJECTED/KERNEL_INSUFFICIENT_RESOURCE` or `KERNEL_INVALID_LOCATION` | alternate candidate or 2/4/8/16/32-minute deferred replan, capped at 60 minutes |
| resident busy/world paused              | `REJECTED`                                                           | reobserve or stop; no spin                                                      |
| duplicate request                       | `REUSED`                                                             | reuse outcome; no second consumption                                            |
| same idempotency key, different payload | `IDEMPOTENCY_CONFLICT`                                               | stop and require reconciliation                                                 |
| completion before due                   | `NOT_DUE`                                                            | retain due source; no mutation                                                  |

No EAT rejection creates a Need relief or a resource decrement.
