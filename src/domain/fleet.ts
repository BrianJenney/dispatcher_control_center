export const vehicleClasses = ["luxury_sedan", "executive_suv", "group_suv", "executive_van"] as const;
export type VehicleClass = (typeof vehicleClasses)[number];

export const vehicleClassLabels: Record<VehicleClass, string> = {
  luxury_sedan: "Luxury sedan",
  executive_suv: "Executive SUV",
  group_suv: "Group SUV",
  executive_van: "Executive van",
};

export const maxPassengers: Record<VehicleClass, number> = {
  luxury_sedan: 3,
  executive_suv: 5,
  group_suv: 6,
  executive_van: 12,
};

export const vehicleStatuses = ["ready", "in_service"] as const;
export type VehicleStatus = (typeof vehicleStatuses)[number];

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  ready: "Ready",
  in_service: "In service",
};

export const documentKinds = ["driver_license", "vehicle_registration"] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const documentContentTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const maxDocumentBytes = 10 * 1024 * 1024;
