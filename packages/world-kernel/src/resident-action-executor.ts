import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  assertSimulationDriverFenceInTransaction,
  actionRequests,
  createDb,
  generateResidentSeed,
  getFirstStreetLocationFixtures,
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
  type ActionValidationContext,
  type ActionValidationResult,
} from "./action-validator.js";
import {
  ACTION_SEMANTICS_POLICY_VERSION,
  addWorldMinutes,
  getSleepDurationWorldMinutes,
  getTravelDurationWorldMinutes,
} from "./action-semantics.js";
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

function isResidentAction(
  request: ActionRequest,
): request is Extract<ActionRequest, { actionType: "MOVE" | "SLEEP" }> {
  return request.actionType === "MOVE" || request.actionType === "SLEEP";
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

  const resolved = await readResidentRuntimeForActor(
    transaction,
    world,
    input.request.actorId,
    true,
  );
  if (!resolved) {
    return { accepted: false, reasonCode: "KERNEL_ACTOR_NOT_FOUND" };
  }

  const locations = fixtureById(world.id);
  const currentLocation = locations.get(resolved.runtime.currentLocationId);
  if (!currentLocation) {
    return { accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" };
  }
  const context = replaceActorRuntimeSnapshot(
    input.validationContext,
    input.request,
    world,
    resolved.runtime,
  );
  const validation = validateActionRequest(input.request, context);
  if (!validation.accepted) return validation;
  if (resolved.runtime.currentActivity !== "IDLE") {
    return { accepted: false, reasonCode: "KERNEL_INVALID_ACTION" };
  }

  if (input.request.actionType === "MOVE") {
    const destination = locations.get(input.request.parameters.destinationId);
    if (!destination) {
      return { accepted: false, reasonCode: "KERNEL_INVALID_LOCATION" };
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
  const isMove = input.request.actionType === "MOVE";
  const destination = isMove
    ? fixtures.get(input.request.parameters.destinationId)
    : undefined;
  const durationWorldMinutes = isMove
    ? getTravelDurationWorldMinutes(source.kind, destination?.kind ?? "HOME")
    : getSleepDurationWorldMinutes();
  const dueAtWorldTime = addWorldMinutes(world.worldTime, durationWorldMinutes);
  const activity = isMove
    ? {
        currentActivity: "TRAVELING",
        activityTargetLocationId: destination?.id ?? null,
      }
    : {
        currentActivity: "SLEEPING",
        activityTargetLocationId: null,
      };
  const event = startEvent({
    request: input.request,
    world,
    runtime: resolved.runtime,
    sourceKind: source.kind,
    ...(destination ? { destinationId: destination.id } : {}),
    dueAtWorldTime,
    durationWorldMinutes,
  });

  return {
    status: "COMMITTED",
    state: {},
    events: [event],
    afterEvents: async (tx, committed) => {
      const [updated] = await tx
        .update(residentRuntimeStates)
        .set({
          ...activity,
          activityInstanceId: input.request.id,
          activityStartedAtWorldTime: world.worldTime,
          activityDueAtWorldTime: dueAtWorldTime,
          stateVersion: resolved.runtime.stateVersion + 1,
          sourceWorldSeq: committed.world.worldSeq,
          updatedAt: world.worldTime,
        })
        .where(
          and(
            eq(residentRuntimeStates.worldId, world.id),
            eq(residentRuntimeStates.residentId, resolved.residentId),
            eq(residentRuntimeStates.currentActivity, "IDLE"),
            eq(
              residentRuntimeStates.stateVersion,
              resolved.runtime.stateVersion,
            ),
          ),
        )
        .returning();
      if (!updated) {
        throw new ResidentActionExecutorError(
          "RUNTIME_STATE_UNAVAILABLE",
          "Resident runtime changed before action start could commit",
        );
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
      "PRE-AL-05 only executes MOVE and SLEEP",
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

function completionEvent(input: {
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
    if (
      !requestRow ||
      (requestRow.actionType !== "MOVE" && requestRow.actionType !== "SLEEP")
    ) {
      throw new ResidentActionExecutorError(
        "ACTION_REQUEST_NOT_FOUND",
        `MOVE/SLEEP action request ${input.actionRequestId} was not found`,
      );
    }
    const request = requestRow.payload as ActionRequest;
    if (!isResidentAction(request)) {
      throw new ResidentActionExecutorError(
        "ACTION_NOT_SUPPORTED",
        "Completion request is not a MOVE or SLEEP action",
      );
    }

    const outcome = await findKernelActionOutcomeInTransaction(transaction, {
      requestId: request.id,
      worldId: world.id,
    });
    if (!outcome) {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "A MOVE/SLEEP completion requires an existing committed start outcome",
      );
    }

    const resolved = await readResidentRuntimeForActor(
      transaction,
      world,
      request.actorId,
      true,
    );
    if (!resolved) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Resident runtime state was not found for completion",
      );
    }
    const activity = runtimeActivity(resolved.runtime);
    if (activity.kind === "IDLE") {
      if (outcome.eventCount > 1) {
        return { disposition: "REUSED", outcome };
      }
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "Runtime is idle before the action completion event exists",
      );
    }
    const expectedActivity =
      request.actionType === "MOVE" ? "TRAVELING" : "SLEEPING";
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
      resolved.runtime.stateVersion !== input.expectedStateVersion
    ) {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "Resident runtime state changed after the due work item was read",
      );
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
    const source = fixtures.get(resolved.runtime.currentLocationId);
    const destinationId =
      activity.kind === "TRAVELING" ? activity.targetLocationId : undefined;
    const destination = destinationId ? fixtures.get(destinationId) : source;
    if (!source || !destination) {
      throw new ResidentActionExecutorError(
        "RUNTIME_STATE_UNAVAILABLE",
        "Completion references an invalid semantic location",
      );
    }
    const durationWorldMinutes =
      request.actionType === "MOVE"
        ? getTravelDurationWorldMinutes(source.kind, destination.kind)
        : getSleepDurationWorldMinutes();
    const completedOutcome = await appendKernelActionOutcomeEventsInTransaction(
      transaction,
      {
        requestId: request.id,
        worldId: world.id,
        state: {},
        events: [
          completionEvent({
            request,
            world,
            runtime: resolved.runtime,
            ...(destinationId ? { destinationId } : {}),
            durationWorldMinutes,
          }),
        ],
      },
    );
    if (completedOutcome.worldSeqEnd === null) {
      throw new ResidentActionExecutorError(
        "INVALID_COMPLETION",
        "Completed action outcome is missing its world sequence",
      );
    }
    const [updated] = await transaction
      .update(residentRuntimeStates)
      .set({
        currentLocationId: destination.id,
        currentActivity: "IDLE",
        activityInstanceId: null,
        activityTargetLocationId: null,
        activityStartedAtWorldTime: null,
        activityDueAtWorldTime: null,
        stateVersion: resolved.runtime.stateVersion + 1,
        sourceWorldSeq: BigInt(completedOutcome.worldSeqEnd),
        updatedAt: world.worldTime,
      })
      .where(
        and(
          eq(residentRuntimeStates.worldId, world.id),
          eq(residentRuntimeStates.residentId, resolved.residentId),
          eq(residentRuntimeStates.stateVersion, resolved.runtime.stateVersion),
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
    return { disposition: "EXECUTED", outcome: completedOutcome };
  });
}
