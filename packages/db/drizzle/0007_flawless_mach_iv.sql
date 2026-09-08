CREATE TABLE "resident_runtime_states" (
	"world_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"current_location_id" uuid NOT NULL,
	"current_activity" text NOT NULL,
	"state_version" integer DEFAULT 0 NOT NULL,
	"source_world_seq" bigint DEFAULT 0 NOT NULL,
	"runtime_policy_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_runtime_states_world_id_resident_id_pk" PRIMARY KEY("world_id","resident_id"),
	CONSTRAINT "resident_runtime_states_activity_check" CHECK ("resident_runtime_states"."current_activity" in ('IDLE')),
	CONSTRAINT "resident_runtime_states_version_check" CHECK ("resident_runtime_states"."state_version" >= 0 and "resident_runtime_states"."source_world_seq" >= 0)
);
--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD CONSTRAINT "resident_runtime_states_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;