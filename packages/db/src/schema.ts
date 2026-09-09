import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const worlds = pgTable(
  "worlds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("Asia/Shanghai"),
    timeScale: integer("time_scale").notNull().default(1),
    status: text("status").notNull().default("PAUSED"),
    seed: text("seed").notNull(),
    worldSeq: bigint("world_seq", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    worldTime: timestamp("world_time", { withTimezone: true }).notNull(),
    clockAnchorAt: timestamp("clock_anchor_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "worlds_status_check",
      sql`${table.status} in ('RUNNING', 'PAUSED', 'MAINTENANCE')`,
    ),
    check("worlds_time_scale_check", sql`${table.timeScale} in (1, 10, 100)`),
    check("worlds_world_seq_check", sql`${table.worldSeq} >= 0`),
  ],
);

export const residentRuntimeStates = pgTable(
  "resident_runtime_states",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id),
    residentId: uuid("resident_id").notNull(),
    currentLocationId: uuid("current_location_id").notNull(),
    currentActivity: text("current_activity").notNull(),
    activityInstanceId: uuid("activity_instance_id"),
    activityTargetLocationId: uuid("activity_target_location_id"),
    activityStartedAtWorldTime: timestamp("activity_started_at_world_time", {
      withTimezone: true,
    }),
    activityDueAtWorldTime: timestamp("activity_due_at_world_time", {
      withTimezone: true,
    }),
    stateVersion: integer("state_version").notNull().default(0),
    sourceWorldSeq: bigint("source_world_seq", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    runtimePolicyVersion: text("runtime_policy_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.worldId, table.residentId] }),
    check(
      "resident_runtime_states_activity_check",
      sql`(
        (${table.currentActivity} = 'IDLE'
          and ${table.activityInstanceId} is null
          and ${table.activityTargetLocationId} is null
          and ${table.activityStartedAtWorldTime} is null
          and ${table.activityDueAtWorldTime} is null)
        or
        (${table.currentActivity} = 'TRAVELING'
          and ${table.activityInstanceId} is not null
          and ${table.activityTargetLocationId} is not null
          and ${table.activityStartedAtWorldTime} is not null
          and ${table.activityDueAtWorldTime} is not null
          and ${table.activityDueAtWorldTime} >= ${table.activityStartedAtWorldTime})
        or
        (${table.currentActivity} = 'SLEEPING'
          and ${table.activityInstanceId} is not null
          and ${table.activityTargetLocationId} is null
          and ${table.activityStartedAtWorldTime} is not null
          and ${table.activityDueAtWorldTime} is not null
          and ${table.activityDueAtWorldTime} >= ${table.activityStartedAtWorldTime})
      )`,
    ),
    check(
      "resident_runtime_states_version_check",
      sql`${table.stateVersion} >= 0 and ${table.sourceWorldSeq} >= 0`,
    ),
  ],
);

export const actionRequests = pgTable(
  "action_requests",
  {
    id: uuid("id").primaryKey(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id),
    actorId: uuid("actor_id").notNull(),
    actionType: text("action_type").notNull(),
    requestedBy: text("requested_by").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    expectedActorVersion: integer("expected_actor_version"),
    requestedAtWorldTime: timestamp("requested_at_world_time", {
      withTimezone: true,
    }).notNull(),
    traceId: text("trace_id").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("action_requests_id_world_id_unique").on(table.id, table.worldId),
    unique("action_requests_world_idempotency_key_unique").on(
      table.worldId,
      table.idempotencyKey,
    ),
    check(
      "action_requests_action_type_check",
      sql`${table.actionType} in ('MOVE', 'EAT', 'SLEEP', 'WORK', 'TALK', 'BUY')`,
    ),
    check(
      "action_requests_requested_by_check",
      sql`${table.requestedBy} in ('HUMAN', 'RULE', 'AI', 'PROXY')`,
    ),
    check(
      "action_requests_idempotency_key_check",
      sql`length(trim(${table.idempotencyKey})) between 1 and 255`,
    ),
    check(
      "action_requests_expected_actor_version_check",
      sql`${table.expectedActorVersion} is null or ${table.expectedActorVersion} >= 0`,
    ),
  ],
);

