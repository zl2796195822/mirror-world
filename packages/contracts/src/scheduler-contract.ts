import { z } from "zod";
import { kernelActionOutcomeSchema } from "./action-outcome-contract.js";

export const SCHEDULER_POLICY_V1_VERSION = "m3-scheduler-v1" as const;
export const SCHEDULER_POLICY_V2_VERSION = "m3-scheduler-v2" as const;
export const SCHEDULER_POLICY_VERSION = SCHEDULER_POLICY_V2_VERSION;

const identifier = z.uuid();
const worldTime = z.iso.datetime({ offset: true });
const worldSequence = z.string().regex(/^\d+$/);

export const schedulerWorkTypeSchema = z.enum([
  "ACTIVITY_COMPLETION",
  "DECISION_WAKE",
]);

export const schedulerWakeReasonSchema = z.enum([
  "ACTIVITY_COMPLETED",
  "DEFERRED_REPLAN",
  "INITIAL_DECISION",
  "WORK_BOUNDARY",
]);

const schedulerWorkItemBase = {
  policyVersion: z.enum([
    SCHEDULER_POLICY_V1_VERSION,
    SCHEDULER_POLICY_V2_VERSION,
  ]),
  worldId: identifier,
  residentId: identifier,
  wakeReason: schedulerWakeReasonSchema,
  dueWorldTime: worldTime,
  sourceStateVersion: z.int().nonnegative(),
  sourceWorldSeq: worldSequence,
  decisionEpoch: z.int().nonnegative(),
};

export const schedulerWorkItemSchema = z.discriminatedUnion("workType", [
  z
    .object({
      ...schedulerWorkItemBase,
      workType: z.literal("ACTIVITY_COMPLETION"),
      activityInstanceId: identifier,
      wakeReason: z.literal("ACTIVITY_COMPLETED"),
    })
    .strict(),
  z
    .object({
      ...schedulerWorkItemBase,
      workType: z.literal("DECISION_WAKE"),
      activityInstanceId: z.null(),
      wakeId: identifier.nullable(),
    })
    .strict(),
]);

export const scheduledWakeRegistrationSchema = z
  .object({
    policyVersion: z.enum([
      SCHEDULER_POLICY_V1_VERSION,
      SCHEDULER_POLICY_V2_VERSION,
    ]),
    wakeId: identifier,
    worldId: identifier,
    residentId: identifier,
    wakeReason: z.enum([
      "DEFERRED_REPLAN",
      "INITIAL_DECISION",
      "WORK_BOUNDARY",
    ]),
    dueWorldTime: worldTime,
    sourceStateVersion: z.int().nonnegative(),
    sourceWorldSeq: worldSequence,
    decisionEpoch: z.int().nonnegative(),
    dedupeKey: z.string().trim().min(1).max(255),
  })
  .strict();

export const schedulerFailureItemSchema = z
  .object({
    policyVersion: z.enum([
      SCHEDULER_POLICY_V1_VERSION,
      SCHEDULER_POLICY_V2_VERSION,
    ]),
    workType: schedulerWorkTypeSchema,
    worldId: identifier,
    residentId: identifier,
    activityInstanceId: identifier.nullable(),
    dueWorldTime: worldTime,
    code: z.enum([
      "WORLD_NOT_RUNNING",
      "STALE_STATE",
      "INVALID_WORK_ITEM",
      "EXECUTION_ERROR",
      "WORK_LIMIT_REACHED",
    ]),
    retryable: z.boolean(),
  })
  .strict();

export const schedulerStepResultSchema = z
  .object({
    policyVersion: z.literal(SCHEDULER_POLICY_VERSION),
    worldId: identifier,
    fromWorldTime: worldTime,
    toWorldTime: worldTime,
    fromWorldSeq: worldSequence,
    toWorldSeq: worldSequence,
    processedWork: z.int().nonnegative(),
    completedActivities: z.int().nonnegative(),
    completionOutcomes: z.array(kernelActionOutcomeSchema),
    wakeItems: z.array(schedulerWorkItemSchema),
    failureItems: z.array(schedulerFailureItemSchema),
    nextDueWorldTime: worldTime.nullable(),
  })
  .strict()
  .superRefine((result, context) => {
    if (
      new Date(result.toWorldTime).getTime() <
      new Date(result.fromWorldTime).getTime()
    ) {
      context.addIssue({
        code: "custom",
        message: "toWorldTime must not precede fromWorldTime",
        path: ["toWorldTime"],
      });
    }
    if (result.completedActivities > result.processedWork) {
      context.addIssue({
        code: "custom",
        message: "completedActivities cannot exceed processedWork",
        path: ["completedActivities"],
      });
    }
    if (BigInt(result.toWorldSeq) < BigInt(result.fromWorldSeq)) {
      context.addIssue({
        code: "custom",
        message: "toWorldSeq must not precede fromWorldSeq",
        path: ["toWorldSeq"],
      });
    }
  });

export type SchedulerWorkType = z.infer<typeof schedulerWorkTypeSchema>;
export type SchedulerWakeReason = z.infer<typeof schedulerWakeReasonSchema>;
export type SchedulerWorkItem = z.infer<typeof schedulerWorkItemSchema>;
export type ScheduledWakeRegistration = z.infer<
  typeof scheduledWakeRegistrationSchema
>;
export type SchedulerFailureItem = z.infer<typeof schedulerFailureItemSchema>;
export type SchedulerStepResult = z.infer<typeof schedulerStepResultSchema>;

export type DueActivity = Readonly<{
  worldId: string;
  residentId: string;
  activityInstanceId: string;
  activityKind: "TRAVELING" | "SLEEPING" | "EATING" | "WORKING" | "TALKING";
  dueWorldTime: Date;
  stateVersion: number;
  sourceWorldSeq: string;
}>;

export type DueActivityReadInput = Readonly<{
  worldId: string;
  targetWorldTime: Date;
  limit: number;
}>;

export interface DueActivityReadPort {
  listDueActivities(
    input: DueActivityReadInput,
  ): Promise<readonly DueActivity[]>;
}

export type ScheduledWakeReadInput = Readonly<{
  worldId: string;
  targetWorldTime: Date;
  limit: number;
}>;

export interface ScheduledWakeReadPort {
  listDueScheduledWakes(
    input: ScheduledWakeReadInput,
  ): Promise<readonly ScheduledWakeRegistration[]>;
  registerScheduledWake(
    input: ScheduledWakeRegistration,
  ): Promise<ScheduledWakeRegistration>;
}

export function parseSchedulerWorkItem(input: unknown): SchedulerWorkItem {
  return schedulerWorkItemSchema.parse(input);
}

export function parseScheduledWakeRegistration(
  input: unknown,
): ScheduledWakeRegistration {
  return scheduledWakeRegistrationSchema.parse(input);
}

export function parseSchedulerStepResult(input: unknown): SchedulerStepResult {
  return schedulerStepResultSchema.parse(input);
}
