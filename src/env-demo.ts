import { z } from "zod";

export const demoUser = z
  .object({ email: z.email().default("dispatcher@example.com"), password: z.string().min(8) })
  .parse({ email: process.env.DEMO_USER_EMAIL, password: process.env.DEMO_USER_PASSWORD });
