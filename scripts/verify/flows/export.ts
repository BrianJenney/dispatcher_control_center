import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { insertTodaysOffer, viewportTag } from "./expected";
import type { Flow } from "./types";

const guest = { name: "" };

async function downloadedRows(page: import("@playwright/test").Page) {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export CSV" }).click()]);
  const path = await download.path();
  const text = await readFile(path, "utf8");
  return { fileName: download.suggestedFilename(), lines: text.trimEnd().split("\r\n") };
}

export const exportTrips: Flow = {
  route: "/jobs",
  startsSignedIn: true,
  steps: [
    {
      name: "export every trip as a CSV file",
      run: async (context) => {
        const { page } = context;
        await page.goto("/jobs");
        const total = await context.number(`select count(*) as value from trips`);
        const { fileName, lines } = await downloadedRows(page);
        expect(fileName).toMatch(/^trips-\d{4}-\d{2}-\d{2}\.csv$/);
        expect(lines[0]).toContain("Reference,Status,Pickup date");
        expect(lines.length - 1).toBe(Math.min(total, 10_000));
      },
    },
    {
      name: "the export follows the filters on screen",
      run: async (context) => {
        const { page } = context;
        await page.getByRole("button", { name: "Cancelled", exact: true }).click();
        await expect(page).toHaveURL(/status=cancelled/);
        const cancelled = await context.number(`select count(*) as value from trips where status = 'cancelled'`);
        const { lines } = await downloadedRows(page);
        expect(lines.length - 1).toBe(cancelled);
        for (const line of lines.slice(1)) expect(line).toContain(",Cancelled,");
      },
    },
    {
      name: "a search narrows the export to that customer",
      run: async (context) => {
        const { page } = context;
        guest.name = `Export Guest ${viewportTag(page)} ${String(Date.now())}`;
        await insertTodaysOffer(context, { customer: guest.name, hour: 4 });
        await page.goto(`/jobs?q=${encodeURIComponent(guest.name)}`);
        const { lines } = await downloadedRows(page);
        expect(lines).toHaveLength(2);
        expect(lines[1]).toContain(guest.name);
        expect(lines[1]).toContain(",Offer,");
      },
    },
  ],
};
