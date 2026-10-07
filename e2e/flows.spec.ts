import { test } from "@playwright/test";
import { databaseUrlNamed } from "../scripts/lib/database";
import { flows, runStep } from "../scripts/verify/flows";
import { flowDatabase } from "../scripts/verify/flows/context";

for (const [name, flow] of Object.entries(flows)) {
  test.describe(`${name} flow`, () => {
    if (!flow.startsSignedIn) test.use({ storageState: { cookies: [], origins: [] } });

    test(`${name} flow from the feature map`, async ({ page }) => {
      const database = flowDatabase(databaseUrlNamed("dispatch_e2e"));
      try {
        for (const step of flow.steps) {
          await test.step(step.name, () => runStep(step, database.contextFor(page)));
        }
      } finally {
        await database.close();
      }
    });
  });
}
