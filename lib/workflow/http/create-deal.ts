"use server";

import { promises as fs } from "node:fs";
import path from "node:path";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createSupabaseWorkflowVersionRepository } from "@/lib/supabase/queries/workflow-versions";
import {
  WorkflowVersionService,
  type WorkflowVersionRecord,
} from "@/lib/workflow/versioning";
import type {
  CreateDealRequest,
  CreateDealWithEntitiesRequest,
} from "@/lib/workflow";

export type DealRow = {
   id: string;
   workflow_id: string;
   workflow_version_id: string | null;
   customer_id: string | null;
   asset_id: string | null;
   source: string | null;
   status: string;
   op_manager_id: string | null;
   deal_number: string | null;
   created_at: string;
   updated_at: string;
   payload: Record<string, unknown> | null;
 };

type CreateDealResult =
  | { success: true; deal: DealRow }
  | { success: false; statusCode: number; message: string };

// Sequential deal number generator starting from 1000
let dealNumberCounter = 1000;

async function generateSequentialDealNumber(): Promise<string> {
  // In a real application, this would query the database for the last used number
  // For now, we'll use an in-memory counter starting from 1000
  const currentNumber = dealNumberCounter++;
  return `FL-${currentNumber}`;
}

const DEFAULT_GUARD_PAYLOAD: Record<string, unknown> = {
  quotationPrepared: false,
  vehicle: { verified: false },
  docs: { required: { allUploaded: false } },
  risk: { approved: false },
  finance: { approved: false },
  investor: { approved: false },
  legal: { contractReady: false },
  esign: { allSigned: false },
  payments: {
    advanceReceived: false,
    supplierPaid: false,
  },
  delivery: { confirmed: false },
};

function deepMergePayload(
  base: Record<string, unknown>,
  override?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!override) {
    return { ...base };
  }

  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      result[key] = deepMergePayload(
        current as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }

    result[key] = value;
  }

  return result;
}

let defaultWorkflowSourceCache: string | null = null;

type PostgrestError = {
  code?: string;
  message?: string;
};

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as PostgrestError;
  return candidate.code === "PGRST205";
}

async function loadDefaultWorkflowSource(): Promise<string> {
  if (defaultWorkflowSourceCache) {
    return defaultWorkflowSourceCache;
  }

  const templatePath = path.join(
    process.cwd(),
    "docs",
    "workflow_template.yaml",
  );

  const source = await fs.readFile(templatePath, "utf8");
  defaultWorkflowSourceCache = source;
  return source;
}

async function ensureActiveWorkflowVersion(
  service: WorkflowVersionService,
): Promise<WorkflowVersionRecord | null> {
  const existing = await service.getActiveVersion("fast-lease-v1");
  if (existing) {
    return existing;
  }

  try {
    const sourceYaml = await loadDefaultWorkflowSource();
    const created = await service.createVersion({
      sourceYaml,
      activate: true,
    });
    return created;
  } catch (error) {
    console.error("[workflow] failed to bootstrap default workflow version", error);
    return null;
  }
}

