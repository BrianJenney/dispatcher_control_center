import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  rateLimit: {
    storage: "database",
    customRules: { "/sign-in/email": { window: 60, max: 10 } },
  },
  plugins: [nextCookies()],
});
