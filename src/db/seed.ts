import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { account, user } from "@/db/schema";

export type SeedOptions = {
  demoUser: { email: string; password: string };
};

async function seedDemoUser(db: Database, demo: SeedOptions["demoUser"]) {
  const existing = await db.query.user.findFirst({ where: eq(user.email, demo.email) });
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, name: "Demo Dispatcher", email: demo.email, emailVerified: true });
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(demo.password),
    });
  });
  return id;
}

export async function seed(db: Database, options: SeedOptions) {
  const demoUserId = await seedDemoUser(db, options.demoUser);
  return { demoUserId };
}
