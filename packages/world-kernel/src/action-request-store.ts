import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { actionRequests, createDb } from "@mirror/db";
import type { ActionRequest } from "@mirror/contracts";
import type { ActionValidationSuccess } from "./action-validator.js";

export type ActionRequestDatabase = ReturnType<typeof createDb>["db"];

export type ActionRequestPersistenceResult =
  | { status: "accepted"; requestId: string }
  | {
      status: "duplicate";
      requestId: string;
      reasonCode: "KERNEL_DUPLICATE_REQUEST";
    }
  | { status: "conflict"; requestId: string; reasonCode: "KERNEL_CONFLICT" };

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

export async function persistValidatedActionRequest(
  database: ActionRequestDatabase,
  validation: ActionValidationSuccess,
): Promise<ActionRequestPersistenceResult> {
  const { request } = validation;
  const fingerprint = actionRequestFingerprint(request);

  return database.transaction(async (tx) => {
    const [inserted] = await tx
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

    const [existingByKey] = await tx
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
      );

    if (!existingByKey) {
      throw new ActionRequestStoreError(
        "ACTION_REQUEST_NOT_FOUND",
        "Conflicting action request could not be located",
      );
    }

    if (existingByKey.requestFingerprint === fingerprint) {
      return {
        status: "duplicate",
        requestId: existingByKey.id,
        reasonCode: "KERNEL_DUPLICATE_REQUEST",
      };
    }

    return {
      status: "conflict",
      requestId: existingByKey.id,
      reasonCode: "KERNEL_CONFLICT",
    };
  });
}
