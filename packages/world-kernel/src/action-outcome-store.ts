import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  createDb,
  kernelActionOutcomeEvents,
  kernelActionOutcomes,
  worldEvents,
} from "@mirror/db";
import {
  parseKernelActionOutcome,
  type ActionRequest,
  type KernelActionOutcome,
  type KernelActionRejectionReasonCode,
} from "@mirror/contracts";
import {
  ensureActionRequestInTransaction,
  type ActionRequestEnsureResult,
} from "./action-request-store.js";
import {
  validateActionRequest,
  type ActionValidationContext,
  type ActionValidationResult,
  type KernelReasonCode,
} from "./action-validator.js";
import {
  commitWorldStateWithEventsInTransaction,
  type WorldEventCommitResult,
  type WorldEventInput,
  type WorldKernelTransaction,
  type WorldStatePatch,
} from "./world-events-store.js";

export type ActionOutcomeDatabase = ReturnType<typeof createDb>["db"];

export type KernelActionExecution =
  | {
      status: "COMMITTED";
      state: WorldStatePatch;
      events: readonly WorldEventInput[];
      afterEvents?: (
        transaction: WorldKernelTransaction,
        committed: WorldEventCommitResult,
      ) => void | Promise<void>;
    }
  | {
      status: "REJECTED";
      reasonCode: KernelActionRejectionReasonCode;
    }
  | { status: "CONFLICT"; reasonCode: "KERNEL_CONFLICT" };

export type ExecuteKernelActionRequestInput = {
  request: ActionRequest;
  validationContext: ActionValidationContext;
  validateInTransaction?: (
    transaction: WorldKernelTransaction,
  ) => ActionValidationResult | Promise<ActionValidationResult>;
  execute: (
    transaction: WorldKernelTransaction,
  ) => KernelActionExecution | Promise<KernelActionExecution>;
};

export type KernelActionRequestExecutionResult =
  | {
      disposition: "EXECUTED" | "REUSED";
      requestId: string;
      outcome: KernelActionOutcome;
    }
  | {
      disposition: "IDEMPOTENCY_CONFLICT";
      requestId: string;
      outcome: null;
    };

export class KernelActionOutcomeStoreError extends Error {
  constructor(
    public readonly code: "OUTCOME_INVALID" | "OUTCOME_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "KernelActionOutcomeStoreError";
  }
}

function isConflict(
  reasonCode: KernelReasonCode,
): reasonCode is "KERNEL_CONFLICT" {
  return reasonCode === "KERNEL_CONFLICT";
}

function outcomeInput(
  outcome: typeof kernelActionOutcomes.$inferSelect,
  eventRefs: Array<{
    eventId: string;
    eventIndex: number;
    worldId: string;
    seq: bigint;
    type: string;
  }>,
): Parameters<typeof parseKernelActionOutcome>[0] {
  const base = {
    outcomeId: outcome.id,
    requestId: outcome.actionRequestId,
    worldId: outcome.worldId,
    recordedAt: outcome.recordedAt.toISOString(),
  };

  if (outcome.status === "COMMITTED") {
    if (outcome.worldSeqStart === null || outcome.worldSeqEnd === null) {
      throw new KernelActionOutcomeStoreError(
        "OUTCOME_INVALID",
        "Committed kernel action outcome is missing its world sequence range",
      );
    }
    return {
      ...base,
      status: "COMMITTED",
      reasonCode: null,
      eventCount: outcome.eventCount,
      eventRefs: eventRefs.map((event) => ({
        eventId: event.eventId,
        eventIndex: event.eventIndex,
        worldId: event.worldId,
        seq: event.seq.toString(),
        type: event.type,
      })),
      worldSeqStart: outcome.worldSeqStart.toString(),
      worldSeqEnd: outcome.worldSeqEnd.toString(),
    };
  }

  return {
    ...base,
    status: outcome.status,
    reasonCode: outcome.reasonCode,
    eventCount: 0,
    eventRefs: [],
    worldSeqStart: null,
    worldSeqEnd: null,
  };
}

