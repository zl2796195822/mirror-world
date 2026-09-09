import { z } from "zod";
import { kernelActionOutcomeSchema } from "./action-outcome-contract.js";

const identifier = z.uuid();
const worldTime = z.iso.datetime({ offset: true });
const nonEmptyText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0);

export const REPLAN_POLICY_VERSION = "m3-replan-v1" as const;

export const failureClassSchema = z.enum([
  "SUCCESS",
  "STALE_STATE",
  "PERMANENT_INVALID",
  "AUTHORIZATION",
  "RESOURCE_UNAVAILABLE",
  "WORLD_NOT_RUNNING",
  "TEMPORARY_NOT_DUE",
  "IDEMPOTENCY_ERROR",
  "TRANSPORT_TIMEOUT",
  "INTERNAL_ERROR",
  "UNKNOWN_FAILURE",
]);

export const decisionAttemptBudgetSchema = z
  .object({
    submissionAttempts: z.int().nonnegative(),
    conflictRecoveries: z.int().nonnegative(),
    replans: z.int().nonnegative(),
  })
  .strict();

const timeoutReconciliationSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("FOUND"),
      outcome: kernelActionOutcomeSchema,
    })
    .strict(),
  z.object({ status: z.literal("NOT_FOUND") }).strict(),
  z.object({ status: z.literal("UNAVAILABLE") }).strict(),
]);

export const actionRecoverySignalSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("KERNEL_OUTCOME"),
        disposition: z.enum(["EXECUTED", "REUSED"]),
        outcome: kernelActionOutcomeSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("IDEMPOTENCY_CONFLICT"),
        requestId: identifier,
        worldId: identifier,
      })
      .strict(),
    z
      .object({
        kind: z.literal("NOT_DUE"),
        requestId: identifier,
        worldId: identifier,
        dueAtWorldTime: worldTime,
      })
      .strict(),
    z
      .object({
        kind: z.literal("TIMED_OUT"),
        requestId: identifier,
        worldId: identifier,
        idempotencyKey: nonEmptyText(255),
        reconciliation: timeoutReconciliationSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal("EXECUTOR_ERROR"),
        code: nonEmptyText(128),
      })
      .strict(),
    z
      .object({
        kind: z.literal("UNKNOWN_FAILURE"),
        code: nonEmptyText(128),
      })
      .strict(),
  ])
  .superRefine((signal, context) => {
    if (signal.kind !== "TIMED_OUT") return;
    if (signal.reconciliation.status !== "FOUND") return;
    if (signal.reconciliation.outcome.requestId !== signal.requestId) {
      context.addIssue({
        code: "custom",
        message: "Reconciled outcome must belong to the timed-out request",
        path: ["reconciliation", "outcome", "requestId"],
      });
    }
    if (signal.reconciliation.outcome.worldId !== signal.worldId) {
      context.addIssue({
        code: "custom",
        message: "Reconciled outcome must belong to the timed-out world",
        path: ["reconciliation", "outcome", "worldId"],
      });
    }
  });

export const replanPolicyInputSchema = z
  .object({
    currentWorldTime: worldTime,
    budget: decisionAttemptBudgetSchema,
    signal: actionRecoverySignalSchema,
    alternativeCandidateAvailable: z.boolean().optional(),
  })
  .strict();

const decisionBase = {
  policyVersion: z.literal(REPLAN_POLICY_VERSION),
  failureClass: failureClassSchema,
  reasonCode: z.string().min(1).max(128).nullable(),
  budget: decisionAttemptBudgetSchema,
};

export const replanDecisionSchema = z.discriminatedUnion("directive", [
  z
    .object({
      ...decisionBase,
      directive: z.literal("SUCCESS"),
      failureClass: z.literal("SUCCESS"),
      reasonCode: z.null(),
    })
    .strict(),
  z
    .object({
      ...decisionBase,
      directive: z.literal("REOBSERVE_NOW"),
      failureClass: z.literal("STALE_STATE"),
    })
    .strict(),
  z
    .object({
      ...decisionBase,
      directive: z.literal("REPLAN_NOW"),
      failureClass: z.enum(["PERMANENT_INVALID", "RESOURCE_UNAVAILABLE"]),
    })
    .strict(),
  z
    .object({
      ...decisionBase,
      directive: z.literal("RETRY_SAME_REQUEST"),
      failureClass: z.literal("TRANSPORT_TIMEOUT"),
      requestId: identifier,
      idempotencyKey: nonEmptyText(255),
    })
    .strict(),
  z
    .object({
      ...decisionBase,
      directive: z.literal("DEFER_UNTIL_WORLD_TIME"),
      failureClass: z.enum(["RESOURCE_UNAVAILABLE", "TEMPORARY_NOT_DUE"]),
      untilWorldTime: worldTime,
    })
    .strict(),
  z
    .object({
      ...decisionBase,
      directive: z.literal("STOP"),
      stopReason: z.enum([
        "FAILURE_TERMINAL",
        "BUDGET_EXHAUSTED",
        "RECONCILIATION_REQUIRED",
        "NO_FEASIBLE_ALTERNATIVE",
        "WORLD_NOT_RUNNING",
        "IDEMPOTENCY_ERROR",
        "INTERNAL_ERROR",
        "UNKNOWN_FAILURE",
      ]),
    })
    .strict(),
]);

export type FailureClass = z.infer<typeof failureClassSchema>;
export type DecisionAttemptBudget = z.infer<typeof decisionAttemptBudgetSchema>;
export type ActionRecoverySignal = z.infer<typeof actionRecoverySignalSchema>;
export type ReplanPolicyInput = z.infer<typeof replanPolicyInputSchema>;
export type ReplanDecision = z.infer<typeof replanDecisionSchema>;
