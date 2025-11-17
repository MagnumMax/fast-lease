import { expect, test } from "@playwright/test";

import { ensureSupabaseEnv, getOpsCreds, loginViaUi } from "./utils/auth";
import { cleanupE2EArtifacts } from "./utils/cleanup";

test.skip(
  true,
  "Временно отключено тестирование создания клиента/авто/сделки (см. задачу).",
);

test("оперменеджер создаёт клиента, авто и сделку между ними", async ({ page }) => {
  if (process.env.E2E_BYPASS_AUTH === "true") {
    test.skip(true, "E2E_BYPASS_AUTH включен: Supabase auth недоступен в тестовой среде");
  }

  ensureSupabaseEnv();

  const opsCreds = getOpsCreds();
  const now = Date.now();
  const suffix = `${test.info().project.name}-${now}-${Math.floor(Math.random() * 1_000_000)}`;
  const clientName = `E2E Client ${suffix}`;
  const clientEmail = `e2e+client${suffix}@fastlease.test`;
  const clientPhone = "+971500000001";

  const carMake = "E2E";
  const carModel = `Model ${suffix}`;
  const carVin = `E2E${suffix}`.replace(/[^A-Z0-9]/gi, "").slice(0, 17).toUpperCase();

  const dealReference = `E2E-DEAL-${suffix}`;

  try {
    // 1) Логин
    await loginViaUi(page, opsCreds);

    // 2) Создать клиента
    await page.goto("/ops/clients");
    await page.getByRole("button", { name: "Новый клиент" }).click();
    await page.getByLabel("Полное имя").fill(clientName);
    await page.getByLabel("Email").fill(clientEmail);
    await page.getByLabel("Телефон").fill(clientPhone);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 10_000 });

    // 3) Создать автомобиль
    await page.goto("/ops/cars");
    await page.getByRole("button", { name: "Добавить автомобиль" }).click();
    await page.getByLabel("Марка").fill(carMake);
    await page.getByLabel("Модель").fill(carModel);
    await page.getByLabel("VIN").fill(carVin);
    await page.getByLabel("Год выпуска").fill("2025");
    await page.getByLabel("Пробег (км)").fill("10");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText(carModel)).toBeVisible({ timeout: 10_000 });

    // 4) Создать сделку, связав клиента и авто
    await page.goto("/ops/deals");
    await page.getByRole("button", { name: "Добавить сделку" }).click();
    await page.getByLabel(/Reference/).fill(dealReference);

    // первый комбобокс — клиент
    await page.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: clientName }).click();

    // второй комбобокс — автомобиль
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: carMake + " " + carModel }).click();

    await page.getByRole("button", { name: "Add to workflow" }).click();

    await expect(page.getByText(dealReference)).toBeVisible({ timeout: 20_000 });
  } finally {
    await cleanupE2EArtifacts({
      clientEmail,
      carVin,
      dealReference,
    });
  }
});
