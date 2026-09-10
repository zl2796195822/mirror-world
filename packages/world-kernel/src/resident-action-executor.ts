import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  assertSimulationDriverFenceInTransaction,
  actionRequests,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
  getResidentFoodItemId,
  registerNextWorkBoundaryWakeInTransaction,
  residentResourceStates,
  residentRuntimeStates,
  worlds,
} from "@mirror/db";
import type {
  ActionRequest,
  KernelActionOutcome,
  ResidentActivity,
} from "@mirror/contracts";
import {
  appendKernelActionOutcomeEventsInTransaction,
  executeKernelActionRequest,
  findKernelActionOutcomeInTransaction,
  type KernelActionExecution,
} from "./action-outcome-store.js";
import {
  validateActionRequest,
  type KernelLocationSnapshot,
  type ActionValidationContext,
  type ActionValidationResult,
} from "./action-validator.js";
import {
  ACTION_SEMANTICS_POLICY_VERSION,
  addWorldMinutes,
  getSleepDurationWorldMinutes,
  getTravelDurationWorldMinutes,
} from "./action-semantics.js";
import {
  EAT_DURATION_WORLD_MINUTES,
  LIFECYCLE_SEMANTICS_POLICY_VERSION,
  NEED_EFFECTS_POLICY_VERSION,
  TALK_DURATION_WORLD_MINUTES,
  WORK_ATTENDANCE_MINUTES,
  getWorkShift,
  lifecycleDueAt,
  workObligationKey,
} from "./lifecycle-semantics.js";
import type {
  WorldEventInput,
  WorldKernelTransaction,
} from "./world-events-store.js";
import type { WorldClockStatus } from "./world-clock.js";

export type ResidentActionDatabase = ReturnType<typeof createDb>["db"];

export type ExecuteResidentActionInput = Readonly<{
  request: ActionRequest;
  validationContext: ActionValidationContext;
  fenceToken?: bigint;
  expectedResourceVersion?: number;
}>;

export type CompleteResidentActionInput = Readonly<{
  worldId: string;
  actionRequestId: string;
  expectedStateVersion?: number;
  fenceToken?: bigint;
}>;

export type ResidentActionCompletionResult =
  | {
      disposition: "EXECUTED" | "REUSED";
      outcome: KernelActionOutcome;
    }
  | { disposition: "NOT_DUE"; outcome: KernelActionOutcome }
  | {
      disposition: "REJECTED";
      reasonCode: "KERNEL_INVALID_ACTION" | "WORLD_NOT_RUNNING";
      outcome: KernelActionOutcome;
    };

export class ResidentActionExecutorError extends Error {
  constructor(
    public readonly code:
      | "ACTION_NOT_SUPPORTED"
      | "WORLD_NOT_FOUND"
      | "ACTION_REQUEST_NOT_FOUND"
      | "RUNTIME_STATE_UNAVAILABLE"
      | "INVALID_COMPLETION",
    message: string,
  ) {
    super(message);
    this.name = "ResidentActionExecutorError";
  }
}

function isLegacyResidentAction(
  request: ActionRequest,
): request is Extract<ActionRequest, { actionType: "MOVE" | "SLEEP" }> {
  return request.actionType === "MOVE" || request.actionType === "SLEEP";
}

function isLifecycleAction(
  request: ActionRequest,
): request is Extract<ActionRequest, { actionType: "EAT" | "WORK" | "TALK" }> {
  return (
    request.actionType === "EAT" ||
    request.actionType === "WORK" ||
    request.actionType === "TALK"
  );
}

function isExecutableResidentAction(request: ActionRequest): boolean {
  return isLegacyResidentAction(request) || isLifecycleAction(request);
}

function isResidentAction(
  request: ActionRequest,
): request is Extract<
  ActionRequest,
  { actionType: "MOVE" | "SLEEP" | "EAT" | "WORK" | "TALK" }
> {
  return isExecutableResidentAction(request);
}

function residentIdForActor(
  worldSeed: string,
  worldId: string,
  actorId: string,
) {
  return generateResidentSeed({ worldId, seed: worldSeed }).residents.find(
    ({ actorRef }) => actorRef.actorId === actorId,
  )?.residentId;
}

function fixtureById(
  worldId: string,
): Map<string, { id: string; kind: string }> {
  return new Map(
    getFirstStreetLocationFixtures(worldId).map((location) => [
      location.id,
      location,
    ]),
  );
}

function kernelLocationsForWorld(
  worldId: string,
): readonly KernelLocationSnapshot[] {
  const fixtures = getFirstStreetLocationFixtures(worldId);
  return fixtures.map((location) => ({
    id: location.id,
    worldId,
    reachableFrom: fixtures
      .filter(({ id }) => id !== location.id)
      .map(({ id }) => id),
    capabilities:
      location.kind === "HOME"
        ? ["SLEEP", "EAT"]
        : location.kind === "CAFE"
          ? ["EAT", "WORK"]
          : ["OFFICE", "STORE"].includes(location.kind)
            ? ["WORK"]
            : [],
  }));
}

function residentSeedByActor(
  world: typeof worlds.$inferSelect,
  actorId: string,
) {
  return generateResidentSeed({
    worldId: world.id,
    seed: world.seed,
  }).residents.find(({ actorRef }) => actorRef.actorId === actorId);
}

function completedWorkShiftKeys(
  row: typeof residentRuntimeStates.$inferSelect,
): string[] {
  return Array.isArray(row.completedWorkShiftKeys)
    ? row.completedWorkShiftKeys.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
}

