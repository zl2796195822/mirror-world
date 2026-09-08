CREATE TABLE "world_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"seq" bigint NOT NULL,
	"type" text NOT NULL,
	"actor_id" uuid,
	"target_id" uuid,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_events_world_id_seq_unique" UNIQUE("world_id","seq")
);
--> statement-breakpoint
ALTER TABLE "worlds" ADD COLUMN "world_seq" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_world_seq_check" CHECK ("worlds"."world_seq" >= 0);
--> statement-breakpoint
CREATE FUNCTION mirror_assert_world_event_seq() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_seq bigint;
BEGIN
  SELECT world_seq INTO current_seq
  FROM worlds
  WHERE id = NEW.world_id
  FOR UPDATE;

  IF current_seq IS NULL THEN
    RAISE EXCEPTION 'world does not exist for event';
  END IF;

  IF NEW.seq <> current_seq + 1 THEN
    RAISE EXCEPTION 'world event sequence must advance by one';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE FUNCTION mirror_assert_world_event_immutable() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'world_events are append-only';
END;
$$;--> statement-breakpoint
CREATE FUNCTION mirror_assert_world_seq_update() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.world_seq = OLD.world_seq THEN
    RETURN NEW;
  END IF;

  IF NEW.world_seq <> OLD.world_seq + 1 THEN
    RAISE EXCEPTION 'world_seq must advance by one';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM world_events
    WHERE world_id = NEW.id AND seq = NEW.world_seq
  ) THEN
    RAISE EXCEPTION 'world_seq cannot advance without a matching event';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE FUNCTION mirror_assert_world_event_consistency() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_seq bigint;
  latest_seq bigint;
BEGIN
  SELECT world_seq INTO current_seq FROM worlds WHERE id = NEW.world_id;
  SELECT COALESCE(MAX(seq), 0) INTO latest_seq
  FROM world_events
  WHERE world_id = NEW.world_id;

  IF current_seq <> latest_seq THEN
    RAISE EXCEPTION 'world_seq must equal the latest world event sequence';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER world_events_before_insert_validate_seq
BEFORE INSERT ON world_events
FOR EACH ROW EXECUTE FUNCTION mirror_assert_world_event_seq();--> statement-breakpoint
CREATE TRIGGER world_events_append_only
BEFORE UPDATE OR DELETE ON world_events
FOR EACH ROW EXECUTE FUNCTION mirror_assert_world_event_immutable();--> statement-breakpoint
CREATE TRIGGER worlds_before_world_seq_update
BEFORE UPDATE OF world_seq ON worlds
FOR EACH ROW EXECUTE FUNCTION mirror_assert_world_seq_update();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER world_events_seq_consistency
AFTER INSERT ON world_events
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION mirror_assert_world_event_consistency();
