import type { APIRequestContext } from "@playwright/test";
import { env } from "@/env";

export async function signInAsDemoUser(request: APIRequestContext, baseUrl: string) {
  const response = await request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD },
    headers: { origin: baseUrl },
  });
  if (!response.ok()) throw new Error(`Demo sign-in failed with status ${String(response.status())}`);
}
