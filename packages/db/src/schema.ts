import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  integer,
  jsonb,
  pgTable,
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
