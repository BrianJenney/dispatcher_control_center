CREATE TYPE "public"."trip_detail_field" AS ENUM('customer_name', 'pickup_address', 'dropoff_address', 'pickup_at', 'duration_minutes', 'passengers', 'vehicle_class', 'fare_cents');--> statement-breakpoint
CREATE TABLE "trip_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"field" "trip_detail_field" NOT NULL,
	"from_text" text,
	"to_text" text,
	"from_integer" integer,
	"to_integer" integer,
	"from_time" timestamp with time zone,
	"to_time" timestamp with time zone,
	"from_class" "vehicle_class",
	"to_class" "vehicle_class",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_edits_values_match_field" CHECK (num_nonnulls("trip_edits"."from_text", "trip_edits"."to_text", "trip_edits"."from_integer", "trip_edits"."to_integer", "trip_edits"."from_time", "trip_edits"."to_time", "trip_edits"."from_class", "trip_edits"."to_class") = 2
        and (case
          when "trip_edits"."field" in ('customer_name', 'pickup_address', 'dropoff_address') then "trip_edits"."from_text" <> "trip_edits"."to_text"
          when "trip_edits"."field" in ('duration_minutes', 'passengers', 'fare_cents') then "trip_edits"."from_integer" <> "trip_edits"."to_integer"
          when "trip_edits"."field" = 'pickup_at' then "trip_edits"."from_time" <> "trip_edits"."to_time"
          when "trip_edits"."field" = 'vehicle_class' then "trip_edits"."from_class" <> "trip_edits"."to_class"
        end) is true)
);
--> statement-breakpoint
ALTER TABLE "trip_events" ADD COLUMN "from_driver_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_events" ADD COLUMN "to_driver_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_edits" ADD CONSTRAINT "trip_edits_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_edits" ADD CONSTRAINT "trip_edits_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_edits_trip_id_created_at_idx" ON "trip_edits" USING btree ("trip_id","created_at");--> statement-breakpoint
CREATE INDEX "trip_edits_created_at_idx" ON "trip_edits" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_from_driver_id_drivers_id_fk" FOREIGN KEY ("from_driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_to_driver_id_drivers_id_fk" FOREIGN KEY ("to_driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE OR REPLACE FUNCTION trips_require_event() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  previous_status trip_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END;
  previous_driver uuid := CASE WHEN TG_OP = 'UPDATE' THEN OLD.driver_id END;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM trip_events
    WHERE trip_id = NEW.id
      AND to_status = NEW.status
      AND from_status IS NOT DISTINCT FROM previous_status
      AND to_driver_id IS NOT DISTINCT FROM NEW.driver_id
      AND from_driver_id IS NOT DISTINCT FROM previous_driver
      AND created_at = now()
  ) THEN
    RAISE EXCEPTION 'Trip % moved from % to % without a matching trip_events row.', NEW.id, coalesce(previous_status::text, 'nothing'), NEW.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_event_required';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
DROP TRIGGER trips_require_event_on_status_change ON trips;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trips_require_event_on_change
  AFTER UPDATE OF status, driver_id ON trips
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.driver_id IS DISTINCT FROM NEW.driver_id)
  EXECUTE FUNCTION trips_require_event();
--> statement-breakpoint
CREATE FUNCTION trips_require_edit() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  unrecorded trip_detail_field;
BEGIN
  SELECT changed.field INTO unrecorded
  FROM (VALUES
    ('customer_name'::trip_detail_field, OLD.customer_name, NEW.customer_name),
    ('pickup_address', OLD.pickup_address, NEW.pickup_address),
    ('dropoff_address', OLD.dropoff_address, NEW.dropoff_address),
    ('pickup_at', OLD.pickup_at::text, NEW.pickup_at::text),
    ('duration_minutes', OLD.duration_minutes::text, NEW.duration_minutes::text),
    ('passengers', OLD.passengers::text, NEW.passengers::text),
    ('vehicle_class', OLD.vehicle_class::text, NEW.vehicle_class::text),
    ('fare_cents', OLD.fare_cents::text, NEW.fare_cents::text)
  ) AS changed (field, before, after)
  WHERE changed.before IS DISTINCT FROM changed.after
    AND NOT EXISTS (
      SELECT 1 FROM trip_edits
      WHERE trip_id = NEW.id
        AND field = changed.field
        AND coalesce(from_text, from_integer::text, from_time::text, from_class::text) = changed.before
        AND coalesce(to_text, to_integer::text, to_time::text, to_class::text) = changed.after
        AND created_at = now()
    )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Trip % changed % without a matching trip_edits row.', NEW.id, unrecorded
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_edit_required';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trips_require_edit
  AFTER UPDATE OF customer_name, pickup_address, dropoff_address, pickup_at, duration_minutes, passengers, vehicle_class, fare_cents ON trips
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trips_require_edit();
--> statement-breakpoint
CREATE FUNCTION history_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is an append-only history.', TG_TABLE_NAME
    USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_append_only';
END;
$$;
--> statement-breakpoint
DROP TRIGGER trip_events_append_only ON trip_events;
--> statement-breakpoint
DROP FUNCTION trip_events_append_only();
--> statement-breakpoint
CREATE TRIGGER trip_events_append_only
  BEFORE UPDATE OR DELETE ON trip_events
  FOR EACH ROW EXECUTE FUNCTION history_append_only();
--> statement-breakpoint
CREATE TRIGGER trip_edits_append_only
  BEFORE UPDATE OR DELETE ON trip_edits
  FOR EACH ROW EXECUTE FUNCTION history_append_only();