export const kernelActionOutcomes = pgTable(
  "kernel_action_outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actionRequestId: uuid("action_request_id")
      .notNull()
      .references(() => actionRequests.id),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id),
    status: text("status").notNull(),
    reasonCode: text("reason_code"),
    eventCount: integer("event_count").notNull().default(0),
    worldSeqStart: bigint("world_seq_start", { mode: "bigint" }),
    worldSeqEnd: bigint("world_seq_end", { mode: "bigint" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("kernel_action_outcomes_id_world_id_unique").on(
      table.id,
      table.worldId,
    ),
    unique("kernel_action_outcomes_request_unique").on(table.actionRequestId),
    foreignKey({
      columns: [table.actionRequestId, table.worldId],
      foreignColumns: [actionRequests.id, actionRequests.worldId],
      name: "kernel_action_outcomes_request_world_fk",
    }),
    check(
      "kernel_action_outcomes_status_check",
      sql`${table.status} in ('COMMITTED', 'REJECTED', 'CONFLICT')`,
    ),
    check(
      "kernel_action_outcomes_reason_check",
      sql`${table.reasonCode} is null or ${table.reasonCode} in ('KERNEL_INVALID_ACTION', 'KERNEL_ACTOR_NOT_FOUND', 'KERNEL_PERMISSION_DENIED', 'KERNEL_INVALID_LOCATION', 'KERNEL_INSUFFICIENT_FUNDS', 'KERNEL_INSUFFICIENT_RESOURCE', 'WORLD_NOT_RUNNING', 'KERNEL_CONFLICT')`,
    ),
    check(
      "kernel_action_outcomes_shape_check",
      sql`(
        (${table.status} = 'COMMITTED' and ${table.reasonCode} is null and ${table.eventCount} > 0 and ${table.worldSeqStart} is not null and ${table.worldSeqEnd} is not null)
        or
        (${table.status} in ('REJECTED', 'CONFLICT') and ${table.reasonCode} is not null and ${table.eventCount} = 0 and ${table.worldSeqStart} is null and ${table.worldSeqEnd} is null)
      )`,
    ),
  ],
);

export const worldEvents = pgTable(
  "world_events",
  {
    id: uuid("id").primaryKey(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id),
    seq: bigint("seq", { mode: "bigint" }).notNull(),
    type: text("type").notNull(),
    actorId: uuid("actor_id"),
    targetId: uuid("target_id"),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    correlationId: uuid("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("world_events_world_id_seq_unique").on(table.worldId, table.seq),
    unique("world_events_id_world_id_unique").on(table.id, table.worldId),
    unique("world_events_id_world_id_seq_unique").on(
      table.id,
      table.worldId,
      table.seq,
    ),
  ],
);

export const kernelActionOutcomeEvents = pgTable(
  "kernel_action_outcome_events",
  {
    outcomeId: uuid("outcome_id")
      .notNull()
      .references(() => kernelActionOutcomes.id),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => worldEvents.id),
    eventIndex: integer("event_index").notNull(),
    eventSeq: bigint("event_seq", { mode: "bigint" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.outcomeId, table.eventIndex] }),
    foreignKey({
      columns: [table.outcomeId, table.worldId],
      foreignColumns: [kernelActionOutcomes.id, kernelActionOutcomes.worldId],
      name: "kernel_action_outcome_events_outcome_world_fk",
    }),
    foreignKey({
      columns: [table.eventId, table.worldId],
      foreignColumns: [worldEvents.id, worldEvents.worldId],
      name: "kernel_action_outcome_events_event_world_fk",
    }),
    foreignKey({
      columns: [table.eventId, table.worldId, table.eventSeq],
      foreignColumns: [worldEvents.id, worldEvents.worldId, worldEvents.seq],
      name: "kernel_action_outcome_events_event_position_fk",
    }),
    unique("kernel_action_outcome_events_event_unique").on(table.eventId),
    unique("kernel_action_outcome_events_outcome_event_unique").on(
      table.outcomeId,
      table.eventId,
    ),
    check(
      "kernel_action_outcome_events_index_check",
      sql`${table.eventIndex} >= 0`,
    ),
    check(
      "kernel_action_outcome_events_seq_check",
      sql`${table.eventSeq} >= 1`,
    ),
  ],
);

export const simulationCheckpoints = pgTable(
  "simulation_checkpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id),
    worldSeq: bigint("world_seq", { mode: "bigint" }).notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    snapshot: jsonb("snapshot").notNull(),
    snapshotUri: text("snapshot_uri"),
    checksum: text("checksum").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("simulation_checkpoints_world_id_seq_unique").on(
      table.worldId,
      table.worldSeq,
    ),
    check("simulation_checkpoints_seq_check", sql`${table.worldSeq} >= 0`),
    check(
      "simulation_checkpoints_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
  ],
);
