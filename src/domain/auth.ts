import { z } from "zod";

export const signInInput = z.object({
  email: z.string().trim().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export const inAppPath = /^\/(?!\/)[^\s\\]*$/;

export const safeRedirectPath = z.string().regex(inAppPath).catch("/");

export type AppAddresses = { configured?: string | undefined; deployment?: string | undefined; branch?: string | undefined };

function httpsOrigin(host: string | undefined): string | null {
  return host ? `https://${host}` : null;
}

export function appOrigins({ configured, deployment, branch }: AppAddresses): { baseUrl: string | null; trusted: string[] } {
  const known = [configured ?? null, httpsOrigin(branch), httpsOrigin(deployment)].filter((origin) => origin !== null);
  return { baseUrl: known[0] ?? null, trusted: [...new Set(known)] };
}
