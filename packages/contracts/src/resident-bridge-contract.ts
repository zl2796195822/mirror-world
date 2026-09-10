import { z } from "zod";

export const actorRefSchema = z
  .object({
    worldId: z.uuid(),
    residentId: z.uuid(),
    actorId: z.uuid(),
    kind: z.literal("NATIVE_RESIDENT"),
  })
  .strict();

export const residentResourceSnapshotSchema = z
  .object({
    worldId: z.uuid(),
    residentId: z.uuid(),
    cashCents: z.int().nonnegative(),
    foodUnits: z.int().nonnegative(),
    version: z.int().nonnegative(),
    itemId: z.uuid().optional(),
    locationId: z.uuid().optional(),
  })
  .strict();

export type ActorRef = Readonly<z.infer<typeof actorRefSchema>>;
export type ResidentResourceSnapshot = Readonly<
  z.infer<typeof residentResourceSnapshotSchema>
>;

export type ResidentActorQueryInput = Readonly<{
  worldId: string;
  residentId: string;
}>;
export type ResidentActorBatchQueryInput = Readonly<{
  worldId: string;
  residentIds: readonly string[];
}>;
export type ResidentResourceQueryInput = ResidentActorQueryInput;
export type ResidentResourceBatchQueryInput = ResidentActorBatchQueryInput;

export interface ResidentActorResolver {
  resolveResidentActorRef(input: ResidentActorQueryInput): Promise<ActorRef>;
  resolveResidentActorRefs(
    input: ResidentActorBatchQueryInput,
  ): Promise<readonly ActorRef[]>;
}

export interface ResourceReadPort {
  getResidentResourceSnapshot(
    input: ResidentResourceQueryInput,
  ): Promise<ResidentResourceSnapshot>;
  getResidentResourceSnapshots(
    input: ResidentResourceBatchQueryInput,
  ): Promise<readonly ResidentResourceSnapshot[]>;
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

export function parseActorRef(input: unknown): ActorRef {
  return deepFreeze(actorRefSchema.parse(input));
}

export function parseResidentResourceSnapshot(
  input: unknown,
): ResidentResourceSnapshot {
  return deepFreeze(residentResourceSnapshotSchema.parse(input));
}
