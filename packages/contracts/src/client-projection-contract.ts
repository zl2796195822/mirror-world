import { z } from "zod";

export const CLIENT_PROJECTION_SCHEMA_VERSION = "client-projection-v0" as const;

export const clientPlaceKindSchema = z.enum([
  "HOME",
  "OFFICE",
  "CAFE",
  "STORE",
  "PARK",
  "TRANSIT",
  "UNKNOWN_PLACE",
]);

export const clientResidentActivitySchema = z.enum([
  "IDLE",
  "TRAVELING",
  "SLEEPING",
  "EATING",
  "WORKING",
  "TALKING",
  "UNKNOWN_ACTIVITY",
]);

export const clientWorldStatusSchema = z.enum([
  "RUNNING",
  "PAUSED",
  "MAINTENANCE",
]);

export const clientPlaceProjectionSchema = z
  .object({
    placeId: z.uuid(),
    placeKey: z.string().min(1),
    placeType: clientPlaceKindSchema,
    displayName: z.string().min(1),
    parentPlaceId: z.uuid().nullable(),
    residentCount: z.int().nonnegative(),
  })
  .strict();

export const clientResidentProjectionSchema = z
  .object({
    residentId: z.uuid(),
    displayName: z.string().min(1),
    placeId: z.uuid(),
    placeKey: z.string().min(1).nullable(),
    placeKind: clientPlaceKindSchema.nullable(),
    activity: clientResidentActivitySchema,
    activityInstanceId: z.uuid().nullable(),
    activityStartedAtWorldTime: z.iso.datetime({ offset: true }).nullable(),
    activityDueAtWorldTime: z.iso.datetime({ offset: true }).nullable(),
    targetPlaceId: z.uuid().nullable(),
    participantId: z.uuid().nullable(),
    employmentStatus: z.enum(["EMPLOYED", "UNEMPLOYED"]).nullable(),
    workplaceId: z.uuid().nullable(),
    projectionSeq: z.string().regex(/^\d+$/),
  })
  .strict();

export const clientWorldSnapshotSchema = z
  .object({
    schemaVersion: z.literal(CLIENT_PROJECTION_SCHEMA_VERSION),
    worldId: z.uuid(),
    worldTime: z.iso.datetime({ offset: true }),
    worldSeq: z.string().regex(/^\d+$/),
    worldStatus: clientWorldStatusSchema,
    generatedAt: z.iso.datetime({ offset: true }).optional(),
    places: z.array(clientPlaceProjectionSchema),
    residents: z.array(clientResidentProjectionSchema),
  })
  .strict();

export const clientWorldEventSchema = z
  .object({
    eventId: z.uuid(),
    worldSeq: z.string().regex(/^\d+$/),
    eventType: z.string().min(1),
    occurredAtWorldTime: z.iso.datetime({ offset: true }),
    residentId: z.uuid().nullable(),
    participantId: z.uuid().nullable(),
    placeId: z.uuid().nullable(),
    targetPlaceId: z.uuid().nullable(),
    payloadSummary: z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()]),
      )
      .optional(),
  })
  .strict();

export const clientEventFeedSchema = z
  .object({
    schemaVersion: z.literal(CLIENT_PROJECTION_SCHEMA_VERSION),
    worldId: z.uuid(),
    worldSeq: z.string().regex(/^\d+$/),
    events: z.array(clientWorldEventSchema),
    nextAfterSeq: z.string().regex(/^\d+$/),
  })
  .strict();

export const clientContractHandshakeSchema = z
  .object({
    schemaVersion: z.literal(CLIENT_PROJECTION_SCHEMA_VERSION),
    capabilities: z.array(z.string()),
    transport: z.array(z.string()),
    realtime: z.enum(["unavailable"]),
  })
  .strict();

export type ClientPlaceKind = z.infer<typeof clientPlaceKindSchema>;
export type ClientResidentActivity = z.infer<
  typeof clientResidentActivitySchema
>;
export type ClientWorldStatus = z.infer<typeof clientWorldStatusSchema>;
export type ClientPlaceProjection = z.infer<typeof clientPlaceProjectionSchema>;
export type ClientResidentProjection = z.infer<
  typeof clientResidentProjectionSchema
>;
export type ClientWorldSnapshot = z.infer<typeof clientWorldSnapshotSchema>;
export type ClientWorldEvent = z.infer<typeof clientWorldEventSchema>;
export type ClientEventFeed = z.infer<typeof clientEventFeedSchema>;
export type ClientContractHandshake = z.infer<
  typeof clientContractHandshakeSchema
>;

export function parseClientWorldSnapshot(value: unknown): ClientWorldSnapshot {
  return clientWorldSnapshotSchema.parse(value);
}

export function parseClientEventFeed(value: unknown): ClientEventFeed {
  return clientEventFeedSchema.parse(value);
}
