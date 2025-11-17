type CleanupInput = {
  dealReference?: string;
  carVin?: string;
  clientEmail?: string;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET ?? "";

// Дополнительная защита от случайного удаления прод-данных.
// По умолчанию включена: чистим только E2E артефакты с префиксом E2E-/VIN E2E и email с субстрокой "e2e".
const PROTECT_PROD_DATA = (process.env.PROTECT_PROD_DATA ?? "true") !== "false";

function isSafeReference(ref?: string) {
  return !ref || /^e2e[-_]/i.test(ref);
}

function isSafeVin(vin?: string) {
  return !vin || /^e2e/i.test(vin);
}

function isSafeEmail(email?: string) {
  if (!email) return true;
  const lower = email.toLowerCase();
  return lower.includes("e2e") || lower.endsWith("@fastlease.test");
}

function hasSupabaseSecrets() {
  return SUPABASE_URL.length > 0 && SERVICE_ROLE_KEY.length > 0;
}

async function adminApi(path: string, init?: RequestInit) {
  if (!hasSupabaseSecrets()) return null;
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

async function deleteByFilter(table: string, filter: string) {
  const res = await adminApi(`/rest/v1/${table}?${filter}`, { method: "DELETE" });
  if (!res) return;
  if (!res.ok) {
    console.warn(`[e2e-cleanup] failed to delete from ${table}:`, res.status, await res.text());
  }
}

async function findDealIdsByReference(reference: string) {
  const filter = encodeURIComponent(`payload->metadata->>reference=eq.${reference}`);
  const res = await adminApi(`/rest/v1/deals?select=id,deal_number&${filter}&limit=10`);
  if (!res || !res.ok) return [];
  const data = (await res.json()) as Array<{ id: string }>;
  return data.map((row) => row.id);
}

async function findVehicleIdsByVin(vin: string) {
  const filter = encodeURIComponent(`vin=eq.${vin}`);
  const res = await adminApi(`/rest/v1/vehicles?select=id,vin&${filter}&limit=5`);
  if (!res || !res.ok) return [];
  const data = (await res.json()) as Array<{ id: string }>;
  return data.map((row) => row.id);
}

async function deleteDealsByReference(reference?: string) {
  if (!reference) return;
  if (PROTECT_PROD_DATA && !isSafeReference(reference)) {
    console.warn(`[e2e-cleanup] skip deals: unsafe reference ${reference}`);
    return;
  }
  const ids = await findDealIdsByReference(reference);
  if (ids.length === 0) return;
  const idList = encodeURIComponent(`(${ids.join(",")})`);
  await deleteByFilter("deals", `id=in.${idList}`);
}

async function deleteVehiclesByVin(vin?: string) {
  if (!vin) return;
  if (PROTECT_PROD_DATA && !isSafeVin(vin)) {
    console.warn(`[e2e-cleanup] skip vehicles: unsafe vin ${vin}`);
    return;
  }
  const ids = await findVehicleIdsByVin(vin);
  if (ids.length === 0) return;
  const idList = encodeURIComponent(`(${ids.join(",")})`);
  await deleteByFilter("vehicles", `id=in.${idList}`);
}

async function deleteAuthUserByEmail(email?: string) {
  if (!email) return;
  if (PROTECT_PROD_DATA && !isSafeEmail(email)) {
    console.warn(`[e2e-cleanup] skip auth user: unsafe email ${email}`);
    return;
  }
  const res = await adminApi(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
  if (!res || !res.ok) {
    return;
  }
  const data = (await res.json()) as { users?: Array<{ id: string }> } | { id?: string } | null;
  const users: Array<{ id: string }> =
    Array.isArray((data as any)?.users) ? (data as any).users : (data ? [data as any] : []);

  for (const user of users) {
    if (!user?.id) continue;
    const del = await adminApi(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
    if (!del?.ok) {
      console.warn(`[e2e-cleanup] failed to delete auth user ${user.id}:`, del?.status, await del?.text());
    }
  }
}

export async function cleanupE2EArtifacts(input: CleanupInput) {
  if (!hasSupabaseSecrets()) {
    console.warn("[e2e-cleanup] skip: Supabase secrets missing");
    return;
  }

  // Cascade order: deals -> vehicles -> auth user (client)
  await deleteDealsByReference(input.dealReference);
  await deleteVehiclesByVin(input.carVin);
  await deleteAuthUserByEmail(input.clientEmail);
}
