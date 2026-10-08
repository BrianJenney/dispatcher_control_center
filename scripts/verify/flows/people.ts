import { expect, request as apiRequest, type Page } from "@playwright/test";
import { expectTilesMatchDatabase, openFromNavigation, recordedValues, startRecordingValues, tile, viewportTag } from "./expected";
import type { Flow } from "./types";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const tinyPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

function filePicker(page: Page, label: string) {
  return page.locator(`input[type="file"][aria-label="${label}"]`);
}

let newDriverName = "";

export const drivers: Flow = {
  route: "/drivers",
  startsSignedIn: true,
  steps: [
    {
      name: "the drivers list matches the database",
      run: async (context) => {
        const { page } = context;
        await page.goto("/");
        await openFromNavigation(page, "Drivers");
        const onDuty = await context.number(`select count(*) as value from drivers where on_duty`);
        const total = await context.number(`select count(*) as value from drivers`);
        await expect(page.getByText(`${String(onDuty)} of ${String(total)} drivers on duty`)).toBeVisible();
      },
    },
    {
      name: "putting a driver on duty updates a dashboard in another tab within one polling interval",
      run: async (context) => {
        const { page } = context;
        const dashboard = await page.context().newPage();
        await dashboard.goto("/");
        const before = await context.number(`select count(*) as value from drivers where on_duty`);
        await expect(tile(dashboard, "Drivers on duty")).toHaveText(String(before));
        const card = page.getByRole("list", { name: "Drivers" }).getByRole("article").filter({ hasText: "Off duty" }).first();
        const name = (await card.getAttribute("aria-label")) ?? "";
        await card.getByRole("switch", { name: `${name} on duty` }).click();
        await expect(page.getByRole("article", { name, exact: true }).getByText("On duty", { exact: true })).toBeVisible();
        await expect.poll(() => context.number(`select count(*) as value from drivers where name = $1 and on_duty`, [name])).toBe(1);
        await expect(tile(dashboard, "Drivers on duty")).toHaveText(String(before + 1), { timeout: 7_000 });
        await dashboard.close();
        await openFromNavigation(page, "Dashboard");
        await expectTilesMatchDatabase(context);
      },
    },
    {
      name: "adding a driver checks the fields in plain language",
      run: async ({ page }) => {
        await page.goto("/drivers/new");
        await page.getByRole("button", { name: "Add driver" }).click();
        await expect(page.getByText("Enter the driver's name.")).toBeVisible();
        await expect(page.getByText("Enter a phone number, like (212) 555-0142.")).toBeVisible();
      },
    },
    {
      name: "add a driver and land on their profile",
      run: async (context) => {
        const { page } = context;
        newDriverName = `Verification Driver ${viewportTag(page)} ${String(Date.now()).slice(-6)}`;
        await page.getByRole("textbox", { name: "Full name" }).fill(newDriverName);
        await page.getByRole("textbox", { name: "Phone" }).fill("(415) 555-0177");
        await page.getByRole("button", { name: "Add driver" }).click();
        await expect(page.getByRole("heading", { name: newDriverName })).toBeVisible();
        await expect.poll(() => context.number(`select count(*) as value from drivers where name = $1 and not on_duty`, [newDriverName])).toBe(1);
      },
    },
    {
      name: "upload a photo",
      run: async (context) => {
        const { page } = context;
        await filePicker(page, "Upload photo").setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: onePixelPng });
        await expect(page.getByRole("img", { name: `Photo of ${newDriverName}` })).toBeVisible();
        await expect.poll(() => context.number(`select count(*) as value from drivers where name = $1 and photo_key is not null`, [newDriverName])).toBe(1);
      },
    },
    {
      name: "while saving the fields are locked, and afterwards they keep the new value without flicking back",
      run: async (context) => {
        const { page } = context;
        const phone = page.getByRole("textbox", { name: "Phone" });
        await startRecordingValues(phone);
        await phone.fill("(415) 555-0199");
        await page.route("**/*", async (route) => {
          if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
          await route.continue();
        });
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(phone).toHaveAttribute("readonly");
        await expect.poll(() => context.text(`select phone as value from drivers where name = $1`, [newDriverName])).toBe("(415) 555-0199");
        await expect(page.getByText(`${newDriverName} is updated.`)).toBeVisible();
        await page.unrouteAll({ behavior: "ignoreErrors" });
        await expect(phone).not.toHaveAttribute("readonly");
        await expect(phone).toHaveValue("(415) 555-0199");
        const seen = await recordedValues(phone);
        expect(seen.slice(seen.indexOf("(415) 555-0199"))).toEqual(["(415) 555-0199"]);
      },
    },
  ],
};

