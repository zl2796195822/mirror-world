CREATE TABLE "simulation_driver_leases" (
	"world_id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"fence_token" bigint DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_driver_leases_owner_check" CHECK (length(trim("simulation_driver_leases"."owner_id")) between 1 and 255),
	CONSTRAINT "simulation_driver_leases_fence_check" CHECK ("simulation_driver_leases"."fence_token" >= 1)
);
--> statement-breakpoint
ALTER TABLE "simulation_driver_leases" ADD CONSTRAINT "simulation_driver_leases_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;