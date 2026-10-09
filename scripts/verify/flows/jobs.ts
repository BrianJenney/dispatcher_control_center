import { expect, type Page } from "@playwright/test";
import { jobsSearchLabel } from "@/domain/jobs";
import { insertTodaysOffer, openFromNavigation, viewportTag } from "./expected";
import type { Flow } from "./types";

function jobsList(page: Page) {
  return page.getByRole("list", { name: "Jobs" });
}

async function searchFor(page: Page, text: string) {
  await page.getByRole("searchbox", { name: jobsSearchLabel }).fill(text);
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(text).replace(/%20/g, "\\+")}`));
}

let createdCustomer = "";

export const jobsCreate: Flow = {
  route: "/jobs/new",
  startsSignedIn: true,
  steps: [
    {
      name: "open the booking form from Jobs",
      run: async ({ page }) => {
        await page.goto("/");
        await openFromNavigation(page, "Jobs");
        await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();
        await page.getByRole("link", { name: "New trip" }).filter({ visible: true }).click();
        await expect(page.getByRole("heading", { name: "Book a trip" })).toBeVisible();
      },
    },
    {
      name: "see plain language validation",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Book trip" }).click();
        await expect(page.getByText("Enter the customer's name.")).toBeVisible();
        await expect(page.getByText("Enter where to pick the customer up.")).toBeVisible();
        await expect(page.getByText("Enter the fare in dollars, like 185 or 185.50.")).toBeVisible();
      },
    },
    {
      name: "too many passengers for the class is explained",
      run: async ({ page }) => {
        await page.getByRole("spinbutton", { name: "Passengers" }).fill("5");
        await page.getByRole("button", { name: "Book trip" }).click();
        await expect(page.getByText("A Luxury sedan seats up to 3. Choose a larger class or fewer passengers.")).toBeVisible();
      },
    },
    {
      name: "book a trip with every field",
      run: async (context) => {
        const { page } = context;
        createdCustomer = `Verification Guest ${viewportTag(page)} ${String(Date.now())}`;
        await page.getByRole("textbox", { name: "Customer" }).fill(createdCustomer);
        await page.getByRole("textbox", { name: "Pickup", exact: true }).fill("Harborview Hotel");
        await page.getByRole("textbox", { name: "Drop-off" }).fill("Regional Airport, Terminal A");
        await page.getByRole("combobox", { name: "Vehicle class" }).click();
        await page.getByRole("option", { name: "Executive SUV" }).click();
        await page.getByRole("spinbutton", { name: "Passengers" }).fill("4");
        await page.getByRole("textbox", { name: "Fare in dollars" }).fill("212.50");
        await page.getByRole("button", { name: "Book trip" }).click();
        await expect(page.getByText(/is booked and waiting for a driver\.$/)).toBeVisible();
        await expect(page).toHaveURL(/\/jobs\?q=Verification/);
        const card = page.getByRole("article", { name: new RegExp(`for ${createdCustomer}$`) });
        await expect(card.getByText("Offer", { exact: true })).toBeVisible();
        await expect(card.getByText("$212.50")).toBeVisible();
        const saved = await context.number(
          `select count(*) as value from trips where customer_name = $1 and status = 'offer'
             and fare_cents = 21250 and passengers = 4 and vehicle_class = 'executive_suv'`,
          [createdCustomer],
        );
        expect(saved).toBe(1);
      },
    },
  ],
};

export const jobsSearch: Flow = {
  route: "/jobs",
  startsSignedIn: true,
  steps: [
    {
      name: "search by customer",
      run: async (context) => {
        const { page } = context;
        await page.goto("/jobs");
        const name = await context.text(`select customer_name as value from trips order by pickup_at desc limit 1`);
        const lastWord = name?.split(" ").at(-1) ?? "";
        await searchFor(page, lastWord);
        const cards = jobsList(page).getByRole("article");
        await expect(cards.first()).toBeVisible();
        await expect(cards.filter({ hasNotText: lastWord })).toHaveCount(0);
      },
    },
    {
      name: "narrow by status",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Completed", exact: true }).click();
        await expect(page).toHaveURL(/status=completed/);
        const cards = jobsList(page).getByRole("article");
        await expect(cards.filter({ hasNotText: "Completed" })).toHaveCount(0);
      },
    },
    {
      name: "no match shows a way back",
      run: async ({ page }) => {
        await searchFor(page, "zzzz nobody");
        await expect(page.getByText("No trips match")).toBeVisible();
        await page.getByRole("button", { name: "Show all jobs" }).click();
        await expect(page).toHaveURL(/\/jobs$/);
        await expect(jobsList(page).getByRole("article").first()).toBeVisible();
      },
    },
    {
      name: "show more loads the next page",
      run: async ({ page }) => {
        await expect(jobsList(page).getByRole("article")).toHaveCount(25);
        await page.getByRole("button", { name: "Show more" }).click();
        await expect(jobsList(page).getByRole("article")).toHaveCount(50);
      },
    },
    {
      name: "find an old trip by its number",
      run: async (context) => {
        const { page } = context;
        const reference = await context.number(`select reference as value from trips order by pickup_at asc limit 1`);
        await searchFor(page, `#${String(reference)}`);
        const cards = jobsList(page).getByRole("article");
        await expect(cards).toHaveCount(1);
        await expect(cards).toHaveAttribute("aria-label", new RegExp(`^Trip ${String(reference)} for `));
      },
    },
    {
      name: "open a trip and its history from its card",
      run: async ({ page }) => {
        await jobsList(page).getByRole("link", { name: /^Open trip \d+ for / }).click();
        await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
        await expect(page.getByRole("list", { name: "Trip history" })).toContainText("booked");
      },
    },
  ],
};

