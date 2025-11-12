import { createSupabaseServiceClient } from "@/lib/supabase/server";

const ADMIN_USERS_PATH = "/auth/v1/admin/users";
const MAX_PAGE_SIZE = 30;
const DEFAULT_PAGE_SIZE = 30;
const DEFAULT_MAX_PAGES = 40;

export type SupabaseAdminUser = {
  id: string;
  email: string | null;
  phone: string | null;
  app_metadata: Record<string, unknown> | null;
  user_metadata: Record<string, unknown> | null;
  last_sign_in_at: string | null;
  created_at: string;
};

export type ListSupabaseAuthUsersOptions = {
  perPage?: number;
  page?: number;
  maxPages?: number;
};

export type FetchSupabaseAuthUsersPageOptions = {
  page: number;
  perPage?: number;
};

export async function listSupabaseAuthUsers(
  options: ListSupabaseAuthUsersOptions = {},
): Promise<SupabaseAdminUser[]> {
  const perPage = clampPageSize(options.perPage ?? DEFAULT_PAGE_SIZE);
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES);
  const aggregated: SupabaseAdminUser[] = [];

  let page = Math.max(1, options.page ?? 1);
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    let pageResult: AdminUsersPageResult = {
      users: [],
      hasNextPage: false,
    };
    try {
      pageResult = await fetchSupabaseAuthUsersPageInternal({
        page,
        perPage,
      });
    } catch (error) {
      if (aggregated.length > 0) {
        console.warn(
          `[admin-auth] Failed to load auth users page ${page}, returning ${aggregated.length} cached entries (${formatErrorMessage(error)})`,
        );
        break;
      }

      throw error;
    }

    aggregated.push(...pageResult.users);
    pagesFetched += 1;

    const reachedSinglePage = typeof options.page === "number";
    const noMorePages = !pageResult.hasNextPage;

    if (reachedSinglePage || noMorePages) {
      break;
    }

    page += 1;
  }

  if (
    !options.page &&
    options.maxPages === undefined &&
    pagesFetched >= maxPages &&
    aggregated.length &&
    aggregated.length % perPage === 0
  ) {
    console.warn(
      `[admin-auth] listSupabaseAuthUsers stopped after ${pagesFetched} pages (limit ${maxPages}). Increase maxPages if you expect more records.`,
    );
  }

  return aggregated;
}

export async function fetchSupabaseAuthUsersPage(
  options: FetchSupabaseAuthUsersPageOptions,
): Promise<SupabaseAdminUser[]> {
  const perPage = clampPageSize(options.perPage ?? DEFAULT_PAGE_SIZE);
  const page = Math.max(1, options.page);

  const result = await fetchSupabaseAuthUsersPageInternal({
    page,
    perPage,
  });

  return result.users;
}

export async function findSupabaseAuthUserByEmail(
  email: string,
): Promise<SupabaseAdminUser | null> {
  const sanitizedEmail = sanitizeEmail(email);
  if (!sanitizedEmail) {
    return null;
  }

  const serviceClient = await createSupabaseServiceClient();
  const { data, error } = await serviceClient.rpc("get_auth_user_by_email", {
    search_email: sanitizedEmail,
  });

  if (error) {
    throw error;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  return mapAdminUser(data[0]);
}

type InternalPageOptions = {
  page: number;
  perPage: number;
};

type AdminUsersPageResult = {
  users: SupabaseAdminUser[];
  hasNextPage: boolean;
};

async function fetchSupabaseAuthUsersPageInternal(
  options: InternalPageOptions,
): Promise<AdminUsersPageResult> {
  const { supabaseUrl, serviceRoleKey } = resolveSupabaseAdminCredentials();
  const url = new URL(ADMIN_USERS_PATH, ensureTrailingSlash(supabaseUrl));
  url.searchParams.set("page", String(options.page));
  url.searchParams.set("per_page", String(options.perPage));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await safeReadBody(response);
    throw new Error(
      `Supabase admin users request failed (${response.status}): ${errorText}`,
    );
  }

  const payload = (await response.json()) as { users?: unknown };
  const users = Array.isArray(payload?.users) ? payload.users : [];
  const mapped = users.map(mapAdminUser);
  const hasNextPage = determineHasNextPage({
    headers: response.headers,
    currentPage: options.page,
    perPage: options.perPage,
    currentCount: mapped.length,
  });

  return {
    users: mapped,
    hasNextPage,
  };
}

type PaginationContext = {
  headers: Headers;
  currentPage: number;
  perPage: number;
  currentCount: number;
};

function determineHasNextPage(context: PaginationContext) {
  const paginationHints = parseLinkHeader(context.headers.get("link"));
  if (
    typeof paginationHints.next === "number" &&
    paginationHints.next > context.currentPage
  ) {
    return true;
  }

  if (
    typeof paginationHints.last === "number" &&
    paginationHints.last > context.currentPage
  ) {
    return true;
  }

  const total = parseTotalHeader(context.headers.get("x-total-count"));
  if (Number.isFinite(total) && total > 0) {
    const lastPage = Math.max(1, Math.ceil(total / context.perPage));
    return context.currentPage < lastPage;
  }

  return false;
}

type ParsedLinkHeader = {
  next?: number;
  last?: number;
};

function parseLinkHeader(value: string | null): ParsedLinkHeader {
  if (!value) {
    return {};
  }

  const entries = value
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const result: ParsedLinkHeader = {};
  for (const entry of entries) {
    const match = entry.match(/<[^>]*?[?&]page=(\d+)[^>]*>\s*;\s*rel="(\w+)"/);
    if (!match) {
      continue;
    }

    const pageNumber = Number.parseInt(match[1], 10);
    const rel = match[2] as keyof ParsedLinkHeader;
    if (!Number.isNaN(pageNumber)) {
      result[rel] = pageNumber;
    }
  }

  return result;
}

function parseTotalHeader(value: string | null): number {
  if (!value) {
    return Number.NaN;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function resolveSupabaseAdminCredentials() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase admin credentials are missing. Ensure NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET) are set.",
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function clampPageSize(value: number) {
  if (Number.isNaN(value) || value <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.max(1, Math.floor(value)), MAX_PAGE_SIZE);
}

function sanitizeEmail(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : undefined;
}

function mapAdminUser(input: unknown): SupabaseAdminUser {
  if (!input || typeof input !== "object") {
    throw new Error("Supabase admin user payload is malformed");
  }

  const record = input as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id.length) {
    throw new Error("Supabase admin user is missing an id field");
  }

  return {
    id: record.id,
    email: typeof record.email === "string" ? record.email : null,
    phone: typeof record.phone === "string" && record.phone.length
      ? record.phone
      : null,
    app_metadata: isRecord(record.app_metadata) ? record.app_metadata : null,
    user_metadata: isRecord(record.user_metadata) ? record.user_metadata : null,
    last_sign_in_at:
      typeof record.last_sign_in_at === "string"
        ? record.last_sign_in_at
        : null,
    created_at:
      typeof record.created_at === "string"
        ? record.created_at
        : new Date().toISOString(),
  } satisfies SupabaseAdminUser;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function safeReadBody(response: Response) {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown error";
}
