import { test as setup } from "@playwright/test";
import { signInAsDemoUser } from "../scripts/lib/demo-session";

export const demoSession = "playwright/.auth/demo.json";

setup("sign in as the demo dispatcher", async ({ request, baseURL }) => {
  await signInAsDemoUser(request, baseURL ?? "");
  await request.storageState({ path: demoSession });
});
