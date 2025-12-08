import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page показывает логин и мета", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("страница offer доступна и рендерит заголовок", async ({ page }) => {
    const response = await page.goto("/offer");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", { name: /автомобиль и условия/i }),
    ).toBeVisible();
  });
});
