"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createDealWithWorkflow } from "@/lib/workflow/http/create-deal";
import type { DealRow } from "@/lib/workflow/http/create-deal";
import type { CreateDealWithEntitiesRequest } from "@/lib/workflow";

const inputSchema = z.object({
  source: z.string().min(1),
  reference: z.string().optional(),
  opManagerId: z.string().uuid().optional(),
  customer: z.object({
    full_name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  asset: z.object({
    make: z.string().min(1),
    model: z.string().min(1),
    type: z.string().optional(),
  }),
});

export type CreateOperationsDealInput = z.infer<typeof inputSchema>;

export type CreateOperationsDealResult =
  | { data: DealRow; error?: undefined }
  | { data?: undefined; error: string };

export async function createOperationsDeal(
  input: CreateOperationsDealInput,
): Promise<CreateOperationsDealResult> {
  const parsed = inputSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Введите корректные данные сделки." };
  }

  const payload: CreateDealWithEntitiesRequest = {
    source: parsed.data.source,
    op_manager_id: parsed.data.opManagerId,
    customer: {
      full_name: parsed.data.customer.full_name,
      email: parsed.data.customer.email,
      phone: parsed.data.customer.phone,
    },
    asset: {
      type: parsed.data.asset.type ?? "VEHICLE",
      make: parsed.data.asset.make,
      model: parsed.data.asset.model,
    },
    payload: parsed.data.reference
      ? {
          metadata: {
            reference: parsed.data.reference,
          },
        }
      : undefined,
  };

  const result = await createDealWithWorkflow(payload);

  if (!result.success) {
    return { error: result.message };
  }

  revalidatePath("/ops/deals");

  return { data: result.deal };
}
