ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_id_world_id_unique" UNIQUE("id","world_id");--> statement-breakpoint
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_id_world_id_unique" UNIQUE("id","world_id");--> statement-breakpoint
CREATE TABLE "kernel_action_outcome_events" (
	"outcome_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_index" integer NOT NULL,
	"event_seq" bigint NOT NULL,
	CONSTRAINT "kernel_action_outcome_events_outcome_id_event_index_pk" PRIMARY KEY("outcome_id","event_index"),
	CONSTRAINT "kernel_action_outcome_events_event_unique" UNIQUE("event_id"),
	CONSTRAINT "kernel_action_outcome_events_outcome_event_unique" UNIQUE("outcome_id","event_id"),
	CONSTRAINT "kernel_action_outcome_events_index_check" CHECK ("kernel_action_outcome_events"."event_index" >= 0),
	CONSTRAINT "kernel_action_outcome_events_seq_check" CHECK ("kernel_action_outcome_events"."event_seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE "kernel_action_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_request_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"status" text NOT NULL,
	"reason_code" text,
	"event_count" integer DEFAULT 0 NOT NULL,
	"world_seq_start" bigint,
	"world_seq_end" bigint,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kernel_action_outcomes_id_world_id_unique" UNIQUE("id","world_id"),
	CONSTRAINT "kernel_action_outcomes_request_unique" UNIQUE("action_request_id"),
	CONSTRAINT "kernel_action_outcomes_status_check" CHECK ("kernel_action_outcomes"."status" in ('COMMITTED', 'REJECTED', 'CONFLICT')),
	CONSTRAINT "kernel_action_outcomes_reason_check" CHECK ("kernel_action_outcomes"."reason_code" is null or "kernel_action_outcomes"."reason_code" in ('KERNEL_INVALID_ACTION', 'KERNEL_ACTOR_NOT_FOUND', 'KERNEL_PERMISSION_DENIED', 'KERNEL_INVALID_LOCATION', 'KERNEL_INSUFFICIENT_FUNDS', 'KERNEL_INSUFFICIENT_RESOURCE', 'WORLD_NOT_RUNNING', 'KERNEL_CONFLICT')),
	CONSTRAINT "kernel_action_outcomes_shape_check" CHECK ((
        ("kernel_action_outcomes"."status" = 'COMMITTED' and "kernel_action_outcomes"."reason_code" is null and "kernel_action_outcomes"."event_count" > 0 and "kernel_action_outcomes"."world_seq_start" is not null and "kernel_action_outcomes"."world_seq_end" is not null)
        or
        ("kernel_action_outcomes"."status" in ('REJECTED', 'CONFLICT') and "kernel_action_outcomes"."reason_code" is not null and "kernel_action_outcomes"."event_count" = 0 and "kernel_action_outcomes"."world_seq_start" is null and "kernel_action_outcomes"."world_seq_end" is null)
      ))
);
--> statement-breakpoint
ALTER TABLE "kernel_action_outcome_events" ADD CONSTRAINT "kernel_action_outcome_events_outcome_id_kernel_action_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."kernel_action_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_action_outcome_events" ADD CONSTRAINT "kernel_action_outcome_events_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_action_outcome_events" ADD CONSTRAINT "kernel_action_outcome_events_event_id_world_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_action_outcome_events" ADD CONSTRAINT "kernel_action_outcome_events_outcome_world_fk" FOREIGN KEY ("outcome_id","world_id") REFERENCES "public"."kernel_action_outcomes"("id","world_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_action_outcome_events" ADD CONSTRAINT "kernel_action_outcome_events_event_world_fk" FOREIGN KEY ("event_id","world_id") REFERENCES "public"."world_events"("id","world_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_action_outcomes" ADD CONSTRAINT "kernel_action_outcomes_action_request_id_action_requests_id_fk" FOREIGN KEY ("action_request_id") REFERENCES "public"."action_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_action_outcomes" ADD CONSTRAINT "kernel_action_outcomes_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_action_outcomes" ADD CONSTRAINT "kernel_action_outcomes_request_world_fk" FOREIGN KEY ("action_request_id","world_id") REFERENCES "public"."action_requests"("id","world_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
