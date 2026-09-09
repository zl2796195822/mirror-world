import { z } from "zod";

export const RUNTIME_STATE_POLICY_VERSION = "m3-runtime-state-v1" as const;

const locationKindSchema = z.enum([
  "HOME",
  "OFFICE",
  "CAFE",
  "STORE",
  "PARK",
  "TRANSIT",
]);

export const residentLocationRefSchema = z
  .object({
    worldId: z.uuid(),
    locationId: z.uuid(),
    key: z.string().min(1),
    kind: locationKindSchema,
  })
  .strict();

const activityTransitionFields = {
  activityInstanceId: z.uuid(),
  startedAtWorldTime: z.iso.datetime({ offset: true }),
  dueAtWorldTime: z.iso.datetime({ offset: true }),
};

export const residentActivitySchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("IDLE") }).strict(),
    z
      .object({
        kind: z.literal("TRAVELING"),
        ...activityTransitionFields,
        targetLocationId: z.uuid(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("SLEEPING"),
        ...activityTransitionFields,
      })
      .strict(),
  ])
  .superRefine((activity, context) => {
    if (activity.kind === "IDLE") return;
    if (
      new Date(activity.dueAtWorldTime).getTime() <
      new Date(activity.startedAtWorldTime).getTime()
    ) {
      context.addIssue({
        code: "custom",
        message: "activity dueAtWorldTime must not precede startedAtWorldTime",
        path: ["dueAtWorldTime"],
      });
    }
  });

const residentRuntimeStateSchema = z
  .object({
    policyVersion: z.literal(RUNTIME_STATE_POLICY_VERSION),
    worldId: z.uuid(),
    residentId: z.uuid(),
    currentLocation: residentLocationRefSchema,
    activity: residentActivitySchema,
    stateVersion: z.int().nonnegative(),
    sourceWorldSeq: z.string().regex(/^\d+$/),
  })
  .strict();

const workObligationStatusSchema = z.enum([
  "NO_CURRENT_OBLIGATION",
  "NOT_DUE",
  "DUE",
  "LATE",
]);

export const workObligationSchema = z
  .object({
    policyVersion: z.literal(RUNTIME_STATE_POLICY_VERSION),
    worldId: z.uuid(),
    residentId: z.uuid(),
    status: workObligationStatusSchema,
    workplaceId: z.uuid().nullable(),
    startsAtWorldTime: z.iso.datetime({ offset: true }).nullable(),
    endsAtWorldTime: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

export const residentRuntimeObservationSchema = z
  .object({
    runtimeState: residentRuntimeStateSchema,
    workObligation: workObligationSchema,
  })
  .strict();

export type ResidentLocationRef = Readonly<
  z.infer<typeof residentLocationRefSchema>
>;
export type ResidentActivity = Readonly<z.infer<typeof residentActivitySchema>>;
export type ResidentRuntimeState = Readonly<
  z.infer<typeof residentRuntimeStateSchema>
>;
export type WorkObligationStatus = z.infer<typeof workObligationStatusSchema>;
export type WorkObligationSnapshot = Readonly<
  z.infer<typeof workObligationSchema>
>;
export type ResidentRuntimeObservation = Readonly<
  z.infer<typeof residentRuntimeObservationSchema>
>;

export type ResidentRuntimeStateBatchQueryInput = Readonly<{
  worldId: string;
  residentIds: readonly string[];
  worldTime: Date;
  sourceWorldSeq: string;
}>;

export interface ResidentRuntimeStateReadPort {
  getResidentRuntimeStates(
    input: ResidentRuntimeStateBatchQueryInput,
  ): Promise<readonly ResidentRuntimeObservation[]>;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function parseResidentRuntimeObservation(
  input: unknown,
): ResidentRuntimeObservation {
  return deepFreeze(residentRuntimeObservationSchema.parse(input));
}
