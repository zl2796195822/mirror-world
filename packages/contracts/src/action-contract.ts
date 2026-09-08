import { z } from "zod";

const identifier = z.uuid();
const nonEmptyText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0);
const positiveInteger = z.int().positive();

const actionRequestBase = {
  id: identifier,
  worldId: identifier,
  actorId: identifier,
  targetId: identifier.optional(),
  requestedBy: z.enum(["HUMAN", "RULE", "AI", "PROXY"]),
  idempotencyKey: nonEmptyText(255),
  expectedActorVersion: z.int().nonnegative().optional(),
  requestedAtWorldTime: z.iso.datetime({ offset: true }),
  traceId: nonEmptyText(255),
};

const moveParameters = z.object({ destinationId: identifier }).strict();
const eatParameters = z
  .object({ itemId: identifier, quantity: positiveInteger })
  .strict();
const sleepParameters = z.object({}).strict();
const workParameters = z.object({ workplaceId: identifier }).strict();
const talkParameters = z
  .object({
    participantId: identifier,
    message: nonEmptyText(2000).optional(),
  })
  .strict();
const buyParameters = z
  .object({ itemId: identifier, quantity: positiveInteger })
  .strict();

export const actionRequestSchema = z.discriminatedUnion("actionType", [
  z
    .object({
      ...actionRequestBase,
      actionType: z.literal("MOVE"),
      parameters: moveParameters,
    })
    .strict(),
  z
    .object({
      ...actionRequestBase,
      actionType: z.literal("EAT"),
      parameters: eatParameters,
    })
    .strict(),
  z
    .object({
      ...actionRequestBase,
      actionType: z.literal("SLEEP"),
      parameters: sleepParameters,
    })
    .strict(),
  z
    .object({
      ...actionRequestBase,
      actionType: z.literal("WORK"),
      parameters: workParameters,
    })
    .strict(),
  z
    .object({
      ...actionRequestBase,
      actionType: z.literal("TALK"),
      parameters: talkParameters,
    })
    .strict(),
  z
    .object({
      ...actionRequestBase,
      actionType: z.literal("BUY"),
      parameters: buyParameters,
    })
    .strict(),
]);

export type ActionRequest = z.infer<typeof actionRequestSchema>;
export type ActionType = ActionRequest["actionType"];

export function parseActionRequest(input: unknown): ActionRequest {
  return actionRequestSchema.parse(input);
}

export function safeParseActionRequest(input: unknown) {
  return actionRequestSchema.safeParse(input);
}
