import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { rollDemoDayForward } from "@/db/seed";
import { env } from "@/env";

export async function rollDemoDay() {
  const [dispatcher] = await db.select({ id: user.id }).from(user).orderBy(asc(user.createdAt)).limit(1);
  if (!dispatcher) return { closed: 0, added: 0 };
  return rollDemoDayForward(db, { actorId: dispatcher.id, now: new Date(), timeZone: env.APP_TIMEZONE });
}