export async function findKernelActionOutcomeInTransaction(
  transaction: WorldKernelTransaction,
  input: { requestId: string; worldId: string },
): Promise<KernelActionOutcome | null> {
  const [outcome] = await transaction
    .select()
    .from(kernelActionOutcomes)
    .where(
      and(
        eq(kernelActionOutcomes.actionRequestId, input.requestId),
        eq(kernelActionOutcomes.worldId, input.worldId),
      ),
    );

  if (!outcome) return null;

  const eventRefs = await transaction
    .select({
      eventId: kernelActionOutcomeEvents.eventId,
      eventIndex: kernelActionOutcomeEvents.eventIndex,
      worldId: kernelActionOutcomeEvents.worldId,
      seq: kernelActionOutcomeEvents.eventSeq,
      type: worldEvents.type,
    })
    .from(kernelActionOutcomeEvents)
    .innerJoin(
      worldEvents,
      and(
        eq(kernelActionOutcomeEvents.eventId, worldEvents.id),
        eq(kernelActionOutcomeEvents.worldId, worldEvents.worldId),
      ),
    )
    .where(eq(kernelActionOutcomeEvents.outcomeId, outcome.id))
    .orderBy(asc(kernelActionOutcomeEvents.eventIndex));

  return parseKernelActionOutcome(outcomeInput(outcome, eventRefs));
}

async function persistOutcomeInTransaction(
  transaction: WorldKernelTransaction,
  input: {
    requestId: string;
    worldId: string;
    execution: KernelActionExecution;
  },
): Promise<KernelActionOutcome> {
  const outcomeId = randomUUID();
  let persistedEvents: Array<typeof worldEvents.$inferSelect> = [];

  if (input.execution.status === "COMMITTED") {
    const committed = await commitWorldStateWithEventsInTransaction(
      transaction,
      {
        worldId: input.worldId,
        state: input.execution.state,
        events: input.execution.events,
      },
    );
    persistedEvents = committed.events;
    if (input.execution.afterEvents) {
      await input.execution.afterEvents(transaction, committed);
    }
  }

  const reasonCode =
    input.execution.status === "COMMITTED" ? null : input.execution.reasonCode;
  const [outcome] = await transaction
    .insert(kernelActionOutcomes)
    .values({
      id: outcomeId,
      actionRequestId: input.requestId,
      worldId: input.worldId,
      status: input.execution.status,
      reasonCode,
      eventCount: persistedEvents.length,
      worldSeqStart: persistedEvents[0]?.seq,
      worldSeqEnd: persistedEvents.at(-1)?.seq,
    })
    .returning();

  if (!outcome) {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_INVALID",
      "Kernel action outcome could not be persisted",
    );
  }

  if (persistedEvents.length > 0) {
    await transaction.insert(kernelActionOutcomeEvents).values(
      persistedEvents.map((event, eventIndex) => ({
        outcomeId: outcome.id,
        worldId: input.worldId,
        eventId: event.id,
        eventIndex,
        eventSeq: event.seq,
      })),
    );
  }

  return parseKernelActionOutcome(
    outcomeInput(
      outcome,
      persistedEvents.map((event, eventIndex) => ({
        eventId: event.id,
        eventIndex,
        worldId: event.worldId,
        seq: event.seq,
        type: event.type,
      })),
    ),
  );
}

function outcomeForValidationFailure(
  reasonCode: KernelReasonCode,
): KernelActionExecution {
  if (isConflict(reasonCode)) {
    return { status: "CONFLICT", reasonCode };
  }
  if (reasonCode === "KERNEL_DUPLICATE_REQUEST") {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_INVALID",
      "Duplicate request disposition cannot become a durable kernel outcome",
    );
  }
  return { status: "REJECTED", reasonCode };
}

function resultForRequestState(
  requestState: ActionRequestEnsureResult,
  outcome: KernelActionOutcome | null,
): KernelActionRequestExecutionResult {
  if (requestState.status === "conflict") {
    return {
      disposition: "IDEMPOTENCY_CONFLICT",
      requestId: requestState.requestId,
      outcome: null,
    };
  }
  if (!outcome) {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_NOT_FOUND",
      "An existing action request has no durable kernel outcome",
    );
  }
  return {
    disposition: requestState.status === "duplicate" ? "REUSED" : "EXECUTED",
    requestId: requestState.requestId,
    outcome,
  };
}

