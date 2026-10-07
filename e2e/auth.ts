import { test, type Page } from "@playwright/test";
import { env } from "@/env";

export async function signInAsDemoUser(page: Page) {
  const origin = test.info().project.use.baseURL ?? "";
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD },
    headers: { origin },
  });
  if (!response.ok()) throw new Error(`Demo sign-in failed with status ${response.status()}`);
}
