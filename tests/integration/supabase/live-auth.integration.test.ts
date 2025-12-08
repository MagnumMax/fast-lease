import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

dotenv.config({ path: ".env.local" });
dotenv.config();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.SUPABASE_PROJECT_URL ??
  "";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SECRET ??
  "";
const TEST_EMAIL = process.env.E2E_TEST_USER ?? "admin@fastlease.ae";

const shouldRunLiveTest = Boolean(SUPABASE_URL && SERVICE_KEY && TEST_EMAIL);

describe("supabase live integration", () => {
  if (!shouldRunLiveTest) {
    it.skip("пропускается: нет SUPABASE_URL/SERVICE_KEY/E2E_TEST_USER", () => {});
    return;
  }

  const client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  it("читает auth-пользователя по email через admin API (listUsers)", async () => {
    const { data, error } = await client.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    expect(error).toBeNull();

    const match = data?.users.find(
      (user) => user.email?.toLowerCase() === TEST_EMAIL.toLowerCase(),
    );

    expect(match?.email?.toLowerCase()).toBe(TEST_EMAIL.toLowerCase());
  });

  it("получает первую страницу пользователей без моков", async () => {
    const { data, error } = await client.auth.admin.listUsers({
      page: 1,
      perPage: 5,
    });

    expect(error).toBeNull();
    expect(Array.isArray(data?.users)).toBe(true);
  });
});
