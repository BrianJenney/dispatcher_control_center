import { z } from "zod";
import { vehicleClasses, vehicleStatuses, type VehicleStatus } from "@/domain/fleet";
import { documentRow } from "@/domain/uploads";

export const driverInput = z.object({
  name: z.string().trim().min(1, "Enter the driver's name.").max(80, "Keep the name to 80 characters."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{7,20}$/, "Enter a phone number, like (212) 555-0142."),
  vehicleClass: z.enum(vehicleClasses, "Choose the class this driver drives."),
});

export const updateDriverInput = driverInput.extend({ driverId: z.uuid() });

export const driverRow = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  vehicleClass: z.enum(vehicleClasses),
  onDuty: z.boolean(),
  photoVersion: z.string().nullable(),
  tripsToday: z.number().int(),
  licenses: z.number().int(),
});

export type DriverRow = z.infer<typeof driverRow>;

export const driversSnapshot = z.object({ drivers: z.array(driverRow) });

export type DriversSnapshot = z.infer<typeof driversSnapshot>;

export const driverProfile = driverRow
  .pick({ id: true, name: true, phone: true, vehicleClass: true, onDuty: true, photoVersion: true })
  .extend({ documents: z.array(documentRow) });

export type DriverProfile = z.infer<typeof driverProfile>;

export type DriverData = DriversSnapshot | DriverProfile;

export function withDriverOnDuty(data: DriverData, driverId: string, onDuty: boolean): DriverData {
  if ("drivers" in data) {
    return { ...data, drivers: data.drivers.map((driver) => (driver.id === driverId ? { ...driver, onDuty } : driver)) };
  }
  return data.id === driverId ? { ...data, onDuty } : data;
}

export const vehicleInput = z.object({
  model: z.string().trim().min(1, "Enter the make and model.").max(80, "Keep the model to 80 characters."),
  unitNumber: z.string().trim().min(1, "Enter the fleet number, like DL-112.").max(20, "Keep the fleet number to 20 characters."),
  plate: z
    .string()
    .trim()
    .min(2, "Enter the plate as it appears on the vehicle.")
    .max(12, "Plates are 12 characters or fewer.")
    .transform((plate) => plate.toUpperCase()),
  vehicleClass: z.enum(vehicleClasses, "Choose the vehicle class."),
});

export const updateVehicleInput = vehicleInput.extend({ vehicleId: z.uuid() });

export const vehicleRow = z.object({
  id: z.uuid(),
  model: z.string(),
  unitNumber: z.string(),
  plate: z.string(),
  vehicleClass: z.enum(vehicleClasses),
  status: z.enum(vehicleStatuses),
  photoVersion: z.string().nullable(),
  registrations: z.number().int(),
});

export type VehicleRow = z.infer<typeof vehicleRow>;

export const fleetSnapshot = z.object({ vehicles: z.array(vehicleRow) });

export type FleetSnapshot = z.infer<typeof fleetSnapshot>;

export const vehicleProfile = vehicleRow
  .pick({ id: true, model: true, unitNumber: true, plate: true, vehicleClass: true, status: true, photoVersion: true })
  .extend({ documents: z.array(documentRow) });

export type VehicleProfile = z.infer<typeof vehicleProfile>;

export type VehicleData = FleetSnapshot | VehicleProfile;

export function withVehicleStatus(data: VehicleData, vehicleId: string, status: VehicleStatus): VehicleData {
  if ("vehicles" in data) {
    return { ...data, vehicles: data.vehicles.map((vehicle) => (vehicle.id === vehicleId ? { ...vehicle, status } : vehicle)) };
  }
  return data.id === vehicleId ? { ...data, status } : data;
}
