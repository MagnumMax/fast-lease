import { z } from "zod";
import { DEAL_COMPANY_CODES, DEFAULT_DEAL_COMPANY_CODE } from "@/lib/data/deal-companies";

const createDealBaseSchema = z.object({
  source: z.string().min(1),
  op_manager_id: z.string().uuid().optional(),
  company_code: z.enum(DEAL_COMPANY_CODES).default(DEFAULT_DEAL_COMPANY_CODE),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const createDealFromReferencesSchema = createDealBaseSchema.extend({
  client_id: z.string().uuid(),
  asset_id: z.string().uuid(),
});

const createDealWithEntitiesSchema = createDealBaseSchema.extend({
  customer: z.object({
    full_name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  asset: z.object({
    type: z.string().min(1).default("VEHICLE"),
    make: z.string().min(1),
    model: z.string().min(1),
    trim: z.string().optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    vin: z.string().optional(),
    supplier: z.string().optional(),
    price: z.number().nonnegative().optional(),
    mileage: z.number().nonnegative().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const createDealRequestSchema = z.union([
  createDealFromReferencesSchema,
  createDealWithEntitiesSchema,
]);

export type CreateDealRequest = z.infer<typeof createDealRequestSchema>;
export type CreateDealWithEntitiesRequest = z.infer<typeof createDealWithEntitiesSchema>;
export type CreateDealFromReferencesRequest = z.infer<typeof createDealFromReferencesSchema>;

export const listDealsQuerySchema = z.object({
  status: z.string().optional(),
  op_manager_id: z.string().uuid().optional(),
  source: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>;

export const transitionRequestSchema = z.object({
  to_status: z
    .enum([
      "OFFER_PREP",
      "VEHICLE_CHECK",
      "DOCS_COLLECT",
      "RISK_REVIEW",
      "FINANCE_REVIEW",
      "INVESTOR_PENDING",
      "CONTRACT_PREP",
      "DOC_SIGNING",
      "SIGNING_FUNDING",
      "VEHICLE_DELIVERY",
      "ACTIVE",
    ]),
  actor_role: z
    .enum([
      "OP_MANAGER",
      "RISK_MANAGER",
      "FINANCE",
      "INVESTOR",
      "LEGAL",
      "ACCOUNTING",
      "ADMIN",
    ])
    .optional(),
  guard_context: z.record(z.string(), z.unknown()).optional(),
  comment: z.string().optional(),
});

export type TransitionRequest = z.infer<typeof transitionRequestSchema>;

export const listDealTasksQuerySchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "DONE", "BLOCKED"])
    .optional(),
});

export type ListDealTasksQuery = z.infer<typeof listDealTasksQuerySchema>;

export const completeTaskRequestSchema = z.object({
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type CompleteTaskRequest = z.infer<typeof completeTaskRequestSchema>;

export const esignEventSchema = z.object({
  deal_id: z.string().uuid(),
  status: z.enum(["COMPLETED", "DECLINED"]),
  envelope_id: z.string().min(1).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type EsignEventPayload = z.infer<typeof esignEventSchema>;

export const bankEventSchema = z.object({
  deal_id: z.string().uuid(),
  kind: z.enum(["ADVANCE", "SUPPLIER"]),
  status: z.enum(["CONFIRMED", "FAILED"]),
  amount: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  external_ref: z.string().optional(),
});

export type BankEventPayload = z.infer<typeof bankEventSchema>;

export const aecbEventSchema = z.object({
  deal_id: z.string().uuid(),
  aecb_score: z.number().int(),
  approved: z.boolean(),
  notes: z.string().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

export type AecbEventPayload = z.infer<typeof aecbEventSchema>;