function runtimeActivity(
  row: typeof residentRuntimeStates.$inferSelect,
): ResidentActivity {
  if (row.currentActivity === "IDLE") return { kind: "IDLE" };
  if (
    row.activityInstanceId === null ||
    row.activityStartedAtWorldTime === null ||
    row.activityDueAtWorldTime === null
  ) {
    throw new ResidentActionExecutorError(
      "RUNTIME_STATE_UNAVAILABLE",
      "Active runtime state is missing activity metadata",
    );
  }
  if (row.currentActivity === "TRAVELING") {
    if (row.activityTargetLocationId === null) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Traveling runtime state is missing its target",
      );
    }
    return {
      kind: "TRAVELING",
      activityInstanceId: row.activityInstanceId,
      targetLocationId: row.activityTargetLocationId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }
  if (row.currentActivity === "SLEEPING") {
    if (row.activityTargetLocationId !== null) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Sleeping runtime state cannot have a target",
      );
    }
    return {
      kind: "SLEEPING",
      activityInstanceId: row.activityInstanceId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }
  if (row.currentActivity === "EATING" || row.currentActivity === "WORKING") {
    if (
      row.activityTargetLocationId !== null ||
      row.activityTargetResidentId !== null
    ) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        `${row.currentActivity} runtime state cannot contain a target`,
      );
    }
    return {
      kind: row.currentActivity,
      activityInstanceId: row.activityInstanceId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }
  if (row.currentActivity === "TALKING") {
    if (
      row.activityTargetLocationId !== null ||
      row.activityTargetResidentId === null
    ) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Talking runtime state must contain a resident target",
      );
    }
    return {
      kind: "TALKING",
      activityInstanceId: row.activityInstanceId,
      targetResidentId: row.activityTargetResidentId,
      startedAtWorldTime: row.activityStartedAtWorldTime.toISOString(),
      dueAtWorldTime: row.activityDueAtWorldTime.toISOString(),
    };
  }
  throw new ResidentActionExecutorError(
    "RUNTIME_STATE_UNAVAILABLE",
    `Unsupported runtime activity ${row.currentActivity}`,
  );
}

async function readResidentRuntimeForActor(
  transaction: WorldKernelTransaction,
  world: typeof worlds.$inferSelect,
  actorId: string,
  lock: boolean,
) {
  const residentId = residentIdForActor(world.seed, world.id, actorId);
  if (!residentId) return null;
  const query = transaction
    .select()
    .from(residentRuntimeStates)
    .where(
      and(
        eq(residentRuntimeStates.worldId, world.id),
        eq(residentRuntimeStates.residentId, residentId),
      ),
    );
  const [runtime] = lock ? await query.for("update") : await query;
  return runtime ? { residentId, runtime } : null;
}

async function readResidentRuntimeById(
  transaction: WorldKernelTransaction,
  world: typeof worlds.$inferSelect,
  residentId: string,
  lock: boolean,
) {
  const query = transaction
    .select()
    .from(residentRuntimeStates)
    .where(
      and(
        eq(residentRuntimeStates.worldId, world.id),
        eq(residentRuntimeStates.residentId, residentId),
      ),
    );
  const [runtime] = lock ? await query.for("update") : await query;
  return runtime ?? null;
}

async function lockResidentRuntimePair(
  transaction: WorldKernelTransaction,
  world: typeof worlds.$inferSelect,
  residentIds: readonly [string, string],
) {
  const sortedIds = [...residentIds].sort((left, right) =>
    Buffer.from(left.replaceAll("-", ""), "hex").compare(
      Buffer.from(right.replaceAll("-", ""), "hex"),
    ),
  );
  const rows = new Map<string, typeof residentRuntimeStates.$inferSelect>();
  for (const residentId of sortedIds) {
    const runtime = await readResidentRuntimeById(
      transaction,
      world,
      residentId,
      true,
    );
    if (runtime) rows.set(residentId, runtime);
  }
  return rows;
}

function validationContextAtRuntime(
  context: ActionValidationContext,
  world: typeof worlds.$inferSelect,
): ActionValidationContext {
  return {
    ...context,
    world: {
      id: world.id,
      status: world.status as WorldClockStatus,
      worldTime: world.worldTime,
    },
  };
}

function replaceActorRuntimeSnapshot(
  context: ActionValidationContext,
  request: ActionRequest,
  world: typeof worlds.$inferSelect,
  runtime: typeof residentRuntimeStates.$inferSelect,
): ActionValidationContext {
  return {
    ...validationContextAtRuntime(context, world),
    actors: context.actors.map((actor) =>
      actor.id === request.actorId
        ? {
            ...actor,
            locationId: runtime.currentLocationId,
            version: runtime.stateVersion,
          }
        : actor,
    ),
  };
}

