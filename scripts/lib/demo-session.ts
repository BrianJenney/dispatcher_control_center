import type { APIRequestContext, Page } from "@playwright/test";
import { tourStorageKey } from "@/domain/tour";
import { demoUser } from "@/env-demo";

export async function signInAsDemoUser(request: APIRequestContext, baseUrl: string) {
  const response = await request.post(`${baseUrl}/api/auth/sign-in/email`, {
    data: demoUser,
    headers: { origin: baseUrl },
  });
  if (!response.ok()) throw new Error(`Demo sign-in failed with status ${String(response.status())}`);
}

type StorageState = Awaited<ReturnType<APIRequestContext["storageState"]>>;

export function withTourDismissed(state: StorageState, baseUrl: string): StorageState {
  const origin = new URL(baseUrl).origin;
  return {
    ...state,
    origins: [
      ...state.origins.filter((entry) => entry.origin !== origin),
      { origin, localStorage: [{ name: tourStorageKey, value: "done" }] },
    ],
  };
}

export function dismissTourOnEveryPage(page: Page) {
  return page.addInitScript((key) => {
    localStorage.setItem(key, "done");
  }, tourStorageKey);
}
