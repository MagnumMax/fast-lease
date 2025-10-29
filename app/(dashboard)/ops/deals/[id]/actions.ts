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
  source: z.string().optional(),
  statusKey: z.string().optional(),
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
    source,
    statusKey,
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
  const nextSource = normalizeText(source);
  const nextStatusKey = statusKey ? statusKey.trim().toUpperCase() : null;

  if (nextStatusKey && !OPS_WORKFLOW_STATUS_MAP[nextStatusKey]) {
    return { success: false, error: "Указан неизвестный статус сделки." };
  }

  const payload: Record<string, unknown> = {
    deal_number: nextDealNumber.length > 0 ? nextDealNumber : null,
    source: nextSource.length > 0 ? nextSource : null,
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

  if (nextStatusKey) {
    payload.status = nextStatusKey;
  }

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
