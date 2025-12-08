import { expect, test } from "@playwright/test";
import { ensureSupabaseEnv, loginViaUi, createTestUser, deleteTestUser } from "./utils/auth";


test.describe("Negative Scenarios", () => {
    test.setTimeout(60_000);

    let managerId: string | undefined;
    const timestamp = Date.now();
    const managerEmail = `e2e-neg-${timestamp}@fastlease.test`;
    const managerPassword = "password123";

    test.beforeEach(async ({ page }) => {
        ensureSupabaseEnv();
        const user = await createTestUser(managerEmail, managerPassword, "OP_MANAGER");
        managerId = user!.id;
        await loginViaUi(page, { email: managerEmail, password: managerPassword });
        await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
    });

    test.afterEach(async () => {
        if (managerId) {
            await deleteTestUser(managerId);
        }
    });

    test("Client Form: Validate email format", async ({ page }) => {
        await page.goto("/ops/clients");
        await page.getByRole("button", { name: "Новый покупатель" }).click();

        const nameInput = page.getByLabel("Полное имя");
        await expect(nameInput).toBeVisible();
        await nameInput.fill("Invalid Email Client");

        const emailInput = page.getByLabel("Email");
        await emailInput.fill("invalid-email-format");

        // Attempt Submit - this should trigger browser validation and NOT close the modal
        await page.getByRole("button", { name: "Сохранить" }).click();

        // Verify HTML5 validation message exists
        const validationMessage = await emailInput.evaluate((el) => {
            const input = el as HTMLInputElement;
            return input.validationMessage;
        });

        // With type="email", this should now be non-empty (e.g. "Please include an '@'...")
        expect(validationMessage).not.toBe("");

        // Ensure modal is still open (form didn't submit)
        await expect(page.getByRole("button", { name: "Сохранить" })).toBeVisible();
    });
});
