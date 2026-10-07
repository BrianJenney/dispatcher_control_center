import { z } from "zod";

export const passengerCount = z.number().int().min(1);

export function isFull(passengers: number, seats: number): boolean {
  return passengers >= seats;
}
