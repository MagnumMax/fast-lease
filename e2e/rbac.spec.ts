
import { test, expect } from "@playwright/test";
import { ensureSupabaseEnv, loginViaUi, createTestUser, deleteTestUser } from "./utils/auth";

test.describe("RBAC (Role-Based Access Control)", () => {
    test("OP_MANAGER имеет доступ к операционному дашборду", async ({ page }) => {
        ensureSupabaseEnv();
        const email = `e2e-ops-${Date.now()}-${Math.floor(Math.random() * 10000)}@fastlease.test`;
        const password = "password123";
        let userId: string | undefined;

        try {
            const user = await createTestUser(email, password, "OP_MANAGER");
            userId = user!.id;
            await loginViaUi(page, { email, password });

            // Ожидаем редирект на homePath для OP_MANAGER (/app/dashboard или /ops/dashboard)
            await expect(page).toHaveURL(/\/app\/dashboard|\/ops\/.*/);

            // Проверяем наличие элементов меню операциониста
            await expect(page.getByRole("link", { name: "Deals" })).toBeVisible();
        } finally {
            if (userId) await deleteTestUser(userId);
        }
    });

    test("CLIENT не имеет доступа к админке", async ({ page }) => {
        ensureSupabaseEnv();
        const email = `e2e-client-${Date.now()}-${Math.floor(Math.random() * 10000)}@fastlease.test`;
        const password = "password123";
        let userId: string | undefined;

        try {
            const user = await createTestUser(email, password, "CLIENT");
            userId = user!.id;
            await loginViaUi(page, { email, password });

            // Ожидаем редирект на клиентский дашборд
            await expect(page).toHaveURL(/\/client\/dashboard/);

            // Пытаемся зайти в админку
            await page.goto("/admin/dashboard");

            // Должен быть редирект (обратно на клиентский дашборд или 404/403)
            // В FastLease обычно редирект на home пользователя или /login
            await expect(page).not.toHaveURL(/\/admin\/dashboard/);

        } finally {
            if (userId) await deleteTestUser(userId);
        }
    });
});
