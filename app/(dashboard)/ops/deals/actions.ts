"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createDealWithWorkflow } from "@/lib/workflow/http/create-deal";
import type { DealRow } from "@/lib/workflow/http/create-deal";
import type { CreateDealWithEntitiesRequest } from "@/lib/workflow";
import { getWorkspacePaths } from "@/lib/workspace/routes";
import { DEAL_COMPANY_CODES, DEFAULT_DEAL_COMPANY_CODE } from "@/lib/data/deal-companies";
import { getMutationSessionUser } from "@/lib/auth/guards";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";

const inputSchema = z.object({
  source: z.string().min(1),
  reference: z.string().optional(),
  opManagerId: z.string().uuid().optional(),
  companyCode: z.enum(DEAL_COMPANY_CODES).default(DEFAULT_DEAL_COMPANY_CODE),
  buyerType: z.enum(["individual", "company"]),
  sellerType: z.enum(["individual", "company"]),
  sellerId: z.string().uuid().optional(),
  customer: z.object({
    full_name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  asset: z.object({
    make: z.string().min(1),
    model: z.string().min(1),
    type: z.string().optional(),
    vin: z.string().min(1).optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    price: z.number().nonnegative().nullable().optional(),
    mileage: z.number().nonnegative().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type CreateOperationsDealInput = z.infer<typeof inputSchema>;

export type CreateOperationsDealResult =
  | { data: DealRow; error?: undefined }
  | { data?: undefined; error: string };

export async function createOperationsDeal(
  input: CreateOperationsDealInput,
): Promise<CreateOperationsDealResult> {
  console.log(`[DEBUG] createOperationsDeal called with input:`, input);

  const parsed = inputSchema.safeParse(input);

  if (!parsed.success) {
    console.error(`[DEBUG] input validation failed:`, parsed.error);
    return { error: "Введите корректные данные сделки." };
  }

  const sessionUser = await getMutationSessionUser();
  if (!sessionUser) {
    return { error: READ_ONLY_ACCESS_MESSAGE };
  }

  console.log(`[DEBUG] parsed input:`, parsed.data);

  let sellerType = parsed.data.sellerType;

  if (parsed.data.sellerId) {
    const supabase = await createSupabaseServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("entity_type")
      .eq("user_id", parsed.data.sellerId)
      .maybeSingle();

    if (profile?.entity_type) {
      sellerType = profile.entity_type as "individual" | "company";
    }
  }

  const partyPayload = {
    buyer_type: parsed.data.buyerType,
    seller_type: sellerType,
  } satisfies Record<string, unknown>;

  const metadataPayload = parsed.data.reference
    ? {
      metadata: {
        reference: parsed.data.reference,
      },
    }
    : {};

  const opManagerId = parsed.data.opManagerId ?? sessionUser.user.id;

  const payload: CreateDealWithEntitiesRequest = {
    source: parsed.data.source,
    company_code: parsed.data.companyCode ?? DEFAULT_DEAL_COMPANY_CODE,
    op_manager_id: opManagerId,
    customer: {
      full_name: parsed.data.customer.full_name,
      email: parsed.data.customer.email,
      phone: parsed.data.customer.phone,
    },
    asset: {
      type: parsed.data.asset.type ?? "VEHICLE",
      make: parsed.data.asset.make,
      model: parsed.data.asset.model,
      vin: parsed.data.asset.vin,
      year: parsed.data.asset.year,
      price: parsed.data.asset.price ?? undefined,
      meta: parsed.data.asset.meta,
    },
    payload: {
      ...partyPayload,
      ...metadataPayload,
    },
  };

  console.log(`[DEBUG] calling createDealWithWorkflow with payload:`, payload);
  const result = await createDealWithWorkflow(payload);

  if (!result.success) {
    console.error(`[DEBUG] createDealWithWorkflow failed:`, result.message);
    return { error: result.message };
  }

  console.log(`[DEBUG] deal created successfully:`, result.deal.id, `deal_number:`, result.deal.deal_number);

  if (parsed.data.sellerId) {
    const supabase = await createSupabaseServiceClient();
    const { error: sellerUpdateError } = await supabase
      .from("deals")
      .update({ seller_id: parsed.data.sellerId })
      .eq("id", result.deal.id);

    if (sellerUpdateError) {
      console.error("[workflow] failed to assign seller to deal", sellerUpdateError);
      return { error: "Не удалось закрепить продавца за сделкой." };
    }
  }

  for (const path of getWorkspacePaths("deals")) {
    revalidatePath(path);
  }

  return { data: result.deal };
}
