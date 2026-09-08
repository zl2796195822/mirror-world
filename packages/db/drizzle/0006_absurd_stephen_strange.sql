ALTER TABLE "world_events" ADD CONSTRAINT "world_events_id_world_id_seq_unique" UNIQUE("id","world_id","seq");--> statement-breakpoint
ALTER TABLE "kernel_action_outcome_events" ADD CONSTRAINT "kernel_action_outcome_events_event_position_fk" FOREIGN KEY ("event_id","world_id","event_seq") REFERENCES "public"."world_events"("id","world_id","seq") ON DELETE no action ON UPDATE no action;