export const fleet: Flow = {
  route: "/fleet",
  startsSignedIn: true,
  steps: [
    {
      name: "the fleet list matches the database",
      run: async (context) => {
        const { page } = context;
        await page.goto("/");
        await openFromNavigation(page, "Fleet");
        const ready = await context.number(`select count(*) as value from vehicles where status = 'ready'`);
        const total = await context.number(`select count(*) as value from vehicles`);
        await expect(page.getByText(`${String(ready)} of ${String(total)} vehicles ready`)).toBeVisible();
      },
    },
    {
      name: "each vehicle shows the colour stored in the database",
      run: async (context) => {
        const { page } = context;
        const unit = await context.text(`select unit_number as value from vehicles where color is not null order by unit_number limit 1`);
        const color = await context.text(`select color as value from vehicles where unit_number = $1`, [unit]);
        expect(unit).not.toBeNull();
        expect(color).not.toBeNull();
        await expect(page.getByRole("article", { name: unit ?? "", exact: true }).getByText(color ?? "", { exact: true })).toBeVisible();
      },
    },
    {
      name: "sending a vehicle to service updates a dashboard in another tab within one polling interval",
      run: async (context) => {
        const { page } = context;
        const dashboard = await page.context().newPage();
        await dashboard.goto("/");
        const ready = await context.number(`select count(*) as value from vehicles where status = 'ready'`);
        const total = await context.number(`select count(*) as value from vehicles`);
        await expect(tile(dashboard, "Fleet ready")).toHaveText(`${String(ready)}/${String(total)}`);
        const card = page.getByRole("list", { name: "Vehicles" }).getByRole("article").filter({ hasText: "Ready" }).first();
        const unit = (await card.getAttribute("aria-label")) ?? "";
        await card.getByRole("switch", { name: `${unit} ready` }).click();
        await expect(page.getByRole("article", { name: unit, exact: true }).getByText("In service", { exact: true })).toBeVisible();
        await expect.poll(() => context.number(`select count(*) as value from vehicles where unit_number = $1 and status = 'in_service'`, [unit])).toBe(1);
        await expect(tile(dashboard, "Fleet ready")).toHaveText(`${String(ready - 1)}/${String(total)}`, { timeout: 7_000 });
        await dashboard.close();
        await openFromNavigation(page, "Dashboard");
        await expectTilesMatchDatabase(context);
      },
    },
    {
      name: "a duplicate fleet number is explained",
      run: async (context) => {
        const { page } = context;
        const taken = (await context.text(`select unit_number as value from vehicles order by unit_number limit 1`)) ?? "";
        await page.goto("/fleet/new");
        await page.getByRole("textbox", { name: "Make and model" }).fill("Genesis G90");
        await page.getByRole("textbox", { name: "Fleet number" }).fill(taken);
        await page.getByRole("textbox", { name: "Plate" }).fill(`VF ${String(Date.now()).slice(-5)}`);
        await page.getByRole("button", { name: "Add vehicle" }).click();
        await expect(page.getByText("Another vehicle already uses that unit number.")).toBeVisible();
      },
    },
    {
      name: "add a vehicle and land on its details",
      run: async (context) => {
        const { page } = context;
        const unit = `VF-${viewportTag(page).charAt(0).toUpperCase()}${String(Date.now()).slice(-5)}`;
        await page.getByRole("textbox", { name: "Fleet number" }).fill(unit);
        await page.getByRole("button", { name: "Add vehicle" }).click();
        await expect(page.getByRole("heading", { name: "Genesis G90" })).toBeVisible();
        await expect.poll(() => context.number(`select count(*) as value from vehicles where unit_number = $1 and status = 'ready'`, [unit])).toBe(1);
      },
    },
    {
      name: "change a vehicle's colour and see it on the fleet list",
      run: async (context) => {
        const { page } = context;
        const unit = (await context.text(`select unit_number as value from vehicles where color is null order by created_at desc limit 1`)) ?? "";
        expect(unit).not.toBe("");
        await page.getByRole("textbox", { name: "Colour (optional)" }).fill("Champagne");
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect.poll(() => context.text(`select color as value from vehicles where unit_number = $1`, [unit])).toBe("Champagne");
        await page.goto("/fleet");
        await expect(page.getByRole("article", { name: unit, exact: true }).getByText("Champagne", { exact: true })).toBeVisible();
      },
    },
  ],
};