export async function createDealWithWorkflow(
  payload: CreateDealRequest,
): Promise<CreateDealResult> {
  try {
    const supabase = await createSupabaseServiceClient();
    const versionService = new WorkflowVersionService(
      createSupabaseWorkflowVersionRepository(supabase),
    );

    const activeVersion = await ensureActiveWorkflowVersion(versionService);

    if (!activeVersion) {
      return {
        success: false,
        statusCode: 500,
        message: "Workflow version is not configured",
      };
    }

    let customerId: string | null = null;
    let assetId: string | null = null;
    let createdCustomer = false;
    let createdAsset = false;

    if ("customer_id" in payload && "asset_id" in payload) {
      customerId = payload.customer_id;
      assetId = payload.asset_id;
    } else {
      const { customer, asset } = payload as CreateDealWithEntitiesRequest;

      const customerInsert = await supabase
        .from("workflow_contacts")
        .insert({
          full_name: customer.full_name,
          email: customer.email ?? null,
          phone: customer.phone ?? null,
        })
        .select("id")
        .single();

      if (customerInsert.error || !customerInsert.data) {
        if (isMissingTableError(customerInsert.error)) {
          console.warn(
            "[workflow] skipping contact creation – table missing",
            customerInsert.error,
          );
        } else {
          console.error("[workflow] failed to create contact", customerInsert.error);
          return {
            success: false,
            statusCode: 500,
            message: "Failed to create contact",
          };
        }
      } else {
        customerId = customerInsert.data.id;
        createdCustomer = true;
      }

      const assetInsert = await supabase
        .from("workflow_assets")
        .insert({
          type: asset.type ?? "VEHICLE",
          make: asset.make,
          model: asset.model,
          trim: asset.trim ?? null,
          year: asset.year ?? null,
          supplier: asset.supplier ?? null,
          price: asset.price ?? null,
          vin: asset.vin ?? null,
          meta: asset.meta ?? null,
        })
        .select("id")
        .single();

      if (assetInsert.error || !assetInsert.data) {
        if (isMissingTableError(assetInsert.error)) {
          console.warn(
            "[workflow] skipping asset creation – table missing",
            assetInsert.error,
          );
        } else {
          if (createdCustomer && customerId) {
            const cleanupContact = await supabase
              .from("workflow_contacts")
              .delete()
              .eq("id", customerId);
            if (cleanupContact.error) {
              console.error(
                "[workflow] failed to cleanup contact after asset error",
                cleanupContact.error,
              );
            }
            customerId = null;
            createdCustomer = false;
          }

          console.error("[workflow] failed to create asset", assetInsert.error);
          return {
            success: false,
            statusCode: 500,
            message: "Failed to create asset",
          };
        }
      } else {
        assetId = assetInsert.data.id;
        createdAsset = true;
      }
    }

    const mergedPayload = deepMergePayload(
      DEFAULT_GUARD_PAYLOAD,
      payload.payload ?? null,
    );

    // Generate deal number - SEQUENTIAL NUMBERING starting from 1000
    const dealNumber = await generateSequentialDealNumber();
    console.log(`[DEBUG] Generated sequential deal number: ${dealNumber}`);

    const { data, error } = await supabase
      .from("deals")
      .insert({
        workflow_id: activeVersion.workflowId,
        workflow_version_id: activeVersion.id,
        customer_id: customerId,
        asset_id: assetId,
        source: payload.source,
        status: "NEW",
        op_manager_id: payload.op_manager_id ?? null,
        deal_number: dealNumber,
        payload: mergedPayload,
      })
      .select(
        "id, workflow_id, workflow_version_id, customer_id, asset_id, source, status, op_manager_id, deal_number, created_at, updated_at, payload",
      )
      .single<DealRow>();

    if (error || !data) {
      console.error(`[DEBUG] failed to create deal in database:`, error);
      if (createdCustomer && customerId) {
        const cleanupContact = await supabase
          .from("workflow_contacts")
          .delete()
          .eq("id", customerId);
        if (cleanupContact.error) {
          console.error(
            "[workflow] failed to cleanup contact after deal error",
            cleanupContact.error,
          );
        }
      }
      if (createdAsset && assetId) {
        const cleanupAsset = await supabase
          .from("workflow_assets")
          .delete()
          .eq("id", assetId);
        if (cleanupAsset.error) {
          console.error(
            "[workflow] failed to cleanup asset after deal error",
            cleanupAsset.error,
          );
        }
      }
      console.error("[workflow] failed to create deal", error);
      return {
        success: false,
        statusCode: 500,
        message: "Failed to create deal",
      };
    }

    console.log(`[DEBUG] successfully created deal:`, data.id, `with deal_number:`, data.deal_number);
    return { success: true, deal: data };
  } catch (error) {
    console.error("[workflow] unexpected error while creating deal", error);
    return {
      success: false,
      statusCode: 500,
      message: "Unexpected error while creating deal",
    };
  }
}
