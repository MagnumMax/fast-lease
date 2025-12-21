import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { ensureSupabaseEnv, loginViaUi, createTestUser, deleteTestUser } from "./utils/auth";
import { cleanupE2EArtifacts } from "./utils/cleanup";
import * as path from "path";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET || "";
async function getDealHrefByReference(reference: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const filter = `payload->metadata->>reference=eq.${encodeURIComponent(reference)}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?select=id,deal_number&${filter}&limit=1`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return null;
  const arr = (await res.json()) as Array<{ id: string; deal_number?: string | null }>;
  const row = arr[0];
  if (!row) return null;
  const slug = typeof row.deal_number === "string" && row.deal_number.length > 0 ? row.deal_number : row.id;
  return `/ops/deals/${slug}`;
}

async function uploadWorkflowDocFields(page: Page, filePath: string): Promise<void> {
  const locator = page.locator('input[type="file"][name^="documentFields["][name$="[file]"]');
  try {
    await locator.first().waitFor({ state: "attached", timeout: 10000 });
  } catch (e) {
    console.log("No file inputs found after waiting 10s.");
  }
  
  const inputs = await locator.all();
  console.log(`Found ${inputs.length} file inputs to upload.`);
  for (const input of inputs) {
    await input.setInputFiles(filePath);
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function waitForAnyStatus(page: Page, statuses: string[], timeoutMs = 30000): Promise<void> {
  const pattern = statuses.map(escapeRegExp).join("|");
  const locator = page.locator(`text=/${pattern}/`).first();
  const tries = Math.max(1, Math.floor(timeoutMs / 20000));
  const perTry = Math.max(5000, Math.floor(timeoutMs / tries));
  for (let i = 0; i < tries - 1; i++) {
    try {
      await expect(locator).toBeVisible({ timeout: perTry });
      return;
    } catch {
      console.log(`Waiting for status ${statuses.join("|")}... (attempt ${i + 1}/${tries})`);
      const body = await page.content();
      if (body.includes("Задача успешно завершена")) {
         console.log("Success message found, but status not yet updated.");
      }
      // Check for errors
      const errorMsg = await page.locator(".text-destructive").allInnerTexts();
      if (errorMsg.length > 0) {
          console.log("Found error messages:", errorMsg);
      }
    }
    await page.reload();
    await page.waitForLoadState("networkidle");
  }
  await expect(locator).toBeVisible({ timeout: perTry });
}

async function uploadAllFileInputs(page: Page, filePath: string): Promise<void> {
  const inputs = await page.locator('input[type="file"]:not([disabled])').all();
  for (const input of inputs) {
    await input.setInputFiles(filePath);
  }
}

type TextInputMapper = (name: string | null, index: number) => string | null;

async function fillTextInputsWith(page: Page, mapper: TextInputMapper): Promise<void> {
  const inputs = page.locator('input[type="text"]:not([disabled])');
  const count = await inputs.count();
  for (let i = 0; i < count; i++) {
    const name = await inputs.nth(i).getAttribute("name");
    const value = mapper(name, i);
    if (value !== null && value !== undefined) {
      await inputs.nth(i).fill(value);
    }
  }
}

async function submitWorkflowTask(
  page: Page,
  options: { filePath?: string | null; textMapper?: TextInputMapper } = {}
): Promise<void> {
  if (options.filePath) {
    await uploadWorkflowDocFields(page, options.filePath);
  }
  if (options.textMapper) {
    await fillTextInputsWith(page, options.textMapper);
  }

  await page.getByRole("button", { name: /Complete|Завершить|Подтвердить/i }).click();
  await page.waitForURL(/\/ops\/deals\/.+/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function openTaskByTitle(page: Page, titlePattern: RegExp): Promise<void> {
  const taskList = page.locator("#tasks");
  await expect(taskList).toBeVisible({ timeout: 20000 });
  const taskCard = taskList.locator("div").filter({ hasText: titlePattern }).first();
  await expect(taskCard).toBeVisible({ timeout: 20000 });
  const taskLink = taskCard.getByRole("link", { name: "Перейти к задаче" }).first();
  await expect(taskLink).toBeVisible({ timeout: 20000 });
  await taskLink.click();
  await page.waitForURL(/\/ops\/tasks\/.+/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function goToDeal(page: Page, reference: string): Promise<void> {
  await page.goto("/ops/deals");
  await page.waitForLoadState("networkidle");
  const href = await getDealHrefByReference(reference);
  if (href) {
    await page.goto(href);
  } else {
    const searchInput = page.getByPlaceholder(/Поиск/i).first();
    await searchInput.fill(reference);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const dealRow = page.getByRole("row").filter({ hasText: reference }).first();
    await expect(dealRow).toBeVisible({ timeout: 20000 });
    await dealRow.getByRole("link").first().click();
  }
  await page.waitForURL(/\/ops\/deals\/.+/, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#tasks")).toBeVisible({ timeout: 20000 });
}

test.describe.serial("Deal Lifecycle Full Flow", () => {
    test.setTimeout(300_000); // 5 minutes for full flow

    // Users
    let opsId: string | undefined;
    let techId: string | undefined;
    let riskId: string | undefined;
    let financeId: string | undefined;
    let investorId: string | undefined; // If needed

    // Track artifacts for cleanup
    const artifacts: { dealRef: string; carVin: string; clientEmail: string }[] = [];
    const dealData = {
        reference: "",
        clientName: "",
        clientEmail: "",
        carVin: "",
        sellerName: "",
        sellerEmail: ""
    };

    // Data (moved inside test where applicable)
    let dummyPdfPath: string;
    const REAL_PDF_B64 = "JVBERi0xLjQKJcfsj6IKJSVJbnZvY2F0aW9uOiBncyAtc0RFVklDRT1wZGZ3cml0ZSAtZENvbXBhdGliaWxpdHlMZXZlbD0xLjQgLWRQREZTRVRUSU5HUz0vZWJvb2sgLWROT1BBVVNFIC1kUVVJRVQgLWRCQVRDSCAtc091dHB1dEZpbGU9PyA/CjUgMCBvYmoKPDwvTGVuZ3RoIDYgMCBSL0ZpbHRlciAvRmxhdGVEZWNvZGU+PgpzdHJlYW0KeJwrVDDQM1QwAEEonZzLZaCQzlXIZQgWVYBSybkKTiFc+kHmCoZGCiFpXBDFhgrmRkBkoBCSy6XhkZqTk6/gnpFfXFKcXJRZUKIZksXlGsIVCIQAYZUXpmVuZHN0cmVhbQplbmRvYmoKNiAwIG9iago4OAplbmRvYmoKNCAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXM8PC9Qcm9jU2V0Wy9QREYgL1RleHRdCi9Gb250IDggMCBSCj4+Ci9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKMyAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0tpZHMgWwo0IDAgUgpdIC9Db3VudCAxCi9Sb3RhdGUgMD4+CmVuZG9iagoxIDAgb2JqCjw8L1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDMgMCBSCi9NZXRhZGF0YSAxMCAwIFIKPj4KZW5kb2JqCjggMCBvYmoKPDwvUjcKNyAwIFI+PgplbmRvYmoKOSAwIG9iago8PC9GaWx0ZXIvRmxhdGVEZWNvZGUvTGVuZ3RoIDI0MT4+c3RyZWFtCnicXZAxbsMwDEV3nUI3sOw4VgwYXJIlQ4ui7QUcmQo8RBYUZ+jt+0knHTp8Ak/6BMlfHc+nc5pXW32UJXzxauOcpsL35VEC2wtf52Tqxk5zWJ+kNdzGbKrj25i/fzJbGDhu/D7euPrs9aHeWsIy8T2PgcuYrmwG52iIkQyn6d9Xvds6LvFpbWAVOYdqhtaTyjlU4IFUwAOw25HKOVTgnlTAvSCMnZo7NfekAvaCgVTAIBhJBcSig8cKXtfwsoZvSAVsBDHT61wvc31LKmCrR76ukXslt1dMNjxK4bRquBqepDYn/ss/L1m6LGR+AT50eTYKZW5kc3RyZWFtCmVuZG9iago3IDAgb2JqCjw8L0Jhc2VGb250L0hlbHZldGljYS9Ub1VuaWNvZGUgOSAwIFIvVHlwZS9Gb250Ci9TdWJ0eXBlL1R5cGUxPj4KZW5kb2JqCjEwIDAgb2JqCjw8L1R5cGUvTWV0YWRhdGEKL1N1YnR5cGUvWE1ML0xlbmd0aCAxNDUzPj5zdHJlYW0KPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPD9hZG9iZS14YXAtZmlsdGVycyBlc2M9IkNSTEYiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLycgeDp4bXB0az0nWE1QIHRvb2xraXQgMi45LjEtMTMsIGZyYW1ld29yayAxLjYnPgo8cmRmOlJERiB4bWxuczpyZGY9J2h0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMnIHhtbG5zOmlYPSdodHRwOi8vbnMuYWRvYmUuY29tL2lYLzEuMC8nPgo8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nIHBkZjpQcm9kdWNlcj0nR1BMIEdob3N0c2NyaXB0IDEwLjA2LjAnLz4KPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSdodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvJz48eG1wOk1vZGlmeURhdGU+MjAyNS0xMi0wN1QyMzoxNTo1MCswNDowMDwveG1wOk1vZGlmeURhdGU+Cjx4bXA6Q3JlYXRlRGF0ZT4yMDI1LTEyLTA3VDIzOjE1OjUwKzA0OjAwPC94bXA6Q3JlYXRlRGF0ZT4KPHhtcDpNZXRhZGF0YURhdGU+MjAyNS0xMi0wN1QyMzoxNTo1MCswNDowMDwveG1wOk1ldGFkYXRhRGF0ZT4KPHhtcDpDcmVhdG9yVG9vbD5Vbmtub3duQXBwbGljYXRpb248L3htcDpDcmVhdG9yVG9vbD48L3JkZjpEZXNjcmlwdGlvbj4KPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8nIHhtcE1NOkRvY3VtZW50SUQ9J3V1aWQ6YjEyM2NkOTUtMGJiZC0xMWZjLTAwMDAtNjE0OTA0N2FlMDRhJy8+CjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSdodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vJyB4bXBNTTpSZW5kaXRpb25DbGFzcz0nZGVmYXVsdCcvPgo8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLycgeG1wTU06VmVyc2lvbklEPScxJy8+CjxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOmRjPSdodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLycgZGM6Zm9ybWF0PSdhcHBsaWNhdGlvbi9wZGYnPjxkYzp0aXRsZT48cmRmOkFsdD48cmRmOmxpIHhtbDpsYW5nPSd4LWRlZmF1bHQnPlVudGl0bGVkPC9yZGY6bGk+PC9yZGY6QWx0PjwvZGM6dGl0bGU+PC9yZGY6RGVzY3JpcHRpb24+CjwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0ndyc/PgplbmRzdHJlYW0KZW5kb2JqCjIgMCBvYmoKPDwvUHJvZHVjZXIoR1BMIEdob3N0c2NyaXB0IDEwLjA2LjApCi9DcmVhdGlvbkRhdGUoRDoyMDI1MTIwNzIzMTU1MCswNCcwMCcpCi9Nb2REYXRlKEQ6MjAyNTEyMDcyMzE1NTArMDQnMDAnKT4+ZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDA1MTUgMDAwMDAgbiAKMDAwMDAwMjUyNyAwMDAwMCBuIAowMDAwMDAwNDQ3IDAwMDAwIG4gCjAwMDAwMDAzMTUgMDAwMDAgbiAKMDAwMDAwMDEzOSAwMDAwMCBuIAowMDAwMDAwMjk3IDAwMDAwIG4gCjAwMDAwMDA5MTcgMDAwMDAgbiAKMDAwMDAwMDU4MCAwMDAwMCBuIAowMDAwMDAwNjA5IDAwMDAwIG4gCjAwMDAwMDA5OTcgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSAxMSAvUm9vdCAxIDAgUiAvSW5mbyAyIDAgUgovSUQgWzxCQjkzODFBMEE1N0Y5NkUyNUI4ODYxQjEzRDVENzdBMj48QkI5MzgxQTBBNTdGOTZFMjVCODg2MUIxM0Q1RDc3QTI+XQo+PgpzdGFydHhyZWYKMjY1MwolJUVPRgo=";
    async function ensureRealPdf(): Promise<string> {
        const p = path.join(tmpdir(), `e2e-real-${Date.now()}.pdf`);
        const buf = Buffer.from(REAL_PDF_B64, "base64");
        await fs.writeFile(p, buf);
        return p;
    }

    // These remain global as they are for user creation
    const timestamp = Date.now();
    const suffix = `${timestamp}`;
    const opsEmail = `e2e-ops-${suffix}@fastlease.test`;
    const techEmail = `e2e-tech-${suffix}@fastlease.test`;
    const riskEmail = `e2e-risk-${suffix}@fastlease.test`;
    const financeEmail = `e2e-fin-${suffix}@fastlease.test`;
    const investorEmail = `e2e-investor-${suffix}@fastlease.test`;
    const password = "password123";
    let investorApprovalRequired = false;

    test.beforeAll(async () => {
        ensureSupabaseEnv();
        dummyPdfPath = await ensureRealPdf();
        const userSpecs = [
            { email: opsEmail, role: "OP_MANAGER" },
            { email: techEmail, role: "TECH_SPECIALIST" },
            { email: riskEmail, role: "RISK_MANAGER" },
            { email: financeEmail, role: "FINANCE" },
            { email: investorEmail, role: "INVESTOR" },
        ];
        console.log("Creating E2E users:", userSpecs.map((s) => s.role).join(", "));
        const users = await Promise.all(
            userSpecs.map(async (spec) => {
                console.log(`Creating test user ${spec.role} (${spec.email})`);
                const user = await createTestUser(spec.email, password, spec.role);
                console.log(`Created ${spec.role} -> ${user?.id}`);
                return user;
            })
        );
        const [ops, tech, risk, fin, investor] = users;
        opsId = ops?.id;
        techId = tech?.id;
        riskId = risk?.id;
        financeId = fin?.id;
        investorId = investor?.id;
    });

    test.afterAll(async () => {
        // Cleanup users
        const ids = [opsId, techId, riskId, financeId, investorId].filter(Boolean) as string[];
        for (const id of ids) {
            await deleteTestUser(id);
        }
        // Cleanup data
        for (const artifact of artifacts) {
            await cleanupE2EArtifacts({
                dealReference: artifact.dealRef,
                carVin: artifact.carVin,
                clientEmail: artifact.clientEmail
            });
        }
    });

    test("1. OPS: Create client", async ({ page }) => {
        console.log("Stage 1 - Create Client");
        const timestamp = Date.now();
        const suffix = `${timestamp}-${Math.floor(Math.random() * 1000)}`;
        dealData.clientName = `LC Client ${suffix}`;
        dealData.clientEmail = `client-${suffix}@test.com`;

        await loginViaUi(page, { email: opsEmail, password });

        await page.goto("/ops/clients");
        await page.getByRole("button", { name: "Новый покупатель" }).click();
        await page.getByLabel("Полное имя").fill(dealData.clientName);
        await page.getByLabel("Email").fill(dealData.clientEmail);
        await page.getByLabel("Телефон").fill("+971501234567");
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.waitForLoadState("networkidle");
        await expect(page.getByText(dealData.clientName)).toBeVisible({ timeout: 60000 });
    });

    test("1.5. OPS: Create seller", async ({ page }) => {
        console.log("Stage 1.5 - Create Seller");
        const timestamp = Date.now();
        const suffix = `${timestamp}-${Math.floor(Math.random() * 1000)}`;
        dealData.sellerName = `LC Seller ${suffix}`;
        dealData.sellerEmail = `seller-${suffix}@test.com`;

        await loginViaUi(page, { email: opsEmail, password });

        await page.goto("/ops/sellers");
        await page.getByRole("button", { name: "Новый продавец" }).click();
        
        await page.locator("input#seller-name").fill(dealData.sellerName);
        await page.locator("input#seller-email").fill(dealData.sellerEmail);
        await page.locator("input#seller-phone").fill("+971500000000");
        
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.waitForLoadState("networkidle");
        await expect(page.getByText(dealData.sellerName)).toBeVisible({ timeout: 60000 });
    });

    test("2. OPS: Create car", async ({ page }) => {
        console.log("Stage 2 - Create Car");
        const timestamp = Date.now();
        const suffix = `${timestamp}-${Math.floor(Math.random() * 1000)}`;
        dealData.carVin = `LC${suffix}`.substring(0, 17).toUpperCase();

        await loginViaUi(page, { email: opsEmail, password });

        await page.goto("/ops/cars");
        await page.getByRole("button", { name: "Добавить автомобиль" }).click();
        await page.getByLabel("Марка").fill("Toyota");
        await page.getByLabel("Модель").fill("Camry");
        await page.getByLabel("VIN").fill(dealData.carVin);
        await page.getByLabel("Год выпуска").fill("2024");
        await page.getByLabel("Пробег (км)").fill("0");
        await page.getByRole("button", { name: "Сохранить" }).click();
        await expect(page.getByText(dealData.carVin).first()).toBeVisible({ timeout: 30000 });
    });

    test("3. OPS: Create deal", async ({ page }) => {
        console.log("Stage 3 - Create Deal");
        const timestamp = Date.now();
        const suffix = `${timestamp}-${Math.floor(Math.random() * 1000)}`;
        dealData.reference = `LC-DL-${suffix}`;

        await loginViaUi(page, { email: opsEmail, password });

        await page.goto("/ops/deals");
        await page.getByRole("button", { name: "Добавить сделку" }).click();
        await page.getByLabel(/Reference/).fill(dealData.reference);

        await page.locator("div.space-y-2", { hasText: "Покупатель" })
            .getByRole("combobox")
            .click();
        await page.getByRole("option", { name: dealData.clientName }).first().click();

        await page.locator("div.space-y-2", { hasText: "Автомобиль" })
            .getByRole("combobox")
            .click();
        await page.getByRole("option", { name: dealData.carVin }).first().click();

        await page.getByRole("button", { name: "Add deal" }).click();
        await expect(page.getByRole("dialog")).toBeHidden({ timeout: 30000 });

        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        artifacts.push({
            dealRef: dealData.reference,
            carVin: dealData.carVin,
            clientEmail: dealData.clientEmail,
        });
    });

    const confirmCarMapper: TextInputMapper = (_, index) => {
        if (index === 0) return "100000";
        if (index === 1) return "5000";
        return null;
    };
    const buyerDocsMapper: TextInputMapper = (name) => {
        if (!name) return "Some text";
        if (name.toLowerCase().includes("email")) return "buyer@test.com";
        if (name.toLowerCase().includes("phone")) return "+971501234567";
        return "Some text";
    };
    const sellerDocsMapper: TextInputMapper = (name) => {
        if (!name) return "Some text";
        if (name.toLowerCase().includes("email")) return "seller@test.com";
        if (name.toLowerCase().includes("phone")) return "+971500000000";
        return "Some text";
    };

    test("4. OPS: Prepare Quote Task", async ({ page }) => {
        console.log("Stage 4 - Prepare Quote");
        expect(dealData.reference).not.toBe("");
        await loginViaUi(page, { email: opsEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Коммерческого предложения|Подготовить КП/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
        await waitForAnyStatus(page, ["Подтверждение авто и участников"], 30000);
    });

    test("5a. OPS: Confirm Car Task", async ({ page }) => {
        console.log("Stage 5a - Confirm Car");
        await loginViaUi(page, { email: opsEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Подтверждение авто/);
        await submitWorkflowTask(page, { textMapper: confirmCarMapper });
    });

    test("5b. OPS: Confirm Participants Task", async ({ page }) => {
        console.log("Stage 5b - Confirm Participants");
        await loginViaUi(page, { email: opsEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Подтверждение участников сделки/);
        
        // Select Seller
        await page.locator("div.space-y-2", { hasText: "Продавец" })
             .getByRole("combobox")
             .click();
        await page.getByRole("option", { name: dealData.sellerName }).first().click();
        
        await submitWorkflowTask(page);
        await waitForAnyStatus(page, ["Проверка авто"], 30000);
    });

    test("6. TECH: Verify Vehicle Task", async ({ page }) => {
        console.log("Stage 6 - Verify Vehicle");
        await loginViaUi(page, { email: techEmail, password });
        await goToDeal(page, dealData.reference);
        await waitForAnyStatus(page, ["Подтверждение авто и участников", "Проверка авто"], 30000);
        await openTaskByTitle(page, /Проверка тех состояния|технического состояния/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
        await waitForAnyStatus(page, ["Сбор документов покупателя", "Сбор документов продавца"], 60000);
    });

    test("7. OPS: Collect Buyer Docs", async ({ page }) => {
        console.log("Stage 7 - Collect Buyer Docs");
        await loginViaUi(page, { email: opsEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Собрать пакет документов покупателя/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath, textMapper: buyerDocsMapper });
        await waitForAnyStatus(page, ["Сбор документов продавца", "Проверка риска"], 120000);
    });

    test("8. OPS: Collect Seller Docs", async ({ page }) => {
        console.log("Stage 8 - Collect Seller Docs");
        await loginViaUi(page, { email: opsEmail, password });
        await goToDeal(page, dealData.reference);
        const sellerStageVisible = await page.locator("text=Сбор документов продавца").first().isVisible().catch(() => false);
        if (!sellerStageVisible) {
            console.log("Стадия документов продавца неактивна, пропускаем.");
            return;
        }
        await openTaskByTitle(page, /Собрать пакет документов продавца/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath, textMapper: sellerDocsMapper });
        await waitForAnyStatus(page, ["Проверка риска"], 60000);
    });

    test("9. RISK: Risk Review Task", async ({ page }) => {
        console.log("Stage 9 - Risk Review");
        await loginViaUi(page, { email: riskEmail, password });
        await goToDeal(page, dealData.reference);
        await waitForAnyStatus(page, ["Проверка риска"], 60000);
        await openTaskByTitle(page, /Провести проверку риска|скоринг/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
        await waitForAnyStatus(page, ["Финансовое утверждение"], 30000);
    });

    test("10. FINANCE: Finance Review Task", async ({ page }) => {
        console.log("Stage 10 - Finance Review");
        await loginViaUi(page, { email: financeEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Проверка и утверждение финансовой структуры/);
        await submitWorkflowTask(page);
        await waitForAnyStatus(page, ["Подготовка контракта", "Ожидание инвестора"], 60000);
        investorApprovalRequired = await page.locator("text=Ожидание инвестора").first().isVisible().catch(() => false);
    });

    test("11. INVESTOR: Approve Deal (if required)", async ({ page }) => {
        console.log("Stage 11 - Investor Approval");
        if (!investorApprovalRequired) {
            console.log("Investor approval not required; skipping investor task.");
            return;
        }
        await loginViaUi(page, { email: investorEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Согласование сделки инвестором/);
        await submitWorkflowTask(page);
        await waitForAnyStatus(page, ["Подготовка контракта"], 60000);
    });

    test("12. OPS: Prepare Contract Task", async ({ page }) => {
        console.log("Stage 12 - Prepare Contract");
        await loginViaUi(page, { email: opsEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Сформировать договор/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
        await waitForAnyStatus(page, ["Подписание документов"], 60000);
    });

    test("13. OPS: Sign Documents Task", async ({ page }) => {
        console.log("Stage 13 - Sign Documents");
        await loginViaUi(page, { email: opsEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Подписание документов/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
        await waitForAnyStatus(page, ["Подписание и финансирование"], 60000);
    });

    test("14. FINANCE: Create Invoice Task", async ({ page }) => {
        console.log("Stage 14 - Create Invoice");
        await loginViaUi(page, { email: financeEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, new RegExp(escapeRegExp("Создание инвойса на оплату первого взноса")));
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
    });

    test("15. FINANCE: Supplier Payment Task", async ({ page }) => {
        console.log("Stage 15 - Supplier Payment");
        await loginViaUi(page, { email: financeEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, new RegExp(escapeRegExp("Оплата поставщику")));
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
        await waitForAnyStatus(page, ["Выдача автомобиля"], 60000);
    });

    test("16. TECH: Arrange Delivery Task", async ({ page }) => {
        console.log("Stage 16 - Arrange Delivery");
        await loginViaUi(page, { email: techEmail, password });
        await goToDeal(page, dealData.reference);
        await openTaskByTitle(page, /Организовать выдачу авто покупателю/);
        await submitWorkflowTask(page, { filePath: dummyPdfPath });
        await waitForAnyStatus(page, ["Активный лизинг"], 60000);
    });
});
