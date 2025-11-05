"use server";

import { Buffer } from "node:buffer";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { OPS_WORKFLOW_STATUS_MAP } from "@/lib/supabase/queries/operations";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getWorkspacePaths } from "@/lib/workspace/routes";

const inputSchema = z.object({
  dealId: z.string().uuid(),
  statusKey: z.string().min(1),
  guardKey: z.string().min(1),
  note: z.string().optional(),
  slug: z.string().min(1),
});

const STORAGE_BUCKET = "deal-documents";
export type DealDocumentCategory = "required" | "signature" | "archived" | "other";
export type DealDocumentTypeValue = "contract" | "invoice" | "statement" | "schedule" | "other";

const DEAL_DOCUMENT_TYPE_META: Record<DealDocumentTypeValue, { title: string; category: DealDocumentCategory }> = {
  contract: { title: "Договор", category: "required" },
  invoice: { title: "Инвойс", category: "other" },
  statement: { title: "Statement of Account", category: "other" },
  schedule: { title: "График платежей", category: "required" },
  other: { title: "Документ сделки", category: "other" },
};

const DEAL_DOCUMENT_TYPE_VALUES = new Set<DealDocumentTypeValue>([
  "contract",
  "invoice",
  "statement",
  "schedule",
  "other",
]);

const uploadDealDocumentsSchema = z.object({
  dealId: z.string().uuid(),
  slug: z.string().min(1),
});

export type UploadDealDocumentsResult =
  | { success: true; uploaded: number }
  | { success: false; error: string };

