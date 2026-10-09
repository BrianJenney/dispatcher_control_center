import { z } from "zod";
import { activityEntry } from "@/domain/activity";
import { tripRow } from "@/domain/trip-row";

export const tripHistoryLimit = 50;

export const tripDetail = z.object({ trip: tripRow, history: z.array(activityEntry) });

export type TripDetail = z.infer<typeof tripDetail>;
