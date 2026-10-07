import { test } from "@playwright/test";
import { signInAsDemoUser } from "../scripts/lib/demo-session";
import { flows } from "../scripts/verify/flows";

for (const [name, flow] of Object.entries(flows)) {
  test(`${name} flow from the feature map`, async ({ page, baseURL }) => {
    await signInAsDemoUser(page.request, baseURL ?? "");
    for (const step of flow.steps) {
      await test.step(step.name, () => step.run(page));
    }
  });
}
