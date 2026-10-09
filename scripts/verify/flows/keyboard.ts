import { expect, type Page } from "@playwright/test";
import { jobsSearchLabel } from "@/domain/jobs";
import { insertTodaysOffer, viewportTag } from "./expected";
import type { Flow } from "./types";

function help(page: Page) {
  return page.getByRole("dialog", { name: "Keyboard shortcuts" });
}

function shortcutsSwitch(page: Page) {
  return help(page).getByRole("switch", { name: "Use keyboard shortcuts" });
}

function searchBox(page: Page) {
  return page.getByRole("searchbox", { name: jobsSearchLabel });
}

function jobCards(page: Page) {
  return page.getByRole("list", { name: "Jobs" }).getByRole("article");
}

async function openHelpFromKeyboard(page: Page) {
  await expect(async () => {
    await page.keyboard.press("?");
    await expect(help(page)).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

async function pause(page: Page) {
  await page.waitForTimeout(600);
}

const customer = { name: "" };

export const keyboard: Flow = {
  route: "/",
  startsSignedIn: true,
  steps: [
    {
      name: "the question mark opens the shortcut list and Escape closes it",
      run: async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("group", { name: "Active jobs" })).toBeVisible();
        await openHelpFromKeyboard(page);
        await expect(help(page).getByText("Book a new trip")).toBeVisible();
        await expect(shortcutsSwitch(page)).toBeChecked();
        await page.keyboard.press("Escape");
        await expect(help(page)).toBeHidden();
      },
    },
    {
      name: "g then j goes to Jobs and a wrong second key does nothing",
      run: async ({ page }) => {
        await page.keyboard.press("g");
        await page.keyboard.press("j");
        await expect(page).toHaveURL(/\/jobs$/);
        await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();
        await expect(jobCards(page).first()).toBeVisible();
        await page.keyboard.press("g");
        await page.keyboard.press("x");
        await page.keyboard.press("d");
        await pause(page);
        await expect(page).toHaveURL(/\/jobs$/);
      },
    },
    {
      name: "the slash key jumps to the search box",
      run: async ({ page }) => {
        await page.keyboard.press("/");
        await expect(searchBox(page)).toBeFocused();
      },
    },
    {
      name: "shortcuts stay quiet while typing in the search box",
      run: async ({ page }) => {
        await page.keyboard.type("gjn?");
        await expect(page).toHaveURL(/\/jobs\?q=gjn/);
        await expect(searchBox(page)).toHaveValue("gjn?");
        await expect(searchBox(page)).toBeFocused();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await searchBox(page).fill("");
        await expect(page).toHaveURL(/\/jobs$/);
      },
    },
    {
      name: "n opens the new trip form",
      run: async ({ page }) => {
        await page.keyboard.press("Tab");
        await page.keyboard.press("n");
        await expect(page).toHaveURL(/\/jobs\/new$/);
        await expect(page.getByRole("heading", { name: "Book a trip" })).toBeVisible();
      },
    },
    {
      name: "j and k move between trip cards",
      run: async ({ page }) => {
        await page.keyboard.press("g");
        await page.keyboard.press("j");
        await expect(page).toHaveURL(/\/jobs$/);
        await expect(jobCards(page).first()).toBeVisible();
        await page.keyboard.press("j");
        await expect(jobCards(page).nth(0)).toBeFocused();
        await page.keyboard.press("j");
        await expect(jobCards(page).nth(1)).toBeFocused();
        await page.keyboard.press("k");
        await expect(jobCards(page).nth(0)).toBeFocused();
      },
    },
    {
      name: "switching shortcuts off stops them and the button brings the list back",
      run: async ({ page }) => {
        await openHelpFromKeyboard(page);
        await shortcutsSwitch(page).focus();
        await page.keyboard.press("Space");
        await expect(shortcutsSwitch(page)).not.toBeChecked();
        await page.keyboard.press("Escape");
        await expect(help(page)).toBeHidden();
        await page.keyboard.press("g");
        await page.keyboard.press("d");
        await page.keyboard.press("?");
        await pause(page);
        await expect(page).toHaveURL(/\/jobs$/);
        await expect(help(page)).toBeHidden();
        await page.getByRole("button", { name: "Keyboard shortcuts" }).filter({ visible: true }).focus();
        await page.keyboard.press("Enter");
        await expect(help(page)).toBeVisible();
        await expect(shortcutsSwitch(page)).not.toBeChecked();
        await shortcutsSwitch(page).focus();
        await page.keyboard.press("Space");
        await expect(shortcutsSwitch(page)).toBeChecked();
        await page.keyboard.press("Escape");
        await expect(help(page)).toBeHidden();
        await page.keyboard.press("g");
        await page.keyboard.press("d");
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole("group", { name: "Active jobs" })).toBeVisible();
      },
    },
    {
      name: "assigning a driver by keyboard still works and keeps focus on the page",
      run: async (context) => {
        const { page } = context;
        customer.name = `Keys Guest ${viewportTag(page)} ${String(Date.now())}`;
        await insertTodaysOffer(context, { customer: customer.name, hour: 0 });
        await page.reload();
        const waiting = page.getByRole("region", { name: "Needs a driver" }).getByRole("article", { name: new RegExp(`for ${customer.name}$`) });
        await expect(waiting).toBeVisible();
        await waiting.focus();
        await page.keyboard.press("Tab");
        await expect(waiting.getByRole("button", { name: "Assign driver" })).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("list", { name: "Suggested drivers" })).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(waiting).toHaveCount(0);
        await expect
          .poll(() =>
            context.text(
              `select drivers.name as value from trips join drivers on drivers.id = trips.driver_id
                where trips.customer_name = $1 and trips.status = 'assigned'`,
              [customer.name],
            ),
          )
          .not.toBeNull();
        await expect(page.locator("body")).not.toBeFocused();
      },
    },
  ],
};
