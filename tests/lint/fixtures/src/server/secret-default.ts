import { z } from "zod";

export const settings = z.object({
  ADMIN_PASSWORD: z.string().min(8).default("correct-horse-battery"),
});
