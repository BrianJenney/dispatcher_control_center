import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { test as setup } from "@playwright/test";
import { signInAsDemoUser, withTourDismissed } from "../scripts/lib/demo-session";

export const demoSession = "playwright/.auth/demo.json";

setup("sign in as the demo dispatcher", async ({ request, baseURL }) => {
  await signInAsDemoUser(request, baseURL ?? "");
  const state = withTourDismissed(await request.storageState(), baseURL ?? "");
  await mkdir(path.dirname(demoSession), { recursive: true });
  await writeFile(demoSession, JSON.stringify(state));
});
