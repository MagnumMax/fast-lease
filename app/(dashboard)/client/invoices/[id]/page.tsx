import { notFound, redirect } from "next/navigation";
import { Download, Receipt } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import {
  formatCurrency,
  formatDate,
} from "@/app/(dashboard)/client/_components";

type InvoiceDetailsPageProps = {
  params: Promise<{ id: string }>;
};

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  due_date: string;
  issue_date: string;
  status: string;
  line_items: unknown;
  tax_breakdown: unknown;
  payment_terms: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  pdf_storage_path: string | null;
  deals?: {
    deal_number: string | null;
  } | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  received_at: string | null;
  created_at: string;
};

function normalizeLineItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: String(index),
      description: String(record.description ?? `Line ${index + 1}`),
      amount: Number(record.amount ?? 0),
    };
  });
}

function normalizeTaxItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const record = item as Record<string, unknown>;
    return {
      id: String(index),
      name: String(record.name ?? `Tax ${index + 1}`),
      amount: Number(record.amount ?? 0),
    };
  });
}

const DOCUMENTS_BUCKET = "application-documents";

export default async function InvoiceDetailsPage({
  params,
}: InvoiceDetailsPageProps) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(`/login?next=/client/invoices/${id}`);
  }

  const supabase = await createSupabaseServerClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `
        *,
        deals:deals!inner(
          deal_number
        )
      `,
    )
    .eq("id", id)
    .maybeSingle<InvoiceRow>();

  if (invoiceError) {
    console.error("[client-invoices] failed to load invoice", invoiceError);
  }

  if (!invoice) {
    notFound();
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", invoice.id)
    .order("created_at", { ascending: false }) as {
    data: PaymentRow[] | null;
  };

  const lineItems = normalizeLineItems(invoice.line_items);
  const taxItems = normalizeTaxItems(invoice.tax_breakdown);

  const pdfDownloadUrl = await createSignedStorageUrl({
    bucket: DOCUMENTS_BUCKET,
    path: invoice.pdf_storage_path,
  });

  const balance =
    invoice.total_amount -
    (payments ?? [])
      .filter((payment) => payment.status === "succeeded")
      .reduce((acc, payment) => acc + payment.amount, 0);

  return (
    <div className="space-y-8">
      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Invoice
            </p>
            <CardTitle className="text-2xl font-semibold text-foreground">
              {invoice.invoice_number ?? invoice.id}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Deal{" "}
              <span className="font-medium text-foreground">
                {invoice.deals?.deal_number ?? "—"}
              </span>
              . Issued {formatDate(invoice.issue_date)} · Due{" "}
              {formatDate(invoice.due_date)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {invoice.status.replace(/_/g, " ")}
            </span>
            <Button
              asChild={Boolean(pdfDownloadUrl)}
              size="sm"
              variant="outline"
              className="rounded-xl border-border text-xs font-semibold"
              disabled={!pdfDownloadUrl}
            >
              {pdfDownloadUrl ? (
                <a href={pdfDownloadUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Download PDF
                </a>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Line items</h2>
            <div className="space-y-3 rounded-2xl border border-border p-4">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <p className="text-muted-foreground">{item.description}</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              ))}
            </div>

            {taxItems.length ? (
              <div className="rounded-2xl border border-border bg-surface-subtle/40 p-4 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Taxes
                </p>
                <div className="mt-3 space-y-2">
                  {taxItems.map((tax) => (
                    <div
                      key={tax.id}
                      className="flex items-center justify-between text-muted-foreground"
                    >
                      <span>{tax.name}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(tax.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4 rounded-2xl border border-border bg-surface-subtle/40 p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Summary
            </h2>
            <dl className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="font-medium text-foreground">
                  {formatCurrency(invoice.amount)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Tax</dt>
                <dd className="font-medium text-foreground">
                  {formatCurrency(invoice.tax_amount)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                <dt className="text-foreground">Total due</dt>
                <dd className="font-semibold text-foreground">
                  {formatCurrency(invoice.total_amount)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                <dt className="text-foreground">Balance</dt>
                <dd
                  className={`font-semibold ${
                    balance > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {formatCurrency(balance)}
                </dd>
              </div>
            </dl>
            {invoice.payment_terms ? (
              <p className="text-xs text-muted-foreground">
                Terms: {invoice.payment_terms}
              </p>
            ) : null}
          </aside>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Receipt className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <CardTitle className="text-lg font-semibold text-foreground">
            Payment activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments && payments.length ? (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.method ?? "—"} ·{" "}
                    {payment.received_at
                      ? formatDate(payment.received_at)
                      : formatDate(payment.created_at)}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {payment.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No payments registered for this invoice yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
