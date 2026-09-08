CREATE TABLE "action_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"requested_by" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"expected_actor_version" integer,
	"requested_at_world_time" timestamp with time zone NOT NULL,
	"trace_id" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_requests_world_idempotency_key_unique" UNIQUE("world_id","idempotency_key"),
	CONSTRAINT "action_requests_action_type_check" CHECK ("action_requests"."action_type" in ('MOVE', 'EAT', 'SLEEP', 'WORK', 'TALK', 'BUY')),
	CONSTRAINT "action_requests_requested_by_check" CHECK ("action_requests"."requested_by" in ('HUMAN', 'RULE', 'AI', 'PROXY')),
	CONSTRAINT "action_requests_idempotency_key_check" CHECK (length(trim("action_requests"."idempotency_key")) between 1 and 255),
	CONSTRAINT "action_requests_expected_actor_version_check" CHECK ("action_requests"."expected_actor_version" is null or "action_requests"."expected_actor_version" >= 0)
);
--> statement-breakpoint
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;