export async function executeKernelActionRequest(
  database: ActionOutcomeDatabase,
  input: ExecuteKernelActionRequestInput,
): Promise<KernelActionRequestExecutionResult> {
  const validation = input.validateInTransaction
    ? null
    : validateActionRequest(input.request, input.validationContext);

  return database.transaction(async (transaction) => {
    const requestState = await ensureActionRequestInTransaction(
      transaction,
      input.request,
    );
    const existingOutcome = await findKernelActionOutcomeInTransaction(
      transaction,
      { requestId: requestState.requestId, worldId: input.request.worldId },
    );

    if (existingOutcome || requestState.status === "conflict") {
      return resultForRequestState(requestState, existingOutcome);
    }

    const resolvedValidation = input.validateInTransaction
      ? await input.validateInTransaction(transaction)
      : validation;
    if (!resolvedValidation) {
      throw new KernelActionOutcomeStoreError(
        "OUTCOME_INVALID",
        "Kernel action validation did not produce a result",
      );
    }
    const execution = resolvedValidation.accepted
      ? await input.execute(transaction)
      : outcomeForValidationFailure(resolvedValidation.reasonCode);
    const outcome = await persistOutcomeInTransaction(transaction, {
      requestId: requestState.requestId,
      worldId: input.request.worldId,
      execution,
    });

    return {
      disposition: "EXECUTED",
      requestId: requestState.requestId,
      outcome,
    };
  });
}

export async function appendKernelActionOutcomeEventsInTransaction(
  transaction: WorldKernelTransaction,
  input: {
    requestId: string;
    worldId: string;
    state: WorldStatePatch;
    events: readonly WorldEventInput[];
  },
): Promise<KernelActionOutcome> {
  if (input.events.length === 0) {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_INVALID",
      "At least one completion event is required",
    );
  }

  const [existingOutcome] = await transaction
    .select()
    .from(kernelActionOutcomes)
    .where(
      and(
        eq(kernelActionOutcomes.actionRequestId, input.requestId),
        eq(kernelActionOutcomes.worldId, input.worldId),
      ),
    );
  if (!existingOutcome) {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_NOT_FOUND",
      "A resident activity has no durable kernel action outcome",
    );
  }
  if (existingOutcome.status !== "COMMITTED") {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_INVALID",
      "Only a committed action can receive completion events",
    );
  }

  const committed = await commitWorldStateWithEventsInTransaction(transaction, {
    worldId: input.worldId,
    state: input.state,
    events: input.events,
  });
  const [lockedOutcome] = await transaction
    .select()
    .from(kernelActionOutcomes)
    .where(eq(kernelActionOutcomes.id, existingOutcome.id))
    .for("update");
  if (!lockedOutcome) {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_NOT_FOUND",
      "Kernel action outcome disappeared during completion",
    );
  }

  const startIndex = lockedOutcome.eventCount;
  await transaction.insert(kernelActionOutcomeEvents).values(
    committed.events.map((event, eventIndex) => ({
      outcomeId: lockedOutcome.id,
      worldId: input.worldId,
      eventId: event.id,
      eventIndex: startIndex + eventIndex,
      eventSeq: event.seq,
    })),
  );
  const [updatedOutcome] = await transaction
    .update(kernelActionOutcomes)
    .set({
      eventCount: startIndex + committed.events.length,
      worldSeqStart: lockedOutcome.worldSeqStart ?? committed.events[0].seq,
      worldSeqEnd: committed.events.at(-1)?.seq,
    })
    .where(eq(kernelActionOutcomes.id, lockedOutcome.id))
    .returning();
  if (!updatedOutcome) {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_INVALID",
      "Completed kernel action outcome could not be updated",
    );
  }

  const outcome = await findKernelActionOutcomeInTransaction(transaction, {
    requestId: input.requestId,
    worldId: input.worldId,
  });
  if (!outcome) {
    throw new KernelActionOutcomeStoreError(
      "OUTCOME_NOT_FOUND",
      "Completed kernel action outcome could not be read",
    );
  }
  return outcome;
}

export async function findKernelActionOutcome(
  database: ActionOutcomeDatabase,
  input: { requestId: string; worldId: string },
): Promise<KernelActionOutcome | null> {
  return database.transaction((transaction) =>
    findKernelActionOutcomeInTransaction(transaction, input),
  );
}
