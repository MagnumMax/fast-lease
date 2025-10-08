import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import {
  createSupabaseClient,
  errorResponse,
  jsonResponse,
} from "../_shared/client.ts";

const supabase = createSupabaseClient();

type ProviderStatus =
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "pending";

interface PaymentTransactionPayload {
  reference?: string;
  provider?: string;
  status?: ProviderStatus | string;
  amount?: number;
  currency?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentSyncPayload {
  eventType: string;
  invoiceNumber?: string;
  dealId?: string;
  dryRun?: boolean;
  transaction?: PaymentTransactionPayload;
}

const paymentStatusMap: Record<string, "initiated" | "processing" | "succeeded" | "failed" | "refunded"> =
  {
    authorized: "processing",
    captured: "succeeded",
    pending: "processing",
    failed: "failed",
    refunded: "refunded",
  };

function mapProviderStatus(status?: string) {
  if (!status) return "processing";
  const normalized = status.toLowerCase();
  return paymentStatusMap[normalized] ?? "processing";
}

serve(async (req) => {
  if (req.method === "GET") {
    return jsonResponse({ ok: true, service: "payments-sync" });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed.", 405);
  }

  let payload: PaymentSyncPayload;
  try {
    payload = (await req.json()) as PaymentSyncPayload;
  } catch (_err) {
    return errorResponse("Invalid JSON payload.", 400);
  }

  const { invoiceNumber, dealId, transaction, dryRun = false } = payload ?? {};

  if (!invoiceNumber && !dealId) {
    return errorResponse(
      "Either `invoiceNumber` or `dealId` must be provided.",
      422
    );
  }

  const { data: invoice, error: invoiceError } = invoiceNumber
    ? await supabase
        .from("invoices")
        .select("id, deal_id, total_amount, currency, status, paid_at")
        .eq("invoice_number", invoiceNumber)
        .maybeSingle()
    : { data: null, error: null };

  if (invoiceError) {
    return errorResponse(
      "Failed to load invoice for the provided number.",
      500,
      invoiceError.message
    );
  }

  const resolvedDealId = dealId ?? invoice?.deal_id;
  if (!resolvedDealId) {
    return errorResponse(
      "Unable to resolve related deal for payment update.",
      422
    );
  }

  const paymentStatus = mapProviderStatus(transaction?.status);
  const transactionReference = transaction?.reference ?? crypto.randomUUID();

  if (!dryRun) {
    const { data: existingPayment, error: paymentQueryError } = await supabase
      .from("payments")
      .select("id")
      .eq("deal_id", resolvedDealId)
      .eq("invoice_id", invoice?.id ?? null)
      .maybeSingle();

    if (paymentQueryError) {
      return errorResponse(
        "Unable to query payment record.",
        500,
        paymentQueryError.message
      );
    }

    let paymentId = existingPayment?.id;

    if (!paymentId) {
      const { data: insertedPayment, error: insertPaymentError } =
        await supabase
          .from("payments")
          .insert({
            deal_id: resolvedDealId,
            invoice_id: invoice?.id ?? null,
            amount:
              transaction?.amount ??
              invoice?.total_amount ??
              0,
            currency:
              transaction?.currency ?? invoice?.currency ?? "AED",
            status: paymentStatus,
            method: null,
            received_at: transaction?.occurredAt ?? new Date().toISOString(),
            metadata: transaction?.metadata ?? {},
          })
          .select("id")
          .single();

      if (insertPaymentError) {
        return errorResponse(
          "Failed to create payment record.",
          500,
          insertPaymentError.message
        );
      }

      paymentId = insertedPayment.id;
    } else {
      const { error: updatePaymentError } = await supabase
        .from("payments")
        .update({
          status: paymentStatus,
          amount:
            transaction?.amount ??
            invoice?.total_amount ??
            null,
          currency: transaction?.currency ?? invoice?.currency ?? null,
          metadata: transaction?.metadata ?? {},
          received_at: transaction?.occurredAt ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (updatePaymentError) {
        return errorResponse(
          "Failed to update payment record.",
          500,
          updatePaymentError.message
        );
      }
    }

    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .upsert(
        {
          payment_id: paymentId,
          provider: transaction?.provider ?? "unknown",
          transaction_reference: transactionReference,
          amount:
            transaction?.amount ??
            invoice?.total_amount ??
            0,
          currency: transaction?.currency ?? invoice?.currency ?? "AED",
          status: paymentStatus,
          payload: transaction?.metadata ?? {},
          processed_at: transaction?.occurredAt ?? new Date().toISOString(),
        },
        { onConflict: "transaction_reference" }
      );

    if (transactionError) {
      return errorResponse(
        "Failed to persist payment transaction.",
        500,
        transactionError.message
      );
    }

    if (invoice?.id) {
      const invoiceStatus =
        paymentStatus === "succeeded"
          ? "paid"
          : paymentStatus === "failed"
          ? "overdue"
          : "pending";

      const paidAtValue =
        paymentStatus === "succeeded"
          ? new Date().toISOString()
          : invoice?.status === "paid"
          ? invoice?.paid_at
          : null;

      const { error: updateInvoiceError } = await supabase
        .from("invoices")
        .update({
          status: invoiceStatus,
          paid_at: paidAtValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (updateInvoiceError) {
        return errorResponse(
          "Failed to update invoice status.",
          500,
          updateInvoiceError.message
        );
      }
    }
  }

  return jsonResponse({
    ok: true,
    dryRun,
    invoiceNumber,
    dealId: resolvedDealId,
    transactionReference,
    paymentStatus,
  });
});