export async function uploadDealDocuments(formData: FormData): Promise<UploadDealDocumentsResult> {
  const base = {
    dealId: formData.get("dealId"),
    slug: formData.get("slug"),
  } satisfies Record<string, unknown>;

  const parsed = uploadDealDocumentsSchema.safeParse(base);

  if (!parsed.success) {
    console.warn("[operations] invalid deal document upload payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные документа." };
  }

  const { dealId, slug } = parsed.data;

  const documentsMap = new Map<number, { type?: string; file?: File }>();

  for (const [key, value] of formData.entries()) {
    const match = /^documents\[(\d+)\]\[(type|file)\]$/.exec(key);
    if (!match) continue;
    const index = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(index)) continue;
    const existing = documentsMap.get(index) ?? {};
    if (match[2] === "type" && typeof value === "string") {
      existing.type = value;
    }
    if (match[2] === "file" && value instanceof File) {
      existing.file = value;
    }
    documentsMap.set(index, existing);
  }

  const rawDocuments = Array.from(documentsMap.values());

  const hasIncomplete = rawDocuments.some((entry) => {
    const type = typeof entry.type === "string" ? entry.type.trim() : "";
    const hasFile = entry.file instanceof File && entry.file.size > 0;
    return (type && !hasFile) || (hasFile && !type);
  });

  if (hasIncomplete) {
    return { success: false, error: "Выберите тип и файл для каждого документа." };
  }

  const documents = rawDocuments
    .map((entry) => {
      const typeRaw = typeof entry.type === "string" ? entry.type.trim().toLowerCase() : "";
      const typeValue = typeRaw as DealDocumentTypeValue;
      const file = entry.file instanceof File && entry.file.size > 0 ? entry.file : null;
      if (!typeRaw || !file) {
        return null;
      }
      if (!DEAL_DOCUMENT_TYPE_VALUES.has(typeValue)) {
        return null;
      }
      return { type: typeValue, file };
    })
    .filter((entry): entry is { type: DealDocumentTypeValue; file: File } => entry !== null);

  if (documents.length === 0) {
    return { success: true, uploaded: 0 };
  }

  try {
    const supabase = await createSupabaseServiceClient();
    let uploadedCount = 0;

    for (const doc of documents) {
      const sanitizedName = doc.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-") || "document";
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const objectPath = `${dealId}/${uniqueSuffix}-${sanitizedName}`;
      const buffer = Buffer.from(await doc.file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(objectPath, buffer, {
          contentType: doc.file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("[operations] failed to upload deal document", uploadError);
        return { success: false, error: "Не удалось загрузить документ." };
      }

      const meta = DEAL_DOCUMENT_TYPE_META[doc.type];
      const documentType = doc.type;
      const originalName = doc.file.name;
      const displayTitle = meta.title;
      const finalTitle = originalName ? `${displayTitle} (${originalName})` : displayTitle;

      const { error: insertError } = await supabase.from("deal_documents").insert({
        deal_id: dealId,
        title: finalTitle,
        document_type: documentType,
        status: "uploaded",
        storage_path: objectPath,
      });

      if (insertError) {
        console.error("[operations] failed to insert deal document metadata", insertError);
        await supabase.storage.from(STORAGE_BUCKET).remove([objectPath]);
        return { success: false, error: "Документ не сохранился. Попробуйте ещё раз." };
      }

      uploadedCount += 1;
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);
    if (slug !== dealId) {
      revalidatePath(`/ops/deals/${dealId}`);
    }

    return { success: true, uploaded: uploadedCount };
  } catch (error) {
    console.error("[operations] unexpected error while uploading deal documents", error);
    return { success: false, error: "Произошла ошибка при загрузке документов." };
  }
}

function resolveGuardMeta(statusKey: string, guardKey: string) {
  const statusMeta = OPS_WORKFLOW_STATUS_MAP[statusKey as keyof typeof OPS_WORKFLOW_STATUS_MAP];
  if (!statusMeta) return null;
  return statusMeta.exitGuards.find((guard: { key: string }) => guard.key === guardKey) ?? null;
}

function ensureGuardPayload(base: Record<string, unknown> | null | undefined) {
  const clone = base ? structuredClone(base) : {};
  if (typeof clone !== "object" || Array.isArray(clone)) {
    return { guard_tasks: {} as Record<string, unknown> };
  }
  if (!clone.guard_tasks || typeof clone.guard_tasks !== "object") {
    clone.guard_tasks = {};
  }
  return clone as Record<string, unknown> & { guard_tasks: Record<string, unknown> };
}

const updateDealSchema = z.object({
  dealId: z.string().uuid(),
  slug: z.string().min(1),
  dealNumber: z.string().optional(),
  principalAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  monthlyPayment: z.string().optional(),
  monthlyLeaseRate: z.string().optional(),
  interestRate: z.string().optional(),
  downPaymentAmount: z.string().optional(),
  securityDeposit: z.string().optional(),
  processingFee: z.string().optional(),
  termMonths: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  firstPaymentDate: z.string().optional(),
  activatedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

const verifyDealDeletionSchema = z.object({
  dealId: z.string().uuid(),
});

const deleteDealSchema = z.object({
  dealId: z.string().uuid(),
  slug: z.string().min(1),
});

function normalizeText(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed;
}

function parseDecimalInput(value?: string | null): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const cleaned = normalized.replace(/[^0-9,\.\-]/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function parseIntegerInput(value?: string | null): number | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function normalizeDateInput(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return trimmed;
}

function normalizeDateTimeLocal(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export async function completeDealGuardAction(
  prevState: { error?: string; success?: boolean },
  formData: FormData,
) {
  const parsed = inputSchema.safeParse({
    dealId: formData.get("dealId"),
    statusKey: formData.get("statusKey"),
    guardKey: formData.get("guardKey"),
    note: formData.get("note"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: "Введите корректные данные", success: false };
  }

  const { dealId, statusKey, guardKey, note, slug } = parsed.data;

  const guardMeta = resolveGuardMeta(statusKey, guardKey);
  if (!guardMeta) {
    return { error: "Задача не найдена для текущего статуса", success: false };
  }

  const file = formData.get("attachment") as File | null;

  if (guardMeta.requiresDocument && (!file || file.size === 0)) {
    return { error: "Необходимо приложить документ", success: false };
  }

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select("payload")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal payload", dealError);
      return { error: "Не удалось загрузить сделку", success: false };
    }

    if (!dealRow) {
      return { error: "Сделка не найдена", success: false };
    }

    const payload = ensureGuardPayload(dealRow.payload as Record<string, unknown> | null | undefined);

    let attachmentPath: string | null = null;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
      const path = `${dealId}/${guardKey}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error("[workflow] failed to upload attachment", uploadError);
        return { error: "Не удалось загрузить файл", success: false };
      }

      attachmentPath = path;

      const { error: insertDocError } = await supabase.from("deal_documents").insert({
        deal_id: dealId,
        title: guardMeta.label,
        document_type: guardKey,
        status: "uploaded",
        storage_path: attachmentPath,
      });

      if (insertDocError) {
        console.error("[workflow] failed to insert deal document", insertDocError);
        return { error: "Файл загружен, но запись не создана", success: false };
      }
    }

    payload.guard_tasks[guardKey] = {
      fulfilled: true,
      note: note?.trim() || null,
      attachment_path: attachmentPath,
      completed_at: new Date().toISOString(),
      label: guardMeta.label,
    };

    const { error: updateError } = await supabase
      .from("deals")
      .update({ payload })
      .eq("id", dealId);

    if (updateError) {
      console.error("[workflow] failed to update guard payload", updateError);
      return { error: "Не удалось обновить задачу", success: false };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);

    return { success: true, error: undefined };
  } catch (error) {
    console.error("[workflow] unexpected error while completing guard", error);
    return { error: "Произошла ошибка при выполнении задачи", success: false };
  }
}

export type UpdateOperationsDealInput = z.infer<typeof updateDealSchema>;

export type UpdateOperationsDealResult =
  | { success: true }
  | { success: false; error: string };

export type DealDeletionBlockerType = "payments" | "invoices" | "tasks";

export type VerifyDealDeletionResult =
  | { canDelete: true }
  | { canDelete: false; reason?: string; blockers?: Array<{ type: DealDeletionBlockerType; count: number }> };

export type VerifyDealDeletionInput = z.infer<typeof verifyDealDeletionSchema>;

export type DeleteOperationsDealInput = z.infer<typeof deleteDealSchema>;

export type DeleteOperationsDealResult =
  | { success: true }
  | { success: false; error: string };

export async function updateOperationsDeal(
  input: UpdateOperationsDealInput,
): Promise<UpdateOperationsDealResult> {
  const parsed = updateDealSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid deal update payload", parsed.error.flatten());
    return { success: false, error: "Проверьте введённые данные и попробуйте снова." };
  }

  const {
    dealId,
    slug,
    dealNumber,
    principalAmount,
    totalAmount,
    monthlyPayment,
    monthlyLeaseRate,
    interestRate,
    downPaymentAmount,
    securityDeposit,
    processingFee,
    termMonths,
    contractStartDate,
    contractEndDate,
    firstPaymentDate,
    activatedAt,
    completedAt,
  } = parsed.data;

  const nextDealNumber = normalizeText(dealNumber);
  const payload: Record<string, unknown> = {
    deal_number: nextDealNumber.length > 0 ? nextDealNumber : null,
    principal_amount: parseDecimalInput(principalAmount),
    total_amount: parseDecimalInput(totalAmount),
    monthly_payment: parseDecimalInput(monthlyPayment),
    monthly_lease_rate: parseDecimalInput(monthlyLeaseRate),
    interest_rate: parseDecimalInput(interestRate),
    down_payment_amount: parseDecimalInput(downPaymentAmount),
    security_deposit: parseDecimalInput(securityDeposit),
    processing_fee: parseDecimalInput(processingFee),
    term_months: parseIntegerInput(termMonths),
    contract_start_date: normalizeDateInput(contractStartDate),
    contract_end_date: normalizeDateInput(contractEndDate),
    first_payment_date: normalizeDateInput(firstPaymentDate),
    activated_at: normalizeDateTimeLocal(activatedAt),
    completed_at: normalizeDateTimeLocal(completedAt),
  };

  try {
    const supabase = await createSupabaseServiceClient();

    const { error } = await supabase
      .from("deals")
      .update(payload)
      .eq("id", dealId);

    if (error) {
      console.error("[operations] failed to update deal", { dealId, error });
      return { success: false, error: "Не удалось сохранить сделку." };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while updating deal", error);
    return { success: false, error: "Произошла ошибка при сохранении сделки." };
  }
}

export async function verifyDealDeletion(
  input: VerifyDealDeletionInput,
): Promise<VerifyDealDeletionResult> {
  const parsed = verifyDealDeletionSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid deal deletion check payload", parsed.error.flatten());
    return { canDelete: false, reason: "Некорректные данные для проверки удаления." };
  }

  const { dealId } = parsed.data;

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select("status")
      .eq("id", dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[operations] failed to load deal before deletion check", dealError);
      return { canDelete: false, reason: "Не удалось проверить сделку. Попробуйте позже." };
    }

    if (!dealRow) {
      return { canDelete: false, reason: "Сделка не найдена." };
    }

    const blockers: Array<{ type: DealDeletionBlockerType; count: number }> = [];

    const { count: paymentsCount, error: paymentsError } = await supabase
      .from("payments")
      .select("id", { head: true, count: "exact" })
      .eq("deal_id", dealId);

    if (paymentsError) {
      console.error("[operations] failed to check deal payments", paymentsError);
      return { canDelete: false, reason: "Не удалось проверить платежи сделки." };
    }

    if ((paymentsCount ?? 0) > 0) {
      blockers.push({ type: "payments", count: paymentsCount ?? 0 });
    }

    const { count: invoicesCount, error: invoicesError } = await supabase
      .from("invoices")
      .select("id", { head: true, count: "exact" })
      .eq("deal_id", dealId);

    if (invoicesError) {
      console.error("[operations] failed to check deal invoices", invoicesError);
      return { canDelete: false, reason: "Не удалось проверить счета сделки." };
    }

    if ((invoicesCount ?? 0) > 0) {
      blockers.push({ type: "invoices", count: invoicesCount ?? 0 });
    }

    const { count: tasksCount, error: tasksError } = await supabase
      .from("tasks")
      .select("id", { head: true, count: "exact" })
      .eq("deal_id", dealId);

    if (tasksError) {
      console.error("[operations] failed to check deal tasks", tasksError);
      return { canDelete: false, reason: "Не удалось проверить задачи сделки." };
    }

    if ((tasksCount ?? 0) > 0) {
      blockers.push({ type: "tasks", count: tasksCount ?? 0 });
    }

    if (blockers.length > 0) {
      const blockerLabels: Record<DealDeletionBlockerType, string> = {
        payments: "платежи",
        invoices: "счета",
        tasks: "задачи",
      };
      const parts = blockers
        .map((blocker) => `${blockerLabels[blocker.type]} — ${blocker.count}`)
        .join(", ");
      return {
        canDelete: false,
        reason: `Удаление невозможно: найдены связанные данные (${parts}).`,
        blockers,
      };
    }

    return { canDelete: true };
  } catch (error) {
    console.error("[operations] unexpected error while checking deal deletion", error);
    return {
      canDelete: false,
      reason: "Произошла ошибка при проверке возможности удаления сделки.",
    };
  }
}

export async function deleteOperationsDeal(
  input: DeleteOperationsDealInput,
): Promise<DeleteOperationsDealResult> {
  const parsed = deleteDealSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[operations] invalid deal delete payload", parsed.error.flatten());
    return { success: false, error: "Некорректные данные для удаления сделки." };
  }

  const { dealId, slug } = parsed.data;

  const verification = await verifyDealDeletion({ dealId });

  if (!verification.canDelete) {
    return {
      success: false,
      error: verification.reason ?? "Сделку нельзя удалить.",
    };
  }

  try {
    const supabase = await createSupabaseServiceClient();

    const { data: documentsData, error: documentsError } = await supabase
      .from("deal_documents")
      .select("storage_path")
      .eq("deal_id", dealId);

    if (documentsError) {
      console.warn("[operations] failed to load deal documents before deletion", documentsError);
    }

    const documentStoragePaths = (documentsData ?? [])
      .map((doc) => (typeof doc?.storage_path === "string" ? doc.storage_path : null))
      .filter((path): path is string => Boolean(path));

    const paymentsResponse = await supabase
      .from("payments")
      .select("id")
      .eq("deal_id", dealId);

    if (paymentsResponse.error) {
      console.error("[operations] failed to load deal payments before deletion", paymentsResponse.error);
      return { success: false, error: "Не удалось подготовить удаление сделки." };
    }

    const paymentIds = (paymentsResponse.data ?? [])
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => Boolean(id));

    if (paymentIds.length > 0) {
      const { error: transactionsDeleteError } = await supabase
        .from("payment_transactions")
        .delete()
        .in("payment_id", paymentIds);

      if (transactionsDeleteError) {
        console.error("[operations] failed to delete payment transactions", transactionsDeleteError);
        return { success: false, error: "Не удалось удалить связанные транзакции платежей." };
      }
    }

    const cascadedTables: Array<{ table: string; column: string }> = [
      { table: "payments", column: "deal_id" },
      { table: "payment_schedules", column: "deal_id" },
      { table: "invoices", column: "deal_id" },
      { table: "deal_documents", column: "deal_id" },
      { table: "deal_events", column: "deal_id" },
      { table: "workflow_task_queue", column: "deal_id" },
      { table: "workflow_schedule_queue", column: "deal_id" },
      { table: "workflow_notification_queue", column: "deal_id" },
      { table: "workflow_webhook_queue", column: "deal_id" },
      { table: "tasks", column: "deal_id" },
      { table: "vehicle_services", column: "deal_id" },
      { table: "portfolio_assets", column: "deal_id" },
      { table: "referral_rewards", column: "deal_id" },
      { table: "referral_deals", column: "deal_id" },
    ];

    for (const entry of cascadedTables) {
      const { error: cascadeError } = await supabase
        .from(entry.table)
        .delete()
        .eq(entry.column, dealId);

      if (cascadeError) {
        console.error(`[operations] failed to delete related ${entry.table}`, cascadeError);
        return { success: false, error: "Не удалось удалить связанные данные сделки." };
      }
    }

    const ticketsResponse = await supabase
      .from("support_tickets")
      .select("id")
      .eq("deal_id", dealId);

    if (ticketsResponse.error) {
      console.error("[operations] failed to load support tickets before deal deletion", ticketsResponse.error);
      return { success: false, error: "Не удалось удалить связанные обращения поддержки." };
    }

    const ticketIds = (ticketsResponse.data ?? [])
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => Boolean(id));

    if (ticketIds.length > 0) {
      const { error: messagesDeleteError } = await supabase
        .from("support_messages")
        .delete()
        .in("ticket_id", ticketIds);

      if (messagesDeleteError) {
        console.error("[operations] failed to delete support messages", messagesDeleteError);
        return { success: false, error: "Не удалось удалить переписку по обращениям поддержки." };
      }

      const { error: ticketsDeleteError } = await supabase
        .from("support_tickets")
        .delete()
        .in("id", ticketIds);

      if (ticketsDeleteError) {
        console.error("[operations] failed to delete support tickets", ticketsDeleteError);
        return { success: false, error: "Не удалось удалить обращения поддержки." };
      }
    }

    if (documentStoragePaths.length > 0) {
      const { error: storageDeleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(documentStoragePaths);

      if (storageDeleteError) {
        console.warn("[operations] failed to remove deal document files", storageDeleteError);
      }
    }

    const { error: dealDeleteError } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId);

    if (dealDeleteError) {
      console.error("[operations] failed to delete deal", dealDeleteError);
      return { success: false, error: "Не удалось удалить сделку." };
    }

    for (const path of getWorkspacePaths("deals")) {
      revalidatePath(path);
    }
    revalidatePath(`/ops/deals/${slug}`);
    if (slug !== dealId) {
      revalidatePath(`/ops/deals/${dealId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[operations] unexpected error while deleting deal", error);
    return { success: false, error: "Произошла ошибка при удалении сделки." };
  }
}
