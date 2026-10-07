CREATE TYPE "public"."document_kind" AS ENUM('driver_license', 'vehicle_registration');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('offer', 'assigned', 'en_route', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."vehicle_class" AS ENUM('luxury_sedan', 'executive_suv', 'group_suv', 'executive_van');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('ready', 'in_service');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "document_kind" NOT NULL,
	"driver_id" uuid,
	"vehicle_id" uuid,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "documents_owner_matches_kind" CHECK (case "documents"."kind"
        when 'driver_license' then "documents"."driver_id" is not null and "documents"."vehicle_id" is null
        when 'vehicle_registration' then "documents"."vehicle_id" is not null and "documents"."driver_id" is null
      end),
	CONSTRAINT "documents_content_type_allowed" CHECK ("documents"."content_type" in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "documents_size_limit" CHECK ("documents"."size_bytes" between 1 and 10485760)
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"photo_key" text,
	"vehicle_class" "vehicle_class" NOT NULL,
	"on_duty" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_name_present" CHECK (char_length(btrim("drivers"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "trip_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"from_status" "trip_status",
	"to_status" "trip_status" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" integer GENERATED ALWAYS AS IDENTITY (sequence name "trips_reference_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"customer_name" text NOT NULL,
	"pickup_address" text NOT NULL,
	"dropoff_address" text NOT NULL,
	"pickup_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"passengers" integer NOT NULL,
	"vehicle_class" "vehicle_class" NOT NULL,
	"fare_cents" integer NOT NULL,
	"status" "trip_status" DEFAULT 'offer' NOT NULL,
	"driver_id" uuid,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trips_reference_unique" UNIQUE("reference"),
	CONSTRAINT "trips_customer_present" CHECK (char_length(btrim("trips"."customer_name")) > 0),
	CONSTRAINT "trips_duration_range" CHECK ("trips"."duration_minutes" between 15 and 720),
	CONSTRAINT "trips_passengers_range" CHECK ("trips"."passengers" between 1 and 14),
	CONSTRAINT "trips_fare_not_negative" CHECK ("trips"."fare_cents" >= 0),
	CONSTRAINT "trips_driver_matches_status" CHECK (case "trips"."status"
        when 'offer' then "trips"."driver_id" is null
        when 'cancelled' then true
        else "trips"."driver_id" is not null
      end),
	CONSTRAINT "trips_cancel_reason_matches_status" CHECK (("trips"."status" = 'cancelled') = ("trips"."cancel_reason" is not null and char_length(btrim("trips"."cancel_reason")) > 0))
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"unit_number" text NOT NULL,
	"plate" text NOT NULL,
	"vehicle_class" "vehicle_class" NOT NULL,
	"status" "vehicle_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_unit_number_unique" UNIQUE("unit_number"),
	CONSTRAINT "vehicles_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_driver_id_idx" ON "documents" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "documents_vehicle_id_idx" ON "documents" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "drivers_on_duty_class_idx" ON "drivers" USING btree ("on_duty","vehicle_class");--> statement-breakpoint
CREATE INDEX "trip_events_trip_id_created_at_idx" ON "trip_events" USING btree ("trip_id","created_at");--> statement-breakpoint
CREATE INDEX "trip_events_created_at_idx" ON "trip_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trips_status_pickup_at_idx" ON "trips" USING btree ("status","pickup_at");--> statement-breakpoint
CREATE INDEX "trips_pickup_at_idx" ON "trips" USING btree ("pickup_at");--> statement-breakpoint
CREATE INDEX "trips_driver_id_pickup_at_idx" ON "trips" USING btree ("driver_id","pickup_at");--> statement-breakpoint
CREATE INDEX "trips_customer_name_trgm_idx" ON "trips" USING gin ("customer_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status");