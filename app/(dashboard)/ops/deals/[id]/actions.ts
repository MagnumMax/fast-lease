"use server";

import { Buffer } from "node:buffer";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { OPS_WORKFLOW_STATUS_MAP } from "@/lib/data/operations/deals";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

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
  return statusMeta.exitGuards.find((guard) => guard.key === guardKey) ?? null;
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

    revalidatePath("/ops/deals");
    revalidatePath(`/ops/deals/${slug}`);

    return { success: true, error: undefined };
  } catch (error) {
    console.error("[workflow] unexpected error while completing guard", error);
    return { error: "Произошла ошибка при выполнении задачи", success: false };
  }
}
