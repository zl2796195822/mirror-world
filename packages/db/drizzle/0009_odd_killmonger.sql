CREATE TABLE "scheduled_wake_registrations" (
	"wake_id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"wake_reason" text NOT NULL,
	"due_world_time" timestamp with time zone NOT NULL,
	"source_state_version" integer NOT NULL,
	"source_world_seq" bigint NOT NULL,
	"decision_epoch" integer NOT NULL,
	"dedupe_key" text NOT NULL,
	"policy_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_wake_registrations_world_dedupe_unique" UNIQUE("world_id","dedupe_key"),
	CONSTRAINT "scheduled_wake_registrations_reason_check" CHECK ("scheduled_wake_registrations"."wake_reason" in ('DEFERRED_REPLAN', 'INITIAL_DECISION', 'WORK_BOUNDARY')),
	CONSTRAINT "scheduled_wake_registrations_version_check" CHECK ("scheduled_wake_registrations"."source_state_version" >= 0 and "scheduled_wake_registrations"."source_world_seq" >= 0 and "scheduled_wake_registrations"."decision_epoch" >= 0),
	CONSTRAINT "scheduled_wake_registrations_dedupe_key_check" CHECK (length(trim("scheduled_wake_registrations"."dedupe_key")) between 1 and 255)
);
--> statement-breakpoint
ALTER TABLE "scheduled_wake_registrations" ADD CONSTRAINT "scheduled_wake_registrations_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_wake_registrations_due_idx" ON "scheduled_wake_registrations" USING btree ("world_id","due_world_time","resident_id");--> statement-breakpoint
CREATE INDEX "resident_runtime_states_due_activity_idx" ON "resident_runtime_states" USING btree ("world_id","current_activity","activity_due_at_world_time");