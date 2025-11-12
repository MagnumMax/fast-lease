import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  findSupabaseAuthUserByEmail,
  listSupabaseAuthUsers,
} from "@/lib/supabase/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

const TEST_SUPABASE_URL = "https://example.supabase.co";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listSupabaseAuthUsers", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  it("stops after the first page when pagination hints are missing", async () => {
    const firstPage = createAdminUsers(30, "first");

    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(createUsersResponse(firstPage, {}));

    vi.stubGlobal("fetch", fetchStub);

    const users = await listSupabaseAuthUsers({ perPage: 30, maxPages: 5 });

    expect(users).toHaveLength(30);
    expect(fetchStub).toHaveBeenCalledTimes(1);
  });

  it("fetches the next page when the Link header exposes rel=next", async () => {
    const firstPage = createAdminUsers(30, "alpha");
    const secondPage = createAdminUsers(5, "beta");

    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        createUsersResponse(firstPage, {
          total: "35",
          link:
            `<${TEST_SUPABASE_URL}/auth/v1/admin/users?page=2&per_page=30>; rel="next",` +
            ` <${TEST_SUPABASE_URL}/auth/v1/admin/users?page=2&per_page=30>; rel="last"`,
        }),
      )
      .mockResolvedValueOnce(
        createUsersResponse(secondPage, {
          total: "35",
        }),
      );

    vi.stubGlobal("fetch", fetchStub);

    const users = await listSupabaseAuthUsers({ perPage: 30, maxPages: 5 });

    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(users).toHaveLength(35);
    expect(users.at(-1)?.id).toBe("beta-user-4");
  });

  it("uses X-Total-Count hints when Link header is absent", async () => {
    const firstPage = createAdminUsers(30, "gamma");
    const secondPage = createAdminUsers(20, "delta");

    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        createUsersResponse(firstPage, {
          total: "50",
        }),
      )
      .mockResolvedValueOnce(
        createUsersResponse(secondPage, {
          total: "50",
        }),
      );

    vi.stubGlobal("fetch", fetchStub);

    const users = await listSupabaseAuthUsers({ perPage: 30 });

    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(users).toHaveLength(50);
  });
});

describe("findSupabaseAuthUserByEmail", () => {
  const createServiceClientMock = vi.mocked(createSupabaseServiceClient);
  const rpcMock = vi.fn();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    createServiceClientMock.mockResolvedValue({
      rpc: rpcMock,
    } as unknown as Awaited<ReturnType<typeof createSupabaseServiceClient>>);

    rpcMock.mockReset();
  });

  it("returns null for empty inputs", async () => {
    const result = await findSupabaseAuthUserByEmail("   ");
    expect(result).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("maps RPC payload into SupabaseAdminUser", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "admin.match@example.com",
          phone: "+971500000000",
          app_metadata: { roles: ["ADMIN"] },
          user_metadata: { full_name: "Admin" },
          last_sign_in_at: "2025-11-12T00:00:00Z",
          created_at: "2025-11-10T00:00:00Z",
        },
      ],
      error: null,
    });

    const user = await findSupabaseAuthUserByEmail("Admin.Match@example.com");

    expect(rpcMock).toHaveBeenCalledWith("get_auth_user_by_email", {
      search_email: "admin.match@example.com",
    });
    expect(user?.id).toBe("user-1");
  });

  it("returns null when RPC returns an empty set", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const user = await findSupabaseAuthUserByEmail("missing@example.com");

    expect(user).toBeNull();
  });

  it("rethrows RPC errors", async () => {
    const failure = new Error("rpc-failed");
    rpcMock.mockResolvedValue({ data: null, error: failure });

    await expect(findSupabaseAuthUserByEmail("boom@example.com")).rejects.toThrow(
      failure,
    );
  });
});

function createAdminUsers(count: number, prefix: string) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-user-${index}`,
    email: `${prefix}.${index}@example.test`,
    phone: null,
    app_metadata: {},
    user_metadata: {},
    last_sign_in_at: null,
    created_at: new Date().toISOString(),
  })) as Record<string, unknown>[];
}

type ResponseOptions = {
  total?: string;
  link?: string;
};

function createUsersResponse(
  payload: Record<string, unknown>[],
  options: ResponseOptions,
) {
  const headers = new Headers();
  if (options.total) {
    headers.set("x-total-count", options.total);
  }
  if (options.link) {
    headers.set("link", options.link);
  }

  return new Response(
    JSON.stringify({
      users: payload,
    }),
    {
      headers,
    },
  );
}
