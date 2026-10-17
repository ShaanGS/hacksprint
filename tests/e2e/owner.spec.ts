import { expect, test } from "@playwright/test";

// The owner app needs the database and the owner's PIN, so these tests read apps/web/.env.local
// and run on a developer machine against the seeded demo shop. Without that file they skip.
try {
  process.loadEnvFile("apps/web/.env.local");
} catch {
  // No local env file: the tests below skip themselves.
}
const pin = process.env.OWNER_PIN;
const sourceLabels = ["verified_payment", "supplier_bill", "owner_said", "estimate"];

type Part = { key: string; paise: number; label: string };

test.describe("owner app", () => {
  test.skip(!pin, "needs OWNER_PIN and the database in apps/web/.env.local");

  test.beforeEach(async ({ page }) => {
    const response = await page.request.post("/api/owner/session", { data: { pin } });
    expect(response.ok()).toBe(true);
  });

  test("the week adds up in whole paise, and every part has a source label", async ({ page }) => {
    const response = await page.request.get("/api/rotation");
    expect(response.ok()).toBe(true);
    const { week } = (await response.json()) as {
      week: {
        needed: { paise: number; parts: Part[] };
        likely: { paise: number; parts: Part[] };
        gap_paise: number;
        state: string;
      };
    };

    for (const part of [...week.needed.parts, ...week.likely.parts]) {
      expect(Number.isInteger(part.paise), part.key).toBe(true);
      expect(sourceLabels, part.key).toContain(part.label);
    }
    const sum = (parts: Part[]) => parts.reduce((total, part) => total + part.paise, 0);
    expect(week.needed.paise).toBe(sum(week.needed.parts));
    expect(week.likely.paise).toBe(sum(week.likely.parts));
    expect(week.gap_paise).toBe(week.likely.paise - week.needed.paise);
    expect(["short", "close", "ok"]).toContain(week.state);
  });

  test("the owner app opens on Home with its tabs and an amount in rupees", async ({ page }) => {
    await page.goto("/owner");
    const tabs = page.getByRole("navigation").getByRole("button");
    await expect(tabs.first()).toBeVisible();
    expect(await tabs.count()).toBeGreaterThanOrEqual(4);
    await expect(page.getByText(/₹\s?[\d,]+/).first()).toBeVisible();
  });
});
