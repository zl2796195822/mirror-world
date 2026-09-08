CREATE TABLE "simulation_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"world_seq" bigint NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb NOT NULL,
	"snapshot_uri" text,
	"checksum" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_checkpoints_world_id_seq_unique" UNIQUE("world_id","world_seq"),
	CONSTRAINT "simulation_checkpoints_seq_check" CHECK ("simulation_checkpoints"."world_seq" >= 0),
	CONSTRAINT "simulation_checkpoints_schema_version_check" CHECK ("simulation_checkpoints"."schema_version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "simulation_checkpoints" ADD CONSTRAINT "simulation_checkpoints_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION mirror_assert_checkpoint_position() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_seq bigint;
BEGIN
  SELECT world_seq INTO current_seq
  FROM worlds
  WHERE id = NEW.world_id;

  IF current_seq IS NULL THEN
    RAISE EXCEPTION 'world does not exist for checkpoint';
  END IF;

  IF NEW.world_seq > current_seq THEN
    RAISE EXCEPTION 'checkpoint cannot point beyond the current world sequence';
  END IF;

  IF NEW.world_seq > 0 AND NOT EXISTS (
    SELECT 1
    FROM world_events
    WHERE world_id = NEW.world_id AND seq = NEW.world_seq
  ) THEN
    RAISE EXCEPTION 'checkpoint must point to an existing world event';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER simulation_checkpoints_position
BEFORE INSERT OR UPDATE ON simulation_checkpoints
FOR EACH ROW EXECUTE FUNCTION mirror_assert_checkpoint_position();
