CREATE TABLE "resident_resource_states" (
	"world_id" uuid NOT NULL,
	"resident_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"food_units" integer NOT NULL,
	"resource_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_resource_states_world_id_resident_id_item_id_pk" PRIMARY KEY("world_id","resident_id","item_id"),
	CONSTRAINT "resident_resource_states_units_check" CHECK ("resident_resource_states"."food_units" >= 0 and "resident_resource_states"."resource_version" >= 0)
);
--> statement-breakpoint
ALTER TABLE "resident_runtime_states" DROP CONSTRAINT "resident_runtime_states_activity_check";--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "activity_target_resident_id" uuid;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "last_ate_at_world_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "last_social_contact_at_world_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "completed_work_shift_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "resident_resource_states" ADD CONSTRAINT "resident_resource_states_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD CONSTRAINT "resident_runtime_states_activity_check" CHECK ((
        ("resident_runtime_states"."current_activity" = 'IDLE'
          and "resident_runtime_states"."activity_instance_id" is null
          and "resident_runtime_states"."activity_target_location_id" is null
          and "resident_runtime_states"."activity_target_resident_id" is null
          and "resident_runtime_states"."activity_started_at_world_time" is null
          and "resident_runtime_states"."activity_due_at_world_time" is null)
        or
        ("resident_runtime_states"."current_activity" = 'TRAVELING'
          and "resident_runtime_states"."activity_instance_id" is not null
          and "resident_runtime_states"."activity_target_location_id" is not null
          and "resident_runtime_states"."activity_target_resident_id" is null
          and "resident_runtime_states"."activity_started_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" >= "resident_runtime_states"."activity_started_at_world_time")
        or
        ("resident_runtime_states"."current_activity" = 'SLEEPING'
          and "resident_runtime_states"."activity_instance_id" is not null
          and "resident_runtime_states"."activity_target_location_id" is null
          and "resident_runtime_states"."activity_target_resident_id" is null
          and "resident_runtime_states"."activity_started_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" >= "resident_runtime_states"."activity_started_at_world_time")
        or
        (("resident_runtime_states"."current_activity" = 'EATING' or "resident_runtime_states"."current_activity" = 'WORKING')
          and "resident_runtime_states"."activity_instance_id" is not null
          and "resident_runtime_states"."activity_target_location_id" is null
          and "resident_runtime_states"."activity_target_resident_id" is null
          and "resident_runtime_states"."activity_started_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" >= "resident_runtime_states"."activity_started_at_world_time")
        or
        ("resident_runtime_states"."current_activity" = 'TALKING'
          and "resident_runtime_states"."activity_instance_id" is not null
          and "resident_runtime_states"."activity_target_location_id" is null
          and "resident_runtime_states"."activity_target_resident_id" is not null
          and "resident_runtime_states"."activity_started_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" >= "resident_runtime_states"."activity_started_at_world_time")
      ));
