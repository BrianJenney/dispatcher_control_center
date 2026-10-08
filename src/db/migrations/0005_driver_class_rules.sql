CREATE FUNCTION trips_require_driver_class() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  driver_class vehicle_class;
BEGIN
  IF NEW.driver_id IS NULL OR NEW.status NOT IN ('assigned', 'en_route') THEN
    RETURN NEW;
  END IF;
  SELECT vehicle_class INTO driver_class FROM drivers WHERE id = NEW.driver_id FOR SHARE;
  IF FOUND AND driver_class <> NEW.vehicle_class THEN
    RAISE EXCEPTION 'Trip % needs a % but driver % drives a %.', NEW.id, NEW.vehicle_class, NEW.driver_id, driver_class
      USING ERRCODE = 'check_violation', CONSTRAINT = 'trips_driver_class_matches';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trips_require_driver_class
  BEFORE INSERT OR UPDATE OF driver_id, status, vehicle_class ON trips
  FOR EACH ROW EXECUTE FUNCTION trips_require_driver_class();
--> statement-breakpoint
CREATE FUNCTION drivers_guard_class_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM trips
    WHERE driver_id = NEW.id
      AND status IN ('assigned', 'en_route')
      AND vehicle_class <> NEW.vehicle_class
  ) THEN
    RAISE EXCEPTION 'Driver % still holds assigned or en route trips in %.', NEW.id, OLD.vehicle_class
      USING ERRCODE = 'check_violation', CONSTRAINT = 'drivers_class_matches_active_trips';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER drivers_guard_class_change
  BEFORE UPDATE OF vehicle_class ON drivers
  FOR EACH ROW WHEN (OLD.vehicle_class IS DISTINCT FROM NEW.vehicle_class)
  EXECUTE FUNCTION drivers_guard_class_change();
