ALTER TABLE "resident_runtime_states" DROP CONSTRAINT "resident_runtime_states_activity_check";--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "activity_instance_id" uuid;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "activity_target_location_id" uuid;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "activity_started_at_world_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD COLUMN "activity_due_at_world_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resident_runtime_states" ADD CONSTRAINT "resident_runtime_states_activity_check" CHECK ((
        ("resident_runtime_states"."current_activity" = 'IDLE'
          and "resident_runtime_states"."activity_instance_id" is null
          and "resident_runtime_states"."activity_target_location_id" is null
          and "resident_runtime_states"."activity_started_at_world_time" is null
          and "resident_runtime_states"."activity_due_at_world_time" is null)
        or
        ("resident_runtime_states"."current_activity" = 'TRAVELING'
          and "resident_runtime_states"."activity_instance_id" is not null
          and "resident_runtime_states"."activity_target_location_id" is not null
          and "resident_runtime_states"."activity_started_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" >= "resident_runtime_states"."activity_started_at_world_time")
        or
        ("resident_runtime_states"."current_activity" = 'SLEEPING'
          and "resident_runtime_states"."activity_instance_id" is not null
          and "resident_runtime_states"."activity_target_location_id" is null
          and "resident_runtime_states"."activity_started_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" is not null
          and "resident_runtime_states"."activity_due_at_world_time" >= "resident_runtime_states"."activity_started_at_world_time")
      ));