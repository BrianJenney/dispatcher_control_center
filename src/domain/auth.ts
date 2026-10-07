import { z } from "zod";

export const signInInput = z.object({
  email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export const safeRedirectPath = z
  .string()
  .regex(/^\/(?!\/)[^\s\\]*$/)
  .catch("/");
