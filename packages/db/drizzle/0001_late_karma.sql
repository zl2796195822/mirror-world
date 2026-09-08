ALTER TABLE "worlds" ADD COLUMN "clock_anchor_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_status_check" CHECK ("worlds"."status" in ('RUNNING', 'PAUSED', 'MAINTENANCE'));--> statement-breakpoint
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_time_scale_check" CHECK ("worlds"."time_scale" in (1, 10, 100));