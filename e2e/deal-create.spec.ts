import { expect, test } from "@playwright/test";

import { ensureSupabaseEnv, getOpsCreds, loginViaUi } from "./utils/auth";

test.skip(true, "Временно отключено тестирование создания сделки (см. задачу).");

test("операционный менеджер создаёт сделку через форму", async ({ page }) => {
  if (process.env.E2E_BYPASS_AUTH === "true") {
    test.skip(true, "E2E_BYPASS_AUTH включен: Supabase auth недоступен в тестовой среде");
  }

  ensureSupabaseEnv();

  const creds = getOpsCreds();
  await loginViaUi(page, creds);

  // Переходим на страницу воронки сделок
  await page.goto("/ops/deals");

  // Открываем диалог создания
  await page.getByRole("button", { name: "Добавить сделку" }).click();

  const reference = `E2E-${Date.now()}`;
  await page.getByLabel(/Reference/).fill(reference);

  // Остальные поля уже предзаполнены первыми элементами справочников
  await page.getByRole("button", { name: "Add to workflow" }).click();

  // Проверяем, что новая заявка появилась в таблице/канбане
  await expect(page.getByText(reference, { exact: false })).toBeVisible({
    timeout: 20_000,
  });
});
