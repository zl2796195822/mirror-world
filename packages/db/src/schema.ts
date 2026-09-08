import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
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
  ],
);
