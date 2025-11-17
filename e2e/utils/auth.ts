import { expect, test, type Page } from "@playwright/test";

const DEFAULT_PASSWORD = "123456";

type Creds = {
  email?: string | null;
  password?: string | null;
};

export function ensureSupabaseEnv() {
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    );

  if (!hasSupabase) {
    test.skip(true, "Supabase env vars are not set for E2E auth flow");
  }
}

export function getClientCreds(): Required<Creds> {
  const email =
    process.env.E2E_CLIENT_EMAIL ??
    process.env.E2E_EMAIL ??
    "client@fastlease.ae";
  const password =
    process.env.E2E_CLIENT_PASSWORD ??
    process.env.E2E_PASSWORD ??
    DEFAULT_PASSWORD;
  return { email, password };
}

export function getOpsCreds(): Required<Creds> {
  const email =
    process.env.E2E_OPS_EMAIL ??
    process.env.E2E_EMAIL_OPS ??
    "opsmanager@fastlease.ae";
  const password =
    process.env.E2E_OPS_PASSWORD ??
    process.env.E2E_PASSWORD ??
    DEFAULT_PASSWORD;
  return { email, password };
}

export async function loginViaUi(page: Page, creds: Creds) {
  const email = creds.email ?? "";
  const password = creds.password ?? "";

  await page.goto("/login");
  // Жёсткие селекторы на id, чтобы не зависеть от локализации и скрытых label
  await page.locator("#login-identity").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
}