export const documents: Flow = {
  route: "/drivers/[id]",
  startsSignedIn: true,
  steps: [
    {
      name: "open a driver profile",
      run: async ({ page }) => {
        await page.goto("/drivers");
        await page.getByRole("list", { name: "Drivers" }).getByRole("link", { name: "Profile" }).first().click();
        await expect(page.getByRole("region", { name: "Licenses" })).toBeVisible();
      },
    },
    {
      name: "files over 10 MB and the wrong type are refused",
      run: async ({ page }) => {
        await filePicker(page, "Upload license").setInputFiles({
          name: "huge.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
        });
        await expect(page.getByText("Files must be 10 MB or smaller.")).toBeVisible();
        await filePicker(page, "Upload license").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
        await expect(page.getByText("Upload a PDF or an image (JPEG, PNG or WebP).")).toBeVisible();
      },
    },
    {
      name: "upload a license",
      run: async ({ page }) => {
        await filePicker(page, "Upload license").setInputFiles({ name: "license-front.pdf", mimeType: "application/pdf", buffer: tinyPdf });
        await expect(page.getByRole("list", { name: "Licenses" }).getByText("license-front.pdf").first()).toBeVisible();
      },
    },
    {
      name: "the license opens for staff and is refused when signed out",
      run: async ({ page }) => {
        const link = page.getByRole("link", { name: "View license-front.pdf" }).first();
        const href = (await link.getAttribute("href")) ?? "";
        const signedIn = await page.request.get(href);
        expect(signedIn.status()).toBe(200);
        expect((await signedIn.body()).subarray(0, 5).toString()).toBe("%PDF-");
        const anonymous = await apiRequest.newContext({
          baseURL: new URL(page.url()).origin,
          storageState: { cookies: [], origins: [] },
        });
        const refused = await anonymous.get(href, { maxRedirects: 0 });
        expect(refused.status()).toBe(401);
        await anonymous.dispose();
      },
    },
    {
      name: "deleting asks first, then removes the file",
      run: async (context) => {
        const { page } = context;
        const before = await context.number(`select count(*) as value from documents where file_name = 'license-front.pdf'`);
        await page.getByRole("button", { name: "Delete license-front.pdf" }).first().click();
        const dialog = page.getByRole("alertdialog");
        await expect(dialog).toContainText("This cannot be undone.");
        await dialog.getByRole("button", { name: "Delete file" }).click();
        await expect(page.getByText("license-front.pdf is deleted.")).toBeVisible();
        await expect.poll(() => context.number(`select count(*) as value from documents where file_name = 'license-front.pdf'`)).toBe(before - 1);
      },
    },
    {
      name: "a vehicle registration uploads as an image",
      run: async ({ page }) => {
        await page.goto("/fleet");
        await page.getByRole("list", { name: "Vehicles" }).getByRole("link", { name: "Details" }).first().click();
        await filePicker(page, "Upload registration").setInputFiles({ name: "registration.png", mimeType: "image/png", buffer: onePixelPng });
        await expect(page.getByRole("list", { name: "Registrations" }).getByText("registration.png").first()).toBeVisible();
      },
    },
  ],
};