async function validateResidentActionInTransaction(
  transaction: WorldKernelTransaction,
  input: ExecuteResidentActionInput,
): Promise<ActionValidationResult> {
  if (input.fenceToken !== undefined) {
    await assertSimulationDriverFenceInTransaction(transaction, {
      worldId: input.request.worldId,
      fenceToken: input.fenceToken,
    });
  }
  const [world] = await transaction
    .select()
    .from(worlds)
    .where(eq(worlds.id, input.request.worldId))
    .for("update");
  if (!world) {
    return { accepted: false, reasonCode: "KERNEL_INVALID_ACTION" };
  }

  const actorSeed = residentSeedByActor(world, input.request.actorId);
  if (!actorSeed) {
    return { accepted: false, reasonCode: "KERNEL_ACTOR_NOT_FOUND" };
  }
  let runtimeRows = new Map<
    string,
    typeof residentRuntimeStates.$inferSelect
  >();
  if (input.request.actionType === "TALK") {
    const participantSeed = residentSeedByActor(
      world,
      input.request.parameters.participantId,
    );
    if (
      !participantSeed ||
      participantSeed.residentId === actorSeed.residentId
    ) {
      return { accepted: false, reasonCode: "KERNEL_ACTOR_NOT_FOUND" };
    }
    runtimeRows = await lockResidentRuntimePair(transaction, world, [
      actorSeed.residentId,
      participantSeed.residentId,
    ]);
  } else {
    const runtime = await readResidentRuntimeById(
      transaction,
      world,
      actorSeed.residentId,
      true,
    );
    if (runtime) runtimeRows.set(actorSeed.residentId, runtime);
  }
  const resolvedRuntime = runtimeRows.get(actorSeed.residentId);
  const resolved = resolvedRuntime
    ? { residentId: actorSeed.residentId, runtime: resolvedRuntime }
    : null;
  if (!resolved) {
    return { accepted: false, reasonCode: "KERNEL_ACTOR_NOT_FOUND" };
  }

  const locations = fixtureById(world.id);
  const currentLocation = locations.get(resolved.runtime.currentLocationId);
  if (!currentLocation) {
    return { accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" };
  }
  const resource =
    input.request.actionType === "EAT"
      ? (
          await transaction
            .select()
            .from(residentResourceStates)
            .where(
              and(
                eq(residentResourceStates.worldId, world.id),
                eq(residentResourceStates.residentId, resolved.residentId),
                eq(
                  residentResourceStates.itemId,
                  input.request.parameters.itemId,
                ),
              ),
            )
            .for("update")
        )[0]
      : undefined;
  const participantSeed =
    input.request.actionType === "TALK"
      ? residentSeedByActor(world, input.request.parameters.participantId)
      : undefined;
  const participantRuntime = participantSeed
    ? runtimeRows.get(participantSeed.residentId)
    : undefined;
  const actors = [
    {
      id: actorSeed.actorRef.actorId,
      worldId: world.id,
      status: "ACTIVE" as const,
      version: resolved.runtime.stateVersion,
      locationId: resolved.runtime.currentLocationId,
      allowedRequesters: ["RULE"] as const,
      inventory: resource ? { [resource.itemId]: resource.foodUnits } : {},
      balanceCents: actorSeed.resources.cashCents,
      ...(actorSeed.employment.workplaceId
        ? { employmentWorkplaceId: actorSeed.employment.workplaceId }
        : {}),
    },
  ];
  if (participantSeed && participantRuntime) {
    actors.push({
      id: participantSeed.actorRef.actorId,
      worldId: world.id,
      status: "ACTIVE" as const,
      version: participantRuntime.stateVersion,
      locationId: participantRuntime.currentLocationId,
      allowedRequesters: ["RULE"] as const,
      inventory: {},
      balanceCents: participantSeed.resources.cashCents,
      ...(participantSeed.employment.workplaceId
        ? { employmentWorkplaceId: participantSeed.employment.workplaceId }
        : {}),
    });
  }
  const items = resource
    ? [
        ...input.validationContext.items.filter(
          (item) => item.id !== resource.itemId,
        ),
        {
          id: resource.itemId,
          worldId: world.id,
          locationId: resource.locationId,
          isFood: true,
          priceCents: 0,
          stockQuantity: resource.foodUnits,
        },
      ]
    : [];
  const context = replaceActorRuntimeSnapshot(
    {
      ...input.validationContext,
      actors,
      items,
      locations: kernelLocationsForWorld(world.id),
    },
    input.request,
    world,
    resolved.runtime,
  );
  const validation = validateActionRequest(input.request, context);
  if (!validation.accepted) return validation;
  if (
    resolved.runtime.currentActivity !== "IDLE" ||
    (participantSeed && participantRuntime?.currentActivity !== "IDLE")
  ) {
    return { accepted: false, reasonCode: "KERNEL_INVALID_ACTION" };
  }

  if (input.request.actionType === "MOVE") {
    const destination = locations.get(input.request.parameters.destinationId);
    if (!destination) {
      return { accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" };
    }
  } else if (input.request.actionType === "SLEEP") {
    if (
      !getFirstStreetLocationFixtures(world.id).some(
        ({ id, kind }) => id === currentLocation.id && kind === "HOME",
      )
    ) {
      return { accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" };
    }
  } else if (input.request.actionType === "EAT") {
    if (
      !resource ||
      resource.itemId !== input.request.parameters.itemId ||
      resource.locationId !== currentLocation.id ||
      resource.foodUnits < input.request.parameters.quantity
    ) {
      return { accepted: false, reasonCode: "KERNEL_INSUFFICIENT_RESOURCE" };
    }
    if (
      resource.itemId !== getResidentFoodItemId(world.id, resolved.residentId)
    ) {
      return { accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" };
    }
    if (
      input.expectedResourceVersion !== undefined &&
      resource.resourceVersion !== input.expectedResourceVersion
    ) {
      return { accepted: false, reasonCode: "KERNEL_CONFLICT" };
    }
  } else if (input.request.actionType === "WORK") {
    const shift = getWorkShift(world.worldTime);
    if (
      actorSeed.employment.status !== "EMPLOYED" ||
      actorSeed.employment.workplaceId !==
        input.request.parameters.workplaceId ||
      resolved.runtime.currentLocationId !==
        input.request.parameters.workplaceId ||
      shift.status !== "DUE" ||
      world.worldTime.toISOString() !== shift.start ||
      completedWorkShiftKeys(resolved.runtime).includes(
        workObligationKey(actorSeed.residentId, shift.start),
      )
    ) {
      return { accepted: false, reasonCode: "KERNEL_INVALID_ACTION" };
    }
  } else if (input.request.actionType === "TALK") {
    if (
      !participantSeed ||
      !participantRuntime ||
      participantSeed.residentId === resolved.residentId ||
      participantRuntime.currentLocationId !==
        resolved.runtime.currentLocationId ||
      participantRuntime.currentActivity !== "IDLE"
    ) {
      return { accepted: false, reasonCode: "KERNEL_INVALID_ACTION" };
    }
  } else if (
    !getFirstStreetLocationFixtures(world.id).some(
      ({ id, kind }) => id === currentLocation.id && kind === "HOME",
    )
  ) {
    return { accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" };
  }

  return validation;
}

function startEvent(input: {
  request: Extract<ActionRequest, { actionType: "MOVE" | "SLEEP" }>;
  world: typeof worlds.$inferSelect;
  runtime: typeof residentRuntimeStates.$inferSelect;
  sourceKind: string;
  destinationId?: string;
  dueAtWorldTime: Date;
  durationWorldMinutes: number;
}): WorldEventInput {
  const isMove = input.request.actionType === "MOVE";
  return {
    id: randomUUID(),
    worldId: input.world.id,
    type: isMove ? "RESIDENT_MOVE_STARTED" : "RESIDENT_SLEEP_STARTED",
    actorId: input.request.actorId,
    ...(input.destinationId ? { targetId: input.destinationId } : {}),
    payload: {
      schemaVersion: 1,
      actionType: input.request.actionType,
      phase: "STARTED",
      actionRequestId: input.request.id,
      activityInstanceId: input.request.id,
      sourceLocationId: input.runtime.currentLocationId,
      ...(input.destinationId ? { destinationId: input.destinationId } : {}),
      sourceLocationKind: input.sourceKind,
      startedAtWorldTime: input.world.worldTime.toISOString(),
      dueAtWorldTime: input.dueAtWorldTime.toISOString(),
      durationWorldMinutes: input.durationWorldMinutes,
      policyVersion: ACTION_SEMANTICS_POLICY_VERSION,
    },
    occurredAt: input.world.worldTime,
    correlationId: input.request.id,
  };
}

async function buildStartExecution(
  transaction: WorldKernelTransaction,
  input: ExecuteResidentActionInput,
): Promise<KernelActionExecution> {
  if (!isResidentAction(input.request)) {
    return { status: "REJECTED", reasonCode: "KERNEL_INVALID_ACTION" };
  }
  const [world] = await transaction
    .select()
    .from(worlds)
    .where(eq(worlds.id, input.request.worldId));
  if (!world) {
    return { status: "REJECTED", reasonCode: "KERNEL_INVALID_ACTION" };
  }
  const resolved = await readResidentRuntimeForActor(
    transaction,
    world,
    input.request.actorId,
    false,
  );
  if (!resolved) {
    return { status: "REJECTED", reasonCode: "KERNEL_ACTOR_NOT_FOUND" };
  }
  if (resolved.runtime.currentActivity !== "IDLE") {
    return { status: "REJECTED", reasonCode: "KERNEL_INVALID_ACTION" };
  }

  const fixtures = fixtureById(world.id);
  const source = fixtures.get(resolved.runtime.currentLocationId);
  if (!source) {
    return { status: "REJECTED", reasonCode: "KERNEL_INVALID_LOCATION" };
  }
  let dueAtWorldTime: Date;
  let activity: {
    currentActivity:
      | "TRAVELING"
      | "SLEEPING"
      | "EATING"
      | "WORKING"
      | "TALKING";
    activityTargetLocationId: string | null;
    activityTargetResidentId: string | null;
  };
  let event: WorldEventInput;

  if (
    input.request.actionType === "MOVE" ||
    input.request.actionType === "SLEEP"
  ) {
    const isMove = input.request.actionType === "MOVE";
    const destination = isMove
      ? fixtures.get(input.request.parameters.destinationId)
      : undefined;
    const durationWorldMinutes = isMove
      ? getTravelDurationWorldMinutes(source.kind, destination?.kind ?? "HOME")
      : getSleepDurationWorldMinutes();
    dueAtWorldTime = addWorldMinutes(world.worldTime, durationWorldMinutes);
    activity = {
      currentActivity: isMove ? "TRAVELING" : "SLEEPING",
      activityTargetLocationId: destination?.id ?? null,
      activityTargetResidentId: null,
    };
    event = startEvent({
      request: input.request,
      world,
      runtime: resolved.runtime,
      sourceKind: source.kind,
      ...(destination ? { destinationId: destination.id } : {}),
      dueAtWorldTime,
      durationWorldMinutes,
    });
  } else if (input.request.actionType === "EAT") {
    const [resource] = await transaction
      .select()
      .from(residentResourceStates)
      .where(
        and(
          eq(residentResourceStates.worldId, world.id),
          eq(residentResourceStates.residentId, resolved.residentId),
          eq(residentResourceStates.itemId, input.request.parameters.itemId),
        ),
      )
      .for("update");
    const expectedVersion =
      input.expectedResourceVersion ?? resource?.resourceVersion;
    if (
      !resource ||
      resource.itemId !== input.request.parameters.itemId ||
      resource.locationId !== resolved.runtime.currentLocationId ||
      resource.foodUnits < input.request.parameters.quantity ||
      expectedVersion !== resource.resourceVersion
    ) {
      if (expectedVersion !== resource?.resourceVersion) {
        return { status: "CONFLICT", reasonCode: "KERNEL_CONFLICT" };
      }
      return { status: "REJECTED", reasonCode: "KERNEL_INSUFFICIENT_RESOURCE" };
    }
    const quantity = input.request.parameters.quantity;
    const [consumed] = await transaction
      .update(residentResourceStates)
      .set({
        foodUnits: resource.foodUnits - quantity,
        resourceVersion: resource.resourceVersion + 1,
        updatedAt: world.worldTime,
      })
      .where(
        and(
          eq(residentResourceStates.worldId, world.id),
          eq(residentResourceStates.residentId, resolved.residentId),
          eq(residentResourceStates.itemId, resource.itemId),
          eq(residentResourceStates.foodUnits, resource.foodUnits),
          eq(residentResourceStates.resourceVersion, resource.resourceVersion),
        ),
      )
      .returning();
    if (!consumed) {
      return { status: "CONFLICT", reasonCode: "KERNEL_CONFLICT" };
    }
    dueAtWorldTime = lifecycleDueAt(
      world.worldTime,
      EAT_DURATION_WORLD_MINUTES,
    );
    activity = {
      currentActivity: "EATING",
      activityTargetLocationId: null,
      activityTargetResidentId: null,
    };
    event = {
      id: randomUUID(),
      worldId: world.id,
      type: "RESIDENT_EAT_STARTED",
      actorId: input.request.actorId,
      targetId: resource.itemId,
      payload: {
        schemaVersion: 1,
        actionType: "EAT",
        phase: "STARTED",
        actionRequestId: input.request.id,
        activityInstanceId: input.request.id,
        sourceLocationId: resolved.runtime.currentLocationId,
        itemId: resource.itemId,
        quantity,
        resourceEffect: {
          kind: "FOOD_UNITS_CONSUMED",
          beforeUnits: resource.foodUnits,
          afterUnits: consumed.foodUnits,
          beforeVersion: resource.resourceVersion,
          afterVersion: consumed.resourceVersion,
        },
        startedAtWorldTime: world.worldTime.toISOString(),
        dueAtWorldTime: dueAtWorldTime.toISOString(),
        durationWorldMinutes: EAT_DURATION_WORLD_MINUTES,
        policyVersion: LIFECYCLE_SEMANTICS_POLICY_VERSION,
      },
      occurredAt: world.worldTime,
      correlationId: input.request.id,
    };
  } else if (input.request.actionType === "WORK") {
    const resident = residentSeedByActor(world, input.request.actorId);
    const shift = getWorkShift(world.worldTime);
    if (
      !resident ||
      resident.employment.status !== "EMPLOYED" ||
      resident.employment.workplaceId !==
        input.request.parameters.workplaceId ||
      shift.status !== "DUE" ||
      world.worldTime.toISOString() !== shift.start
    ) {
      return { status: "REJECTED", reasonCode: "KERNEL_INVALID_ACTION" };
    }
    dueAtWorldTime = new Date(shift.end);
    const obligationKey = workObligationKey(resolved.residentId, shift.start);
    activity = {
      currentActivity: "WORKING",
      activityTargetLocationId: null,
      activityTargetResidentId: null,
    };
    event = {
      id: randomUUID(),
      worldId: world.id,
      type: "RESIDENT_WORK_STARTED",
      actorId: input.request.actorId,
      targetId: input.request.parameters.workplaceId,
      payload: {
        schemaVersion: 1,
        actionType: "WORK",
        phase: "STARTED",
        actionRequestId: input.request.id,
        activityInstanceId: input.request.id,
        sourceLocationId: resolved.runtime.currentLocationId,
        workplaceId: input.request.parameters.workplaceId,
        workObligationKey: obligationKey,
        shiftStartsAtWorldTime: shift.start,
        shiftEndsAtWorldTime: shift.end,
        startedAtWorldTime: world.worldTime.toISOString(),
        dueAtWorldTime: dueAtWorldTime.toISOString(),
        durationWorldMinutes: WORK_ATTENDANCE_MINUTES,
        policyVersion: LIFECYCLE_SEMANTICS_POLICY_VERSION,
      },
      occurredAt: world.worldTime,
      correlationId: input.request.id,
    };
  } else {
    const participant = residentSeedByActor(
      world,
      input.request.parameters.participantId,
    );
    if (!participant || participant.residentId === resolved.residentId) {
      return { status: "REJECTED", reasonCode: "KERNEL_ACTOR_NOT_FOUND" };
    }
    const participantRuntime = await readResidentRuntimeById(
      transaction,
      world,
      participant.residentId,
      false,
    );
    if (
      !participantRuntime ||
      participantRuntime.currentActivity !== "IDLE" ||
      participantRuntime.currentLocationId !==
        resolved.runtime.currentLocationId
    ) {
      return { status: "CONFLICT", reasonCode: "KERNEL_CONFLICT" };
    }
    dueAtWorldTime = lifecycleDueAt(
      world.worldTime,
      TALK_DURATION_WORLD_MINUTES,
    );
    activity = {
      currentActivity: "TALKING",
      activityTargetLocationId: null,
      activityTargetResidentId: participant.residentId,
    };
    event = {
      id: randomUUID(),
      worldId: world.id,
      type: "RESIDENT_TALK_STARTED",
      actorId: input.request.actorId,
      targetId: input.request.parameters.participantId,
      payload: {
        schemaVersion: 1,
        actionType: "TALK",
        phase: "STARTED",
        actionRequestId: input.request.id,
        activityInstanceId: input.request.id,
        participantId: participant.actorRef.actorId,
        participantActorId: participant.actorRef.actorId,
        sourceLocationId: resolved.runtime.currentLocationId,
        startedAtWorldTime: world.worldTime.toISOString(),
        dueAtWorldTime: dueAtWorldTime.toISOString(),
        durationWorldMinutes: TALK_DURATION_WORLD_MINUTES,
        policyVersion: LIFECYCLE_SEMANTICS_POLICY_VERSION,
      },
      occurredAt: world.worldTime,
      correlationId: input.request.id,
    };
  }

  return {
    status: "COMMITTED",
    state: {},
    events: [event],
    afterEvents: async (tx, committed) => {
      const targetResidents =
        input.request.actionType === "TALK"
          ? (() => {
              const participant = residentSeedByActor(
                world,
                input.request.parameters.participantId,
              );
              return participant ? [participant.residentId] : [];
            })()
          : [];
      const updates = [resolved.residentId, ...targetResidents];
      for (const residentId of updates) {
        const current =
          residentId === resolved.residentId
            ? resolved.runtime
            : await readResidentRuntimeById(tx, world, residentId, false);
        if (!current) {
          throw new ResidentActionExecutorError(
            "RUNTIME_STATE_UNAVAILABLE",
            "Resident runtime changed before action start could commit",
          );
        }
        const targetResidentId =
          input.request.actionType === "TALK"
            ? residentId === resolved.residentId
              ? (activity.activityTargetResidentId as string)
              : resolved.residentId
            : null;
        const [updated] = await tx
          .update(residentRuntimeStates)
          .set({
            currentActivity: activity.currentActivity,
            activityTargetLocationId: activity.activityTargetLocationId,
            activityTargetResidentId: targetResidentId,
            activityInstanceId: input.request.id,
            activityStartedAtWorldTime: world.worldTime,
            activityDueAtWorldTime: dueAtWorldTime,
            stateVersion: current.stateVersion + 1,
            sourceWorldSeq: committed.world.worldSeq,
            updatedAt: world.worldTime,
          })
          .where(
            and(
              eq(residentRuntimeStates.worldId, world.id),
              eq(residentRuntimeStates.residentId, residentId),
              eq(residentRuntimeStates.currentActivity, "IDLE"),
              eq(residentRuntimeStates.stateVersion, current.stateVersion),
            ),
          )
          .returning();
        if (!updated) {
          throw new ResidentActionExecutorError(
            "RUNTIME_STATE_UNAVAILABLE",
            "Resident runtime changed before action start could commit",
          );
        }
      }
    },
  };
}

export function executeResidentActionRequest(
  database: ResidentActionDatabase,
  input: ExecuteResidentActionInput,
) {
  if (!isResidentAction(input.request)) {
    throw new ResidentActionExecutorError(
      "ACTION_NOT_SUPPORTED",
      "Resident lifecycle executor does not execute BUY",
    );
  }
  return executeKernelActionRequest(database, {
    request: input.request,
    validationContext: input.validationContext,
    validateInTransaction: (transaction) =>
      validateResidentActionInTransaction(transaction, input),
    execute: (transaction) => buildStartExecution(transaction, input),
  });
}

function legacyCompletionEvent(input: {
  request: Extract<ActionRequest, { actionType: "MOVE" | "SLEEP" }>;
  world: typeof worlds.$inferSelect;
  runtime: typeof residentRuntimeStates.$inferSelect;
  destinationId?: string;
  durationWorldMinutes: number;
}): WorldEventInput {
  const isMove = input.request.actionType === "MOVE";
  return {
    id: randomUUID(),
    worldId: input.world.id,
    type: isMove ? "RESIDENT_MOVE_COMPLETED" : "RESIDENT_SLEEP_COMPLETED",
    actorId: input.request.actorId,
    ...(input.destinationId ? { targetId: input.destinationId } : {}),
    payload: {
      schemaVersion: 1,
      actionType: input.request.actionType,
      phase: "COMPLETED",
      actionRequestId: input.request.id,
      activityInstanceId: input.request.id,
      sourceLocationId: input.runtime.currentLocationId,
      ...(input.destinationId ? { destinationId: input.destinationId } : {}),
      startedAtWorldTime:
        input.runtime.activityStartedAtWorldTime?.toISOString(),
      dueAtWorldTime: input.runtime.activityDueAtWorldTime?.toISOString(),
      completedAtWorldTime: input.world.worldTime.toISOString(),
      durationWorldMinutes: input.durationWorldMinutes,
      policyVersion: ACTION_SEMANTICS_POLICY_VERSION,
      ...(isMove
        ? {}
        : {
            restAnchorTransition: {
              fromActivity: "RESTING",
              toActivity: "AWAKE",
              worldTime: input.world.worldTime.toISOString(),
            },
          }),
    },
    occurredAt: input.world.worldTime,
    correlationId: input.request.id,
  };
}

function lifecycleCompletionEvent(input: {
  request: Extract<ActionRequest, { actionType: "EAT" | "WORK" | "TALK" }>;
  world: typeof worlds.$inferSelect;
  runtime: typeof residentRuntimeStates.$inferSelect;
  participant?: ReturnType<typeof residentSeedByActor>;
}): WorldEventInput {
  const isEat = input.request.actionType === "EAT";
  const isWork = input.request.actionType === "WORK";
  const participant = input.participant;
  const eatParameters =
    input.request.actionType === "EAT" ? input.request.parameters : undefined;
  const workParameters =
    input.request.actionType === "WORK" ? input.request.parameters : undefined;
  const type = isEat
    ? "RESIDENT_EAT_COMPLETED"
    : isWork
      ? "RESIDENT_WORK_COMPLETED"
      : "RESIDENT_TALK_COMPLETED";
  const payload = {
    schemaVersion: 1,
    actionType: input.request.actionType,
    phase: "COMPLETED",
    actionRequestId: input.request.id,
    activityInstanceId: input.request.id,
    sourceLocationId: input.runtime.currentLocationId,
    startedAtWorldTime: input.runtime.activityStartedAtWorldTime?.toISOString(),
    dueAtWorldTime: input.runtime.activityDueAtWorldTime?.toISOString(),
    completedAtWorldTime: input.world.worldTime.toISOString(),
    durationWorldMinutes: isEat
      ? EAT_DURATION_WORLD_MINUTES
      : isWork
        ? WORK_ATTENDANCE_MINUTES
        : TALK_DURATION_WORLD_MINUTES,
    policyVersion: LIFECYCLE_SEMANTICS_POLICY_VERSION,
    ...(isEat
      ? {
          itemId: eatParameters!.itemId,
          quantity: eatParameters!.quantity,
          needEffect: {
            policyVersion: NEED_EFFECTS_POLICY_VERSION,
            kind: "HUNGER_PRESSURE_RELIEF",
            quantity: eatParameters!.quantity,
            reliefPoints: 55 * eatParameters!.quantity,
          },
        }
      : {}),
    ...(isWork
      ? {
          workplaceId: workParameters!.workplaceId,
          workObligationKey: workObligationKey(
            residentSeedByActor(input.world, input.request.actorId)
              ?.residentId ?? "",
            input.runtime.activityStartedAtWorldTime?.toISOString() ?? "",
          ),
          shiftStartsAtWorldTime:
            input.runtime.activityStartedAtWorldTime?.toISOString(),
          shiftEndsAtWorldTime:
            input.runtime.activityDueAtWorldTime?.toISOString(),
          attendanceMinutes: WORK_ATTENDANCE_MINUTES,
        }
      : {}),
    ...(participant
      ? {
          participantActorId: participant.actorRef.actorId,
          participantId: participant.actorRef.actorId,
          needEffect: {
            kind: "SOCIAL_PRESSURE_RELIEF",
            policyVersion: NEED_EFFECTS_POLICY_VERSION,
            reliefPoints: 35,
          },
        }
      : {}),
  };
  const targetId = isWork
    ? workParameters!.workplaceId
    : participant?.actorRef.actorId;
  return {
    id: randomUUID(),
    worldId: input.world.id,
    type,
    actorId: input.request.actorId,
    ...(targetId ? { targetId } : {}),
    payload,
    occurredAt: input.world.worldTime,
    correlationId: input.request.id,
  };
}

export async function completeResidentAction(
  database: ResidentActionDatabase,
  input: CompleteResidentActionInput,
): Promise<ResidentActionCompletionResult> {
  return database.transaction(async (transaction) => {
    if (input.fenceToken !== undefined) {
      await assertSimulationDriverFenceInTransaction(transaction, {
        worldId: input.worldId,
        fenceToken: input.fenceToken,
      });
    }
    const [world] = await transaction
      .select()
      .from(worlds)
      .where(eq(worlds.id, input.worldId))
      .for("update");
    if (!world) {
      throw new ResidentActionExecutorError(
        "WORLD_NOT_FOUND",
        `World ${input.worldId} was not found`,
      );
    }
    const [requestRow] = await transaction
      .select()
      .from(actionRequests)
      .where(
        and(
          eq(actionRequests.id, input.actionRequestId),
          eq(actionRequests.worldId, input.worldId),
        ),
      );
    if (!requestRow) {
      throw new ResidentActionExecutorError(
        "ACTION_REQUEST_NOT_FOUND",
        `Resident action request ${input.actionRequestId} was not found`,
      );
    }
    const request = requestRow.payload as ActionRequest;
    if (!isResidentAction(request)) {
      throw new ResidentActionExecutorError(
        "ACTION_NOT_SUPPORTED",
        "BUY completion is not executable in M3",
      );
    }
    const outcome = await findKernelActionOutcomeInTransaction(transaction, {
      requestId: request.id,
      worldId: world.id,
    });
    if (!outcome || outcome.status !== "COMMITTED") {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "A completion requires an existing committed start outcome",
      );
    }

    const actorSeed = residentSeedByActor(world, request.actorId);
    if (!actorSeed) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Resident actor could not be resolved for completion",
      );
    }
    const participantSeed =
      request.actionType === "TALK"
        ? residentSeedByActor(world, request.parameters.participantId)
        : undefined;
    if (request.actionType === "TALK" && !participantSeed) {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "TALK completion requires a resolvable participant",
      );
    }
    const runtimeRows =
      participantSeed && participantSeed.residentId !== actorSeed.residentId
        ? await lockResidentRuntimePair(transaction, world, [
            actorSeed.residentId,
            participantSeed.residentId,
          ])
        : new Map([
            [
              actorSeed.residentId,
              (await readResidentRuntimeById(
                transaction,
                world,
                actorSeed.residentId,
                true,
              )) as typeof residentRuntimeStates.$inferSelect,
            ],
          ]);
    const resolvedRuntime = runtimeRows.get(actorSeed.residentId);
    if (!resolvedRuntime) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Resident runtime state was not found for completion",
      );
    }
    const activity = runtimeActivity(resolvedRuntime);
    if (activity.kind === "IDLE") {
      const participantIdle = participantSeed
        ? runtimeRows.get(participantSeed.residentId)?.currentActivity ===
          "IDLE"
        : true;
      if (outcome.eventCount > 1 && participantIdle) {
        return { disposition: "REUSED", outcome };
      }
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "Runtime is idle before the action completion event exists",
      );
    }
    const expectedActivity =
      request.actionType === "MOVE"
        ? "TRAVELING"
        : request.actionType === "SLEEP"
          ? "SLEEPING"
          : request.actionType === "EAT"
            ? "EATING"
            : request.actionType === "WORK"
              ? "WORKING"
              : "TALKING";
    if (
      activity.kind !== expectedActivity ||
      activity.activityInstanceId !== request.id
    ) {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "Runtime activity does not belong to this action request",
      );
    }
    if (
      input.expectedStateVersion !== undefined &&
      resolvedRuntime.stateVersion !== input.expectedStateVersion
    ) {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "Resident runtime state changed after the due work item was read",
      );
    }
    if (participantSeed) {
      const participantRuntime = runtimeRows.get(participantSeed.residentId);
      if (
        !participantRuntime ||
        participantRuntime.currentActivity !== "TALKING" ||
        participantRuntime.activityInstanceId !== request.id ||
        participantRuntime.activityTargetResidentId !== actorSeed.residentId ||
        activity.kind !== "TALKING" ||
        activity.targetResidentId !== participantSeed.residentId ||
        participantRuntime.currentLocationId !==
          resolvedRuntime.currentLocationId
      ) {
        throw new ResidentActionExecutorError(
          "INVALID_COMPLETION",
          "TALK completion requires an intact reciprocal pair",
        );
      }
    }
    if (request.actionType === "WORK") {
      const startedAtWorldTime = resolvedRuntime.activityStartedAtWorldTime;
      const dueAtWorldTime = resolvedRuntime.activityDueAtWorldTime;
      const shift = startedAtWorldTime
        ? getWorkShift(startedAtWorldTime)
        : null;
      const obligationKey = startedAtWorldTime
        ? workObligationKey(
            actorSeed.residentId,
            startedAtWorldTime.toISOString(),
          )
        : null;
      if (
        !startedAtWorldTime ||
        !shift ||
        !dueAtWorldTime ||
        actorSeed.employment.status !== "EMPLOYED" ||
        actorSeed.employment.workplaceId !== request.parameters.workplaceId ||
        resolvedRuntime.currentLocationId !== request.parameters.workplaceId ||
        shift.start !== startedAtWorldTime.toISOString() ||
        shift.end !== dueAtWorldTime.toISOString() ||
        !obligationKey ||
        completedWorkShiftKeys(resolvedRuntime).includes(obligationKey)
      ) {
        throw new ResidentActionExecutorError(
          "INVALID_COMPLETION",
          "WORK completion requires the original workplace and obligation",
        );
      }
    }
    if (world.status !== "RUNNING") {
      return {
        disposition: "REJECTED",
        reasonCode: "WORLD_NOT_RUNNING",
        outcome,
      };
    }
    if (
      world.worldTime.getTime() < new Date(activity.dueAtWorldTime).getTime()
    ) {
      return { disposition: "NOT_DUE", outcome };
    }

    const fixtures = fixtureById(world.id);
    const source = fixtures.get(resolvedRuntime.currentLocationId);
    const destinationId =
      activity.kind === "TRAVELING" ? activity.targetLocationId : undefined;
    const destination = destinationId ? fixtures.get(destinationId) : source;
    if (!source || !destination) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Completion references an invalid semantic location",
      );
    }
    const event =
      request.actionType === "MOVE" || request.actionType === "SLEEP"
        ? legacyCompletionEvent({
            request,
            world,
            runtime: resolvedRuntime,
            ...(destinationId ? { destinationId } : {}),
            durationWorldMinutes:
              request.actionType === "MOVE"
                ? getTravelDurationWorldMinutes(source.kind, destination.kind)
                : getSleepDurationWorldMinutes(),
          })
        : lifecycleCompletionEvent({
            request,
            world,
            runtime: resolvedRuntime,
            ...(participantSeed ? { participant: participantSeed } : {}),
          });
    const completedOutcome = await appendKernelActionOutcomeEventsInTransaction(
      transaction,
      { requestId: request.id, worldId: world.id, state: {}, events: [event] },
    );
    if (completedOutcome.worldSeqEnd === null) {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "Completed action outcome is missing its world sequence",
      );
    }

    const participantRuntime = participantSeed
      ? runtimeRows.get(participantSeed.residentId)
      : undefined;
    type RuntimeEntry = readonly [
      string,
      typeof residentRuntimeStates.$inferSelect,
    ];
    const updates: RuntimeEntry[] = [[actorSeed.residentId, resolvedRuntime]];
    if (participantRuntime && participantSeed) {
      updates.push([participantSeed.residentId, participantRuntime]);
    }
    for (const [residentId, current] of updates) {
      const isParticipant = residentId === participantSeed?.residentId;
      const keys = completedWorkShiftKeys(current);
      const shiftKey =
        request.actionType === "WORK"
          ? workObligationKey(
              actorSeed.residentId,
              current.activityStartedAtWorldTime?.toISOString() ?? "",
            )
          : undefined;
      const nextKeys =
        shiftKey && !keys.includes(shiftKey) ? [...keys, shiftKey] : keys;
      const [updated] = await transaction
        .update(residentRuntimeStates)
        .set({
          currentLocationId:
            !isParticipant && destinationId
              ? destination.id
              : current.currentLocationId,
          currentActivity: "IDLE",
          activityInstanceId: null,
          activityTargetLocationId: null,
          activityTargetResidentId: null,
          activityStartedAtWorldTime: null,
          activityDueAtWorldTime: null,
          ...(request.actionType === "EAT" && !isParticipant
            ? { lastAteAtWorldTime: world.worldTime }
            : {}),
          ...(request.actionType === "TALK"
            ? { lastSocialContactAtWorldTime: world.worldTime }
            : {}),
          ...(request.actionType === "WORK" && !isParticipant
            ? { completedWorkShiftKeys: nextKeys }
            : {}),
          stateVersion: current.stateVersion + 1,
          sourceWorldSeq: BigInt(completedOutcome.worldSeqEnd),
          updatedAt: world.worldTime,
        })
        .where(
          and(
            eq(residentRuntimeStates.worldId, world.id),
            eq(residentRuntimeStates.residentId, residentId),
            eq(residentRuntimeStates.stateVersion, current.stateVersion),
            eq(residentRuntimeStates.activityInstanceId, request.id),
          ),
        )
        .returning();
      if (!updated) {
        throw new ResidentActionExecutorError(
          "RUNTIME_STATE_UNAVAILABLE",
          "Resident runtime changed before action completion could commit",
        );
      }
      if (request.actionType === "WORK" && !isParticipant) {
        await registerNextWorkBoundaryWakeInTransaction(transaction, {
          worldId: world.id,
          worldSeed: world.seed,
          worldTime: world.worldTime,
          sourceWorldSeq: BigInt(completedOutcome.worldSeqEnd),
          residentId,
          sourceStateVersion: current.stateVersion + 1,
        });
      }
    }
    return { disposition: "EXECUTED", outcome: completedOutcome };
  });
}
