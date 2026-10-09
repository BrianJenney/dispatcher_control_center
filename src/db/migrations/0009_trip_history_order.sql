CREATE SEQUENCE "public"."trip_history_order" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "trip_edits" ADD COLUMN "history_order" bigint;--> statement-breakpoint
ALTER TABLE "trip_events" ADD COLUMN "history_order" bigint;--> statement-breakpoint
ALTER TABLE "trip_edits" DISABLE TRIGGER trip_edits_append_only;--> statement-breakpoint
ALTER TABLE "trip_events" DISABLE TRIGGER trip_events_append_only;--> statement-breakpoint
WITH history AS (
  SELECT 'event' AS kind, id, created_at,
    CASE to_status WHEN 'offer' THEN 0 WHEN 'assigned' THEN 1 WHEN 'en_route' THEN 2 ELSE 3 END AS step
  FROM trip_events
  UNION ALL
  SELECT 'edit', id, created_at, 4 FROM trip_edits
),
ordered AS (
  SELECT kind, id, row_number() OVER (ORDER BY created_at, step, id) AS position FROM history
),
events AS (
  UPDATE trip_events SET history_order = ordered.position
  FROM ordered WHERE ordered.kind = 'event' AND ordered.id = trip_events.id
)
UPDATE trip_edits SET history_order = ordered.position
FROM ordered WHERE ordered.kind = 'edit' AND ordered.id = trip_edits.id;--> statement-breakpoint
ALTER TABLE "trip_edits" ENABLE TRIGGER trip_edits_append_only;--> statement-breakpoint
ALTER TABLE "trip_events" ENABLE TRIGGER trip_events_append_only;--> statement-breakpoint
SELECT setval('trip_history_order', (SELECT coalesce(max(history_order), 0) + 1 FROM (SELECT history_order FROM trip_events UNION ALL SELECT history_order FROM trip_edits) AS recorded), false);--> statement-breakpoint
ALTER TABLE "trip_edits" ALTER COLUMN "history_order" SET DEFAULT nextval('trip_history_order');--> statement-breakpoint
ALTER TABLE "trip_events" ALTER COLUMN "history_order" SET DEFAULT nextval('trip_history_order');--> statement-breakpoint
ALTER TABLE "trip_edits" ALTER COLUMN "history_order" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_events" ALTER COLUMN "history_order" SET NOT NULL;
