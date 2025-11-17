import { test, expect } from "@playwright/test";

test("главная страница открывается без ошибок", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);

  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toBeVisible();
});
