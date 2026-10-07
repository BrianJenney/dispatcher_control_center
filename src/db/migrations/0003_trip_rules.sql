CREATE FUNCTION trip_window(pickup_at timestamptz, duration_minutes integer)
RETURNS tstzrange
LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN tstzrange(pickup_at, pickup_at + make_interval(mins => duration_minutes), '[)');
--> statement-breakpoint
ALTER TABLE trips ADD CONSTRAINT trips_no_overlapping_driver_trips
  EXCLUDE USING gist (driver_id WITH =, trip_window(pickup_at, duration_minutes) WITH &&)
  WHERE (status IN ('assigned', 'en_route'));
--> statement-breakpoint
CREATE FUNCTION trip_transition_allowed(from_status trip_status, to_status trip_status)
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN (from_status::text, to_status::text) IN (
  ('offer', 'assigned'),
  ('offer', 'cancelled'),
  ('assigned', 'en_route'),
  ('assigned', 'cancelled'),
  ('en_route', 'completed'),
  ('en_route', 'cancelled')
);
--> statement-breakpoint
CREATE FUNCTION trips_guard_status() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status <> 'offer' THEN
    RAISE EXCEPTION 'A new trip must start as an offer, not %.', NEW.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_status_transition';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT trip_transition_allowed(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'A trip cannot move from % to %.', OLD.status, NEW.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_status_transition';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trips_guard_status
  BEFORE INSERT OR UPDATE OF status ON trips
  FOR EACH ROW EXECUTE FUNCTION trips_guard_status();
--> statement-breakpoint
CREATE FUNCTION trips_require_event() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  previous trip_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM trip_events
    WHERE trip_id = NEW.id
      AND to_status = NEW.status
      AND from_status IS NOT DISTINCT FROM previous
      AND created_at = now()
  ) THEN
    RAISE EXCEPTION 'Trip % moved from % to % without a trip_events row.', NEW.id, coalesce(previous::text, 'nothing'), NEW.status
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_event_required';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trips_require_event_on_insert
  AFTER INSERT ON trips
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trips_require_event();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trips_require_event_on_status_change
  AFTER UPDATE OF status ON trips
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trips_require_event();
--> statement-breakpoint
CREATE FUNCTION trip_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'trip_events is an append-only history.'
    USING ERRCODE = 'check_violation', CONSTRAINT = 'trip_events_append_only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trip_events_append_only
  BEFORE UPDATE OR DELETE ON trip_events
  FOR EACH ROW EXECUTE FUNCTION trip_events_append_only();
