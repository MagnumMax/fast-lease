import { test, expect } from "@playwright/test";

test("форма поддержки доступна гостю", async ({ page }) => {
  const response = await page.goto("/support");
  expect(response?.ok()).toBe(true);

  await expect(page.getByText("Поддержка Fast Lease")).toBeVisible();
  await expect(page.getByLabel("Имя")).toBeVisible();
  await expect(page.getByLabel("Email или телефон")).toBeVisible();
  await expect(page.getByLabel("Тема")).toBeVisible();
  await expect(page.getByLabel("Сообщение")).toBeVisible();
  await expect(page.getByRole("button", { name: "Отправить запрос" })).toBeVisible();
});
