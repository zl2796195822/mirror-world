import { z } from "zod";

const identifier = z.uuid();
const worldSequence = z.string().regex(/^[1-9]\d*$/);

export const kernelActionRejectionReasonCodeSchema = z.enum([
  "KERNEL_INVALID_ACTION",
  "KERNEL_ACTOR_NOT_FOUND",
  "KERNEL_PERMISSION_DENIED",
  "KERNEL_INVALID_LOCATION",
  "KERNEL_INSUFFICIENT_FUNDS",
  "KERNEL_INSUFFICIENT_RESOURCE",
  "WORLD_NOT_RUNNING",
]);

export const kernelActionConflictReasonCodeSchema =
  z.literal("KERNEL_CONFLICT");

export const kernelActionOutcomeEventSchema = z
  .object({
    eventId: identifier,
    eventIndex: z.int().nonnegative(),
    worldId: identifier,
    seq: worldSequence,
    type: z.string().min(1).max(128),
  })
  .strict();

const outcomeBase = {
  outcomeId: identifier,
  requestId: identifier,
  worldId: identifier,
  recordedAt: z.iso.datetime({ offset: true }),
};

const committedOutcome = z
  .object({
    ...outcomeBase,
    status: z.literal("COMMITTED"),
    reasonCode: z.null(),
    eventCount: z.int().positive(),
    eventRefs: z.array(kernelActionOutcomeEventSchema).min(1),
    worldSeqStart: worldSequence,
    worldSeqEnd: worldSequence,
  })
  .strict()
  .superRefine((outcome, context) => {
    if (outcome.eventCount !== outcome.eventRefs.length) {
      context.addIssue({
        code: "custom",
        message: "eventCount must equal eventRefs length",
        path: ["eventCount"],
      });
    }

    if (outcome.eventRefs[0]?.seq !== outcome.worldSeqStart) {
      context.addIssue({
        code: "custom",
        message: "worldSeqStart must match the first event",
        path: ["worldSeqStart"],
      });
    }

    if (
      outcome.eventRefs.at(-1)?.seq !== outcome.worldSeqEnd ||
      outcome.eventRefs.some((event, index) => event.eventIndex !== index)
    ) {
      context.addIssue({
        code: "custom",
        message: "eventRefs must preserve committed event order",
        path: ["eventRefs"],
      });
    }

    if (
      outcome.eventRefs.some((event) => event.worldId !== outcome.worldId) ||
      outcome.eventRefs.some((event, index) => {
        const previous = outcome.eventRefs[index - 1];
        return (
          index > 0 &&
          previous !== undefined &&
          BigInt(event.seq) !== BigInt(previous.seq) + 1n
        );
      })
    ) {
      context.addIssue({
        code: "custom",
        message: "eventRefs must belong to the outcome world and be contiguous",
        path: ["eventRefs"],
      });
    }
  });

const rejectedOutcome = z
  .object({
    ...outcomeBase,
    status: z.literal("REJECTED"),
    reasonCode: kernelActionRejectionReasonCodeSchema,
    eventCount: z.literal(0),
    eventRefs: z.array(kernelActionOutcomeEventSchema).length(0),
    worldSeqStart: z.null(),
    worldSeqEnd: z.null(),
  })
  .strict();

const conflictOutcome = z
  .object({
    ...outcomeBase,
    status: z.literal("CONFLICT"),
    reasonCode: kernelActionConflictReasonCodeSchema,
    eventCount: z.literal(0),
    eventRefs: z.array(kernelActionOutcomeEventSchema).length(0),
    worldSeqStart: z.null(),
    worldSeqEnd: z.null(),
  })
  .strict();

export const kernelActionOutcomeSchema = z.discriminatedUnion("status", [
  committedOutcome,
  rejectedOutcome,
  conflictOutcome,
]);

export type KernelActionRejectionReasonCode = z.infer<
  typeof kernelActionRejectionReasonCodeSchema
>;
export type KernelActionOutcomeEvent = z.infer<
  typeof kernelActionOutcomeEventSchema
>;
export type KernelActionOutcome = z.infer<typeof kernelActionOutcomeSchema>;

export function parseKernelActionOutcome(input: unknown): KernelActionOutcome {
  return kernelActionOutcomeSchema.parse(input);
}

export function safeParseKernelActionOutcome(input: unknown) {
  return kernelActionOutcomeSchema.safeParse(input);
}
