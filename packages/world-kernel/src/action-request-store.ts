import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { actionRequests, createDb } from "@mirror/db";
import type { ActionRequest } from "@mirror/contracts";
import type { ActionValidationSuccess } from "./action-validator.js";
import type { WorldKernelTransaction } from "./world-events-store.js";

export type ActionRequestDatabase = ReturnType<typeof createDb>["db"];

export type ActionRequestPersistenceResult =
  | { status: "accepted"; requestId: string }
  | {
      status: "duplicate";
      requestId: string;
      reasonCode: "KERNEL_DUPLICATE_REQUEST";
    }
  | { status: "conflict"; requestId: string; reasonCode: "KERNEL_CONFLICT" };

export type ActionRequestEnsureResult =
  | { status: "accepted"; requestId: string }
  | { status: "duplicate"; requestId: string }
  | { status: "conflict"; requestId: string };

export class ActionRequestStoreError extends Error {
  constructor(
    public readonly code: "ACTION_REQUEST_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "ActionRequestStoreError";
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function actionRequestFingerprint(request: ActionRequest): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(request)))
    .digest("hex");
}

export async function ensureActionRequestInTransaction(
  transaction: WorldKernelTransaction,
  request: ActionRequest,
): Promise<ActionRequestEnsureResult> {
  const fingerprint = actionRequestFingerprint(request);
  const [inserted] = await transaction
    .insert(actionRequests)
    .values({
      id: request.id,
      worldId: request.worldId,
      actorId: request.actorId,
      actionType: request.actionType,
      requestedBy: request.requestedBy,
      idempotencyKey: request.idempotencyKey,
      expectedActorVersion: request.expectedActorVersion,
      requestedAtWorldTime: new Date(request.requestedAtWorldTime),
      traceId: request.traceId,
      requestFingerprint: fingerprint,
      payload: request,
    })
    .onConflictDoNothing()
    .returning({ id: actionRequests.id });

  if (inserted) {
    return { status: "accepted", requestId: inserted.id };
  }

  const [existingByKey] = await transaction
    .select({
      id: actionRequests.id,
      requestFingerprint: actionRequests.requestFingerprint,
    })
    .from(actionRequests)
    .where(
      and(
        eq(actionRequests.worldId, request.worldId),
        eq(actionRequests.idempotencyKey, request.idempotencyKey),
      ),
    )
    .for("update");

  if (!existingByKey) {
    const [existingById] = await transaction
      .select({ id: actionRequests.id })
      .from(actionRequests)
      .where(eq(actionRequests.id, request.id))
      .for("update");

    if (existingById) {
      return { status: "conflict", requestId: existingById.id };
    }

    throw new ActionRequestStoreError(
      "ACTION_REQUEST_NOT_FOUND",
      "Conflicting action request could not be located",
    );
  }

  return existingByKey.requestFingerprint === fingerprint
    ? { status: "duplicate", requestId: existingByKey.id }
    : { status: "conflict", requestId: existingByKey.id };
}

export async function persistValidatedActionRequest(
  database: ActionRequestDatabase,
  validation: ActionValidationSuccess,
): Promise<ActionRequestPersistenceResult> {
  const { request } = validation;

  return database.transaction(async (tx) => {
    const result = await ensureActionRequestInTransaction(tx, request);
    if (result.status === "accepted") {
      return result;
    }
    if (result.status === "duplicate") {
      return {
        status: "duplicate",
        requestId: result.requestId,
        reasonCode: "KERNEL_DUPLICATE_REQUEST",
      };
    }

    return {
      status: "conflict",
      requestId: result.requestId,
      reasonCode: "KERNEL_CONFLICT",
    };
  });
}
