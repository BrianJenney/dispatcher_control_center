import type { VehicleClass, VehicleStatus } from "@/domain/fleet";

export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(next() * items.length)];
    if (item === undefined) throw new Error("Cannot pick from an empty list.");
    return item;
  };
  return { next, pick };
}

export type Random = ReturnType<typeof createRandom>;

const areaCodes = ["212", "415", "617", "802"] as const;

export function fakePhone(index: number): string {
  const areaCode = areaCodes[index % areaCodes.length] ?? "555";
  return `(${areaCode}) 555-01${String(index % 100).padStart(2, "0")}`;
}

export const seedDrivers: readonly { name: string; vehicleClass: VehicleClass; onDuty: boolean }[] = [
  { name: "Adele Fairbanks", vehicleClass: "luxury_sedan", onDuty: true },
  { name: "Bastian Okoro", vehicleClass: "luxury_sedan", onDuty: true },
  { name: "Camille Duarte", vehicleClass: "luxury_sedan", onDuty: true },
  { name: "Desmond Whitlock", vehicleClass: "luxury_sedan", onDuty: false },
  { name: "Esme Calloway", vehicleClass: "luxury_sedan", onDuty: true },
  { name: "Felix Marchetti", vehicleClass: "executive_suv", onDuty: true },
  { name: "Greta Lindqvist", vehicleClass: "executive_suv", onDuty: true },
  { name: "Hollis Abernathy", vehicleClass: "executive_suv", onDuty: false },
  { name: "Ines Varga", vehicleClass: "executive_suv", onDuty: true },
  { name: "Jonah Pembrook", vehicleClass: "group_suv", onDuty: true },
  { name: "Kiri Matsuda", vehicleClass: "group_suv", onDuty: false },
  { name: "Leopold Achebe", vehicleClass: "executive_van", onDuty: true },
  { name: "Mireille Santos", vehicleClass: "executive_van", onDuty: true },
  { name: "Nils Brannigan", vehicleClass: "executive_van", onDuty: false },
];

export const seedVehicles: readonly { model: string; vehicleClass: VehicleClass; status: VehicleStatus }[] = [
  { model: "Mercedes-Benz S 580", vehicleClass: "luxury_sedan", status: "ready" },
  { model: "Mercedes-Benz S 580", vehicleClass: "luxury_sedan", status: "ready" },
  { model: "BMW 740i", vehicleClass: "luxury_sedan", status: "ready" },
  { model: "Genesis G90", vehicleClass: "luxury_sedan", status: "in_service" },
  { model: "Cadillac Escalade ESV", vehicleClass: "executive_suv", status: "ready" },
  { model: "Lincoln Navigator L", vehicleClass: "executive_suv", status: "ready" },
  { model: "Cadillac Escalade ESV", vehicleClass: "executive_suv", status: "in_service" },
  { model: "GMC Yukon Denali XL", vehicleClass: "group_suv", status: "ready" },
  { model: "Chevrolet Suburban Premier", vehicleClass: "group_suv", status: "ready" },
  { model: "Mercedes-Benz Sprinter Executive", vehicleClass: "executive_van", status: "ready" },
  { model: "Mercedes-Benz Sprinter Executive", vehicleClass: "executive_van", status: "ready" },
  { model: "Ford Transit Limousine", vehicleClass: "executive_van", status: "in_service" },
];

const firstNames = [
  "Arden", "Blair", "Corin", "Dana", "Ellery", "Frankie", "Gale", "Harper", "Indy", "Jules",
  "Kendall", "Lane", "Marlow", "Noel", "Oakley", "Parker", "Quinn", "Reese", "Sasha", "Tatum",
] as const;

const lastNames = [
  "Ashdown", "Birchfield", "Coldwater", "Dunmore", "Everly", "Foxworth", "Greystone", "Hollins",
  "Ivesdale", "Jessop", "Kingsley", "Larkspur", "Merriweather", "Northcott", "Oldham", "Prescott",
] as const;

const companies = [
  "Aurora Events Co.", "Bellwether Partners", "Copperline Studios", "Driftwood Weddings",
  "Evergreen Advisory", "Fairhaven Group", "Granite Peak Ventures", "Halcyon Productions",
] as const;

const places = [
  "Regional Airport, Terminal A", "Regional Airport, Terminal B", "Harborview Hotel", "Northgate Rail Station",
  "Lakeside Conference Center", "Maple Ridge Inn", "Cedar Point Marina", "Westbrook Medical Center",
  "Grand Avenue Theater", "Summit Country Club", "Riverside Convention Hall", "Old Mill Winery",
] as const;

const streets = ["Juniper Lane", "Alder Court", "Whitfield Road", "Quarry Hill Drive", "Brookside Way", "Linden Terrace"] as const;

export function fakeCustomer(random: Random): string {
  if (random.next() < 0.25) return random.pick(companies);
  return `${random.pick(firstNames)} ${random.pick(lastNames)}`;
}

export function fakeAddress(random: Random): string {
  if (random.next() < 0.6) return random.pick(places);
  return `${String(10 + Math.floor(random.next() * 980))} ${random.pick(streets)}`;
}

export function fakeLoadDriverName(index: number): string {
  const first = firstNames[index % firstNames.length] ?? "Driver";
  const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length] ?? "Load";
  return `${first} ${last} ${String(index + 1)}`;
}

export const fareBaseCents: Record<VehicleClass, number> = {
  luxury_sedan: 9_500,
  executive_suv: 14_500,
  group_suv: 17_500,
  executive_van: 22_500,
};

export const maxPassengers: Record<VehicleClass, number> = {
  luxury_sedan: 3,
  executive_suv: 5,
  group_suv: 6,
  executive_van: 12,
};

export const cancelReasons = [
  "Client changed plans",
  "Flight cancelled",
  "Booked twice by mistake",
  "Client arranged other transport",
] as const;
