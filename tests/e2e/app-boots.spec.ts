import { expect, test } from "@playwright/test";

test("app boots and serves the home page", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.getByText("Setup complete")).toBeVisible();
});
