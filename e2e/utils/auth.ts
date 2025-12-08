import { expect, test, type Page } from "@playwright/test";

const DEFAULT_PASSWORD = "123456";
const DEFAULT_ADMIN_PASSWORD = "12345678";

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
    process.env.E2E_TEST_USER ??
    "opsmanager@fastlease.ae";
  const password =
    process.env.E2E_OPS_PASSWORD ??
    process.env.E2E_PASSWORD ??
    process.env.E2E_TEST_PASSWORD ??
    DEFAULT_PASSWORD;
  return { email, password };
}

export function getAdminCreds(): Required<Creds> {
  const email =
    process.env.E2E_ADMIN_EMAIL ??
    process.env.E2E_EMAIL_ADMIN ??
    "admin@fastlease.ae";
  const password =
    process.env.E2E_ADMIN_PASSWORD ??
    process.env.E2E_PASSWORD ??
    DEFAULT_ADMIN_PASSWORD;
  return { email, password };
}

// Admin API helpers for dynamic user creation
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET || "";

export async function createTestUser(email: string, password = DEFAULT_PASSWORD, role: string = "OP_MANAGER") {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase URL or Service Role Key missing. Cannot create test user.");
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Create Identity
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
  const userId = data.user.id;

  // 2. Determine Portal
  // Simplified mapping for E2E utils to avoid importing from app code
  const roleToPortal: Record<string, string> = {
    ADMIN: "app",
    OP_MANAGER: "app",
    SUPPORT: "app",
    FINANCE: "app",
    TECH_SPECIALIST: "app",
    RISK_MANAGER: "app",
    LEGAL: "app",
    ACCOUNTING: "app",
    INVESTOR: "investor",
    CLIENT: "client",
  };
  const portal = roleToPortal[role] || "client";

  // 3. Assign Role & Portal in DB
  // upsert profile
  await supabase.from("profiles").upsert(
    { user_id: userId, full_name: "E2E Test User", status: "active" },
    { onConflict: "user_id" }
  );

  // upsert user_roles
  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: role,
    portal: portal,
    metadata: { source: "e2e_test" }
  });
  if (roleError) {
    console.warn(`[createTestUser] Failed to insert user_roles: ${roleError.message}`);
  }

  // upsert user_portals
  const { error: portalError } = await supabase.from("user_portals").insert({
    user_id: userId,
    portal: portal,
    status: "active"
  });
  if (portalError) {
    throw new Error(`[createTestUser] Failed to insert user_portals: ${portalError.message}`);
  }

  // 4. Update Auth Metadata (critical for session claims)
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      roles: [role],
      primary_role: role,
    },
    user_metadata: {
      roles: [role],
      primary_role: role,
      full_name: "E2E Test User"
    }
  });

  return data.user;
}

export async function deleteTestUser(userId: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.warn(`Failed to delete test user ${userId}:`, error.message);
  }
}

export async function loginViaUi(page: Page, creds: Creds) {
  const email = creds.email ?? "";
  const password = creds.password ?? "";

  await page.goto("/");
  // Жёсткие селекторы на id, чтобы не зависеть от локализации и скрытых label
  await page.locator("#login-identity").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for navigation away from login page to confirm session is established
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login") && url.pathname !== "/", { timeout: 15_000 });
  } catch (e) {
    console.warn("[loginViaUi] Timed out waiting for redirect after login. proceeding anyway...");
  }
}
