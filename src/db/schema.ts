import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { documentKinds, maxDocumentBytes, vehicleClasses, vehicleStatuses } from "@/domain/fleet";
import { tripStatuses } from "@/domain/trip-status";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

const createdAt = () => timestamptz("created_at").defaultNow().notNull();
const updatedAt = () =>
  timestamptz("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamptz("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const healthChecks = pgTable(
  "health_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
  },
  (table) => [
    check("health_checks_label_length", sql`char_length(${table.label}) between 1 and 60`),
    index("health_checks_created_at_idx").on(table.createdAt),
  ],
);

export const tripStatus = pgEnum("trip_status", tripStatuses);
export const vehicleClass = pgEnum("vehicle_class", vehicleClasses);
export const vehicleStatus = pgEnum("vehicle_status", vehicleStatuses);
export const documentKind = pgEnum("document_kind", documentKinds);

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    photoKey: text("photo_key"),
    vehicleClass: vehicleClass("vehicle_class").notNull(),
    onDuty: boolean("on_duty").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("drivers_name_present", sql`char_length(btrim(${table.name})) > 0`),
    index("drivers_on_duty_class_idx").on(table.onDuty, table.vehicleClass),
  ],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    model: text("model").notNull(),
    unitNumber: text("unit_number").notNull().unique(),
    plate: text("plate").notNull().unique(),
    vehicleClass: vehicleClass("vehicle_class").notNull(),
    status: vehicleStatus("status").default("ready").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("vehicles_status_idx").on(table.status)],
);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: integer("reference").generatedAlwaysAsIdentity({ startWith: 1001 }).notNull().unique(),
    customerName: text("customer_name").notNull(),
    pickupAddress: text("pickup_address").notNull(),
    dropoffAddress: text("dropoff_address").notNull(),
    pickupAt: timestamptz("pickup_at").notNull(),
    durationMinutes: integer("duration_minutes").default(60).notNull(),
    passengers: integer("passengers").notNull(),
    vehicleClass: vehicleClass("vehicle_class").notNull(),
    fareCents: integer("fare_cents").notNull(),
    status: tripStatus("status").default("offer").notNull(),
    driverId: uuid("driver_id").references(() => drivers.id),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("trips_customer_present", sql`char_length(btrim(${table.customerName})) > 0`),
    check("trips_duration_range", sql`${table.durationMinutes} between 15 and 720`),
    check("trips_passengers_range", sql`${table.passengers} between 1 and 14`),
    check("trips_fare_not_negative", sql`${table.fareCents} >= 0`),
    check(
      "trips_driver_matches_status",
      sql`case ${table.status}
        when 'offer' then ${table.driverId} is null
        when 'cancelled' then true
        else ${table.driverId} is not null
      end`,
    ),
    check(
      "trips_cancel_reason_matches_status",
      sql`(${table.status} = 'cancelled') = (${table.cancelReason} is not null and char_length(btrim(${table.cancelReason})) > 0)`,
    ),
    index("trips_status_pickup_at_idx").on(table.status, table.pickupAt),
    index("trips_pickup_at_idx").on(table.pickupAt),
    index("trips_driver_id_pickup_at_idx").on(table.driverId, table.pickupAt),
    index("trips_customer_name_trgm_idx").using("gin", sql`${table.customerName} gin_trgm_ops`),
  ],
);

export const tripEvents = pgTable(
  "trip_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    fromStatus: tripStatus("from_status"),
    toStatus: tripStatus("to_status").notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (table) => [
    index("trip_events_trip_id_created_at_idx").on(table.tripId, table.createdAt),
    index("trip_events_created_at_idx").on(table.createdAt),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: documentKind("kind").notNull(),
    driverId: uuid("driver_id").references(() => drivers.id),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id),
    storageKey: text("storage_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "documents_owner_matches_kind",
      sql`case ${table.kind}
        when 'driver_license' then ${table.driverId} is not null and ${table.vehicleId} is null
        when 'vehicle_registration' then ${table.vehicleId} is not null and ${table.driverId} is null
      end`,
    ),
    check(
      "documents_content_type_allowed",
      sql`${table.contentType} in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')`,
    ),
    check("documents_size_limit", sql`${table.sizeBytes} between 1 and ${sql.raw(String(maxDocumentBytes))}`),
    index("documents_driver_id_idx").on(table.driverId),
    index("documents_vehicle_id_idx").on(table.vehicleId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const healthCheckRelations = relations(healthChecks, ({ one }) => ({
  recordedBy: one(user, { fields: [healthChecks.recordedBy], references: [user.id] }),
}));

export const driverRelations = relations(drivers, ({ many }) => ({
  trips: many(trips),
  documents: many(documents),
}));

export const vehicleRelations = relations(vehicles, ({ many }) => ({
  documents: many(documents),
}));

export const tripRelations = relations(trips, ({ one, many }) => ({
  driver: one(drivers, { fields: [trips.driverId], references: [drivers.id] }),
  events: many(tripEvents),
}));

export const tripEventRelations = relations(tripEvents, ({ one }) => ({
  trip: one(trips, { fields: [tripEvents.tripId], references: [trips.id] }),
  actor: one(user, { fields: [tripEvents.actorId], references: [user.id] }),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  driver: one(drivers, { fields: [documents.driverId], references: [drivers.id] }),
  vehicle: one(vehicles, { fields: [documents.vehicleId], references: [vehicles.id] }),
  uploadedBy: one(user, { fields: [documents.uploadedBy], references: [user.id] }),
}));