export const jobsEdit: Flow = {
  route: "/jobs/[id]/edit",
  startsSignedIn: true,
  steps: [
    {
      name: "open an offer for editing",
      run: async (context) => {
        const { page } = context;
        const customer = `Edit Guest ${viewportTag(page)} ${String(Date.now())}`;
        await insertTodaysOffer(context, { customer, hour: 2 });
        await page.goto("/jobs");
        await searchFor(page, customer);
        await page.getByRole("link", { name: /^Edit trip \d+$/ }).first().click();
        await expect(page.getByRole("heading", { name: /^Edit trip #\d+$/ })).toBeVisible();
        await expect(page.getByRole("textbox", { name: "Customer" })).toHaveValue(customer);
      },
    },
    {
      name: "change the fare and passengers",
      run: async (context) => {
        const { page } = context;
        const customer = await page.getByRole("textbox", { name: "Customer" }).inputValue();
        await page.getByRole("textbox", { name: "Fare in dollars" }).fill("199");
        await page.getByRole("spinbutton", { name: "Passengers" }).fill("3");
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText(/is updated\.$/)).toBeVisible();
        expect(
          await context.number(`select count(*) as value from trips where customer_name = $1 and fare_cents = 19900 and passengers = 3`, [
            customer,
          ]),
        ).toBe(1);
      },
    },
    {
      name: "trips under way cannot be edited",
      run: async ({ page }) => {
        await page.goto("/jobs?status=completed");
        await expect(jobsList(page).getByRole("article").first()).toBeVisible();
        await expect(jobsList(page).getByRole("link", { name: /^Edit trip/ })).toHaveCount(0);
      },
    },
  ],
};

export const jobsCancel: Flow = {
  route: "/jobs",
  startsSignedIn: true,
  steps: [
    {
      name: "find the trip to cancel",
      run: async (context) => {
        const { page } = context;
        const customer = `Cancel Guest ${viewportTag(page)} ${String(Date.now())}`;
        await insertTodaysOffer(context, { customer, hour: 2 });
        await page.goto("/jobs");
        await searchFor(page, customer);
        await expect(jobsList(page).getByRole("article")).toHaveCount(1);
      },
    },
    {
      name: "cancelling asks to confirm and for a reason",
      run: async ({ page }) => {
        const card = jobsList(page).getByRole("article");
        await card.getByRole("button", { name: "Cancel trip" }).click();
        const dialog = page.getByRole("alertdialog");
        await expect(dialog).toContainText("This cannot be undone.");
        await dialog.getByRole("button", { name: "Cancel trip" }).click();
        await expect(dialog.getByText("Give a reason for cancelling the trip.")).toBeVisible();
        await dialog.getByLabel("Reason for cancelling").fill("Flight cancelled");
        await dialog.getByRole("button", { name: "Cancel trip" }).click();
        await expect(card.getByText("Cancelled", { exact: true })).toBeVisible();
        await expect(card.getByText("Cancelled: Flight cancelled")).toBeVisible();
      },
    },
    {
      name: "the cancellation and its reason are recorded",
      run: async (context) => {
        const label = await jobsList(context.page).getByRole("article").getAttribute("aria-label");
        const reference = Number(/Trip (\d+)/.exec(label ?? "")?.[1]);
        expect(
          await context.number(
            `select count(*) as value from trip_events join trips on trips.id = trip_events.trip_id
              where trips.reference = $1 and to_status = 'cancelled' and reason = 'Flight cancelled'`,
            [reference],
          ),
        ).toBe(1);
      },
    },
  ],
};
