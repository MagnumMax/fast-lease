import { notFound } from "next/navigation";

import { TaskDetailView } from "@/app/(dashboard)/ops/_components/task-detail";
import {
  CLIENT_DOCUMENT_TYPES,
  DEAL_DOCUMENT_TYPES,
  OPS_VEHICLE_STATUS_META,
  OPS_WORKFLOW_STATUS_MAP,
  VEHICLE_DOCUMENT_TYPES,
  getClientDocumentLabel,
  getDealDocumentLabel,
  getVehicleDocumentLabel,
  normalizeClientDocumentType,
  normalizeDealDocumentType,
  normalizeVehicleDocumentType,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import { getWorkspaceTaskById } from "@/lib/supabase/queries/tasks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";
import { resolveTaskGuardKey } from "@/lib/workflow/task-utils";
import { completeTaskFormAction } from "./actions";
import {
  evaluateClientDocumentChecklist,
  extractChecklistFromTaskPayload,
  type ClientDocumentChecklist,
  type ClientDocumentSummary,
} from "@/lib/workflow/documents-checklist";

const VEHICLE_VERIFICATION_GUARD_KEY = "vehicle.verified";
const TECHNICAL_REPORT_TYPE: ClientDocumentTypeValue = "technical_report";
const FINANCE_REVIEW_TASK_TYPE = "FIN_CALC";
const INVESTOR_APPROVAL_TASK_TYPE = "INVESTOR_APPROVAL";

type GuardDocumentLink = {
  id: string;
  title: string | null;
  documentType: string | null;
  storagePath: string | null;
  status: string | null;
  url: string | null;
};

type TaskPageParams = {
  params: Promise<{ id: string }>;
};

const DEAL_STORAGE_BUCKET = "deal-documents";
const CLIENT_STORAGE_BUCKET = "client-documents";
const VEHICLE_STORAGE_BUCKET = "vehicle-documents";

type SummaryDataPoint = { label: string; value: string };
type SummaryDocumentEntry = { label: string; value: string; status?: string | null; url?: string | null };
type FinanceEntitySnapshot = {
  title: string;
  data: SummaryDataPoint[];
  documents: SummaryDocumentEntry[];
};
type FinanceReviewSnapshot = {
  deal: FinanceEntitySnapshot;
};
type CommercialOfferExtract = {
  priceVat: number | null;
  termMonths: number | null;
  downPaymentAmount: number | null;
  interestRateAnnual: number | null;
  insuranceRateAnnual: number | null;
  comment: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  updatedByEmail: string | null;
  updatedByPhone: string | null;
};

type ClientDocumentWithUrl = ClientDocumentSummary & { signedUrl: string | null };
type DealDocumentWithUrl = {
  id: string;
  document_type: string | null;
  title: string | null;
  status: string | null;
  storage_path: string | null;
  metadata?: unknown;
  signedUrl: string | null;
};
type VehicleDocumentWithUrl = {
  id: string;
  document_type: string | null;
  title: string | null;
  status: string | null;
  storage_path: string | null;
  metadata?: unknown;
  signedUrl: string | null;
};

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat("ru-RU");

function formatCurrencyValue(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? currencyFormatter.format(num) : "—";
}

function formatPercentValue(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? `${percentFormatter.format(num)}%` : "—";
}

function formatNumberValue(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) ? numberFormatter.format(num) : "—";
}

function formatDateValue(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU");
}

function formatStringValue(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
  }
  if (value == null) return "—";
  return String(value);
}

function getStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function pickString(obj: unknown, key: string): string | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function pickNumber(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function parseQuoteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[^0-9.,-]/g, "")
    .replace(/\s+/g, "")
    .replace(/,(?=\\d{3}\\b)/g, "")
    .replace(/,/g, ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractCommercialOfferFromPayload(payload: unknown): CommercialOfferExtract | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const branch = payload as Record<string, unknown>;
  const priceVat = parseQuoteNumber(branch["price_vat"]);
  const termMonths = parseQuoteNumber(branch["term_months"]);
  const downPaymentAmount = parseQuoteNumber(branch["down_payment_amount"]);
  const interestRateAnnual = parseQuoteNumber(branch["interest_rate_annual"]);
  const insuranceRateAnnual = parseQuoteNumber(branch["insurance_rate_annual"]);

  const metaBranch =
    branch["quote_meta"] && typeof branch["quote_meta"] === "object" && !Array.isArray(branch["quote_meta"])
      ? (branch["quote_meta"] as Record<string, unknown>)
      : {};

  const comment = getStringValue(metaBranch["comment"]) ?? getStringValue(branch["guard_note"]) ?? null;

  const offer: CommercialOfferExtract = {
    priceVat,
    termMonths,
    downPaymentAmount,
    interestRateAnnual,
    insuranceRateAnnual,
    comment,
    updatedAt: getStringValue(metaBranch["updated_at"]),
    updatedBy: getStringValue(metaBranch["updated_by"]),
    updatedByName: getStringValue(metaBranch["updated_by_name"]),
    updatedByEmail: getStringValue(metaBranch["updated_by_email"]),
    updatedByPhone: getStringValue(metaBranch["updated_by_phone"]),
  };

  const hasValue =
    offer.priceVat != null ||
    offer.termMonths != null ||
    offer.downPaymentAmount != null ||
    offer.interestRateAnnual != null ||
    offer.insuranceRateAnnual != null ||
    (offer.comment && offer.comment.length > 0);

  return hasValue ? offer : null;
}

function buildDocumentEntries<T extends { document_type?: string | null; title?: string | null; status?: string | null; signedUrl?: string | null }>(
  registry: ReadonlyArray<{ value: string; label: string }>,
  normalize: (value?: string | null) => string | undefined,
  resolveLabel: (value?: string | null) => string | undefined,
  documents: T[],
): SummaryDocumentEntry[] {
  const map = new Map<string, T>();
  documents.forEach((doc) => {
    const normalized = normalize(doc.document_type ?? undefined) ?? doc.document_type ?? "";
    if (!normalized) return;
    if (!map.has(normalized)) {
      map.set(normalized, doc);
    }
  });

  return registry.map((entry) => {
    const normalized = normalize(entry.value) ?? entry.value;
    const match = normalized ? map.get(normalized) : undefined;
    return {
      label: resolveLabel(entry.value) ?? entry.label,
      value: match ? formatStringValue(match.title ?? entry.label) : "—",
      status: match?.status ?? null,
      url: match?.signedUrl ?? null,
    };
  });
}

export default async function TaskDetailPage({ params }: TaskPageParams) {
  const { id } = await params;
  const task = await getWorkspaceTaskById(id);

  if (!task) {
    notFound();
  }

  const guardKey = resolveTaskGuardKey(task);
  const stageMeta = task.workflowStageKey ? OPS_WORKFLOW_STATUS_MAP[task.workflowStageKey] : null;
  const guardMeta = guardKey && stageMeta
    ? stageMeta.exitGuards.find((guard) => guard.key === guardKey) ?? null
    : null;

  let guardState: {
    note: string | null;
    attachmentPath: string | null;
    attachmentUrl: string | null;
    documentType: string | null;
  } | null = null;
  let dealSummary: { id: string; dealNumber: string | null; clientId: string | null; vehicleId: string | null } | null = null;
  let clientChecklist: ClientDocumentChecklist | null = null;
  let guardDocuments: GuardDocumentLink[] = [];
  let financeSnapshot: FinanceReviewSnapshot | null = null;
  let dealDocuments: DealDocumentWithUrl[] = [];

  if (task.dealId) {
    const supabase = await createSupabaseServerClient();
    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .select(
        `
          id,
          deal_number,
          client_id,
          vehicle_id,
          status,
          monthly_payment,
          monthly_lease_rate,
          total_amount,
          principal_amount,
          interest_rate,
          down_payment_amount,
          term_months,
          contract_start_date,
          contract_end_date,
          first_payment_date,
          payload,
          deal_documents:deal_documents (
            id,
            document_type,
            storage_path,
            title,
            status,
            metadata
          )
        `,
      )
      .eq("id", task.dealId)
      .maybeSingle();

    if (dealError) {
      console.error("[workflow] failed to load deal for task page", dealError);
    }

    if (dealRow) {
      const effectiveClientId = (dealRow.client_id as string | null) ?? null;
      dealSummary = {
        id: dealRow.id,
        dealNumber: dealRow.deal_number ?? null,
        clientId: effectiveClientId,
        vehicleId: dealRow.vehicle_id ?? null,
      };

      const dealDocumentsRaw = Array.isArray(dealRow.deal_documents)
        ? (dealRow.deal_documents as Array<{
            id?: string;
            document_type?: string | null;
            storage_path?: string | null;
            title?: string | null;
            status?: string | null;
            metadata?: unknown;
          }>)
        : [];

      dealDocuments = await Promise.all(
        dealDocumentsRaw.map(async (doc) => ({
          id:
            (doc.id as string | undefined) ??
            (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `deal-doc-${Math.random().toString(36).slice(2, 10)}`),
          document_type: (doc.document_type as string | null | undefined) ?? null,
          storage_path: (doc.storage_path as string | null | undefined) ?? null,
          title: (doc.title as string | null | undefined) ?? null,
          status: (doc.status as string | null | undefined) ?? null,
          metadata: doc.metadata ?? null,
          signedUrl: doc.storage_path
            ? await createSignedStorageUrl({ bucket: DEAL_STORAGE_BUCKET, path: doc.storage_path as string })
            : null,
        })),
      );

      let clientDocuments: ClientDocumentWithUrl[] = [];
      if (effectiveClientId) {
        const { data: clientDocsData, error: clientDocsError } = await supabase
          .from("client_documents")
          .select("id, document_type, title, status, storage_path, metadata")
          .eq("client_id", effectiveClientId);

        if (clientDocsError) {
          console.error("[workflow] failed to load client documents for task page", clientDocsError);
        } else if (Array.isArray(clientDocsData)) {
          const documents = clientDocsData as ClientDocumentSummary[];
          clientDocuments = await Promise.all(
            documents.map(async (doc) => ({
              ...doc,
              signedUrl: doc.storage_path
                ? await createSignedStorageUrl({ bucket: CLIENT_STORAGE_BUCKET, path: doc.storage_path })
                : null,
            })),
          );
        }
      }

      if (guardKey) {
        const guardBranch =
          dealRow.payload &&
          typeof dealRow.payload === "object" &&
          !Array.isArray(dealRow.payload) &&
          dealRow.payload.guard_tasks &&
          typeof dealRow.payload.guard_tasks === "object" &&
          !Array.isArray(dealRow.payload.guard_tasks)
            ? (dealRow.payload.guard_tasks as Record<string, unknown>)
            : null;
        const guardEntry =
          guardBranch && typeof guardBranch[guardKey] === "object" && guardBranch[guardKey] !== null
            ? (guardBranch[guardKey] as Record<string, unknown>)
            : null;

        let attachmentPath =
          guardEntry && typeof guardEntry.attachment_path === "string"
            ? (guardEntry.attachment_path as string)
            : null;
        let resolvedDocumentType =
          guardEntry && typeof guardEntry.document_type === "string"
            ? (guardEntry.document_type as string)
            : null;

        if (dealDocuments.length > 0) {
          const matchingDoc = dealDocuments.find((document) => {
            const metadata =
              document.metadata && typeof document.metadata === "object" && !Array.isArray(document.metadata)
                ? (document.metadata as Record<string, unknown>)
                : null;
            const metadataGuardKey =
              metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
            const metadataGuardDealId =
              metadata && typeof metadata.guard_deal_id === "string" ? (metadata.guard_deal_id as string) : null;
            const metadataGuardType =
              metadata && typeof metadata.guard_document_type === "string"
                ? (metadata.guard_document_type as string)
                : null;

            if (metadataGuardKey && metadataGuardKey !== guardKey) return false;
            if (metadataGuardDealId && metadataGuardDealId !== task.dealId) return false;

            return (
              Boolean(document.storage_path) &&
              (metadataGuardKey === guardKey ||
                document.document_type === guardKey ||
                metadataGuardType === guardKey)
            );
          });

          attachmentPath = attachmentPath ?? matchingDoc?.storage_path ?? null;

          if (!resolvedDocumentType && matchingDoc) {
            const metadata =
              matchingDoc.metadata && typeof matchingDoc.metadata === "object" && !Array.isArray(matchingDoc.metadata)
                ? (matchingDoc.metadata as Record<string, unknown>)
                : null;
            const metadataDocType =
              metadata && typeof metadata.guard_document_type === "string"
                ? (metadata.guard_document_type as string)
                : null;
            resolvedDocumentType = metadataDocType ?? (matchingDoc.document_type ?? null);
          }
        }

        if (guardKey && dealDocuments.length > 0) {
          const seenPaths = new Set<string>();
          const guardDealId = task.dealId;
          const relevantDocs = dealDocuments.filter((doc) => {
            const metadata =
              doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
                ? (doc.metadata as Record<string, unknown>)
                : null;
            const metadataGuardKey =
              metadata && typeof metadata.guard_key === "string" ? (metadata.guard_key as string) : null;
            const metadataGuardType =
              metadata && typeof metadata.guard_document_type === "string"
                ? (metadata.guard_document_type as string)
                : null;
            const metadataDealId = metadata && typeof metadata.guard_deal_id === "string"
              ? (metadata.guard_deal_id as string)
              : null;

            if (metadataGuardKey && metadataGuardKey !== guardKey) return false;
            if (guardDealId && metadataDealId && metadataDealId !== guardDealId) return false;
            if (
              !metadataGuardKey &&
              resolvedDocumentType &&
              doc.document_type !== resolvedDocumentType &&
              metadataGuardType !== resolvedDocumentType
            ) {
              return false;
            }
            if (!metadataGuardKey && !resolvedDocumentType && doc.document_type !== guardKey) return false;
            return doc.storage_path ? !seenPaths.has(doc.storage_path) : true;
          });

          const guardDocsWithUrls: GuardDocumentLink[] = [];
          for (const doc of relevantDocs) {
            const storagePath = doc.storage_path ?? null;
            const signedUrl = doc.signedUrl ?? null;
            const titleFallback = guardMeta?.label ?? "Документ";
            const link: GuardDocumentLink = {
              id: doc.id,
              title: doc.title ?? titleFallback,
              documentType: doc.document_type ?? null,
              storagePath,
              status: doc.status ?? null,
              url: signedUrl,
            };

            if (storagePath) {
              seenPaths.add(storagePath);
            }
            guardDocsWithUrls.push(link);
          }

          if (guardDocsWithUrls.length > 0) {
            guardDocuments = guardDocsWithUrls;
          }
        }

        let attachmentUrl: string | null = null;
        if (attachmentPath != null) {
          const bucketsToTry = [DEAL_STORAGE_BUCKET, CLIENT_STORAGE_BUCKET];
          for (const bucket of bucketsToTry) {
            attachmentUrl = await createSignedStorageUrl({ bucket, path: attachmentPath });
            if (attachmentUrl) {
              break;
            }
          }
        }

        guardState = {
          note:
            guardEntry && typeof guardEntry.note === "string"
              ? (guardEntry.note as string)
              : null,
          attachmentPath,
          attachmentUrl,
          documentType: resolvedDocumentType ?? null,
        };

        const enforcedChecklist =
          guardKey === VEHICLE_VERIFICATION_GUARD_KEY ? [TECHNICAL_REPORT_TYPE] : [];
        const requiredChecklist = Array.from(
          new Set([...extractChecklistFromTaskPayload(task.payload ?? null), ...enforcedChecklist]),
        );
        if (requiredChecklist.length > 0 && dealDocuments.length > 0) {
          const checklistDocs = dealDocuments.map<ClientDocumentSummary>((doc) => ({
            id: doc.id,
            document_type: doc.document_type,
            status: doc.status,
            title: doc.title,
            storage_path: doc.storage_path,
            metadata:
              doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata)
                ? (doc.metadata as Record<string, unknown>)
                : null,
          }));
          clientChecklist = evaluateClientDocumentChecklist(requiredChecklist, checklistDocs);
        } else if (requiredChecklist.length > 0) {
          clientChecklist = {
            items: requiredChecklist.map((key) => ({
              key,
              normalizedType: null,
              label: key,
              fulfilled: false,
              matches: [],
            })),
            fulfilled: false,
          };
        }
      }

      if (task.type === FINANCE_REVIEW_TASK_TYPE || task.type === INVESTOR_APPROVAL_TASK_TYPE) {
        const workflowStageTitle = stageMeta?.title ?? null;
        const dealDataPoints: SummaryDataPoint[] = [
          { label: "Номер сделки", value: formatStringValue(dealRow.deal_number ?? dealSummary?.id ?? "—") },
          { label: "Этап workflow", value: workflowStageTitle ?? "—" },
          { label: "Статус сделки", value: formatStringValue(dealRow.status ?? null) },
        ];
        const commercialOffer = extractCommercialOfferFromPayload(dealRow.payload ?? null);
        if (commercialOffer) {
          const commercialOfferEntries: SummaryDataPoint[] = [];
          if (commercialOffer.priceVat != null) {
            commercialOfferEntries.push({
              label: "Стоимость с VAT, AED",
              value: formatCurrencyValue(commercialOffer.priceVat),
            });
          }
          if (commercialOffer.downPaymentAmount != null) {
            commercialOfferEntries.push({
              label: "Аванс (КП), AED",
              value: formatCurrencyValue(commercialOffer.downPaymentAmount),
            });
          }
          if (commercialOffer.termMonths != null) {
            commercialOfferEntries.push({
              label: "Срок, месяцев",
              value: formatNumberValue(commercialOffer.termMonths),
            });
          }
          if (commercialOffer.interestRateAnnual != null) {
            commercialOfferEntries.push({
              label: "Ставка финансирования, % годовых",
              value: formatPercentValue(commercialOffer.interestRateAnnual),
            });
          }
          if (commercialOffer.insuranceRateAnnual != null) {
            commercialOfferEntries.push({
              label: "Ставка страхования, % годовых",
              value: formatPercentValue(commercialOffer.insuranceRateAnnual),
            });
          }
          if (commercialOffer.comment) {
            commercialOfferEntries.push({
              label: "Комментарий КП",
              value: formatStringValue(commercialOffer.comment),
            });
          }
          if (commercialOffer.updatedAt) {
            commercialOfferEntries.push({
              label: "КП обновлено",
              value: formatDateValue(commercialOffer.updatedAt),
            });
          }
          dealDataPoints.push(...commercialOfferEntries);

          const price = commercialOffer.priceVat;
          const termMonths = commercialOffer.termMonths;
          const downPayment = commercialOffer.downPaymentAmount ?? 0;
          const annualRate = commercialOffer.interestRateAnnual;
          const insuranceAnnualRate = commercialOffer.insuranceRateAnnual;

          const principal = price != null ? Math.max(0, price - downPayment) : null;
          const monthlyRatePercent = annualRate != null ? annualRate / 12 : null;
          const periodRatePercent =
            annualRate != null && termMonths != null ? (annualRate * termMonths) / 12 : null;
          const totalInterestAmount =
            principal != null && annualRate != null && termMonths != null && termMonths > 0
              ? principal * (annualRate / 100) * (termMonths / 12)
              : null;
          const payoffWithInterest =
            principal != null && totalInterestAmount != null ? principal + totalInterestAmount : null;
          const monthlyLeasePayment =
            payoffWithInterest != null && termMonths != null && termMonths > 0
              ? payoffWithInterest / termMonths
              : null;
          const insuranceTotal =
            price != null && insuranceAnnualRate != null && termMonths != null && termMonths > 0
              ? price * (insuranceAnnualRate / 100) * (termMonths / 12)
              : null;
          const totalForClient =
            payoffWithInterest != null && insuranceTotal != null
              ? payoffWithInterest + insuranceTotal + downPayment
              : null;

          const calculationEntries: SummaryDataPoint[] = [
            { label: "Месячная ставка, %", value: formatPercentValue(monthlyRatePercent) },
            { label: "Ставка за срок, %", value: formatPercentValue(periodRatePercent) },
            { label: "Финансируемая сумма", value: formatCurrencyValue(principal) },
            { label: "Итого к погашению", value: formatCurrencyValue(payoffWithInterest) },
            { label: "Ежемесячный платёж", value: formatCurrencyValue(monthlyLeasePayment) },
            { label: "Доход по процентам", value: formatCurrencyValue(totalInterestAmount) },
            { label: "Страховые платежи", value: formatCurrencyValue(insuranceTotal) },
            { label: "Итого для клиента (страх. + аванс)", value: formatCurrencyValue(totalForClient) },
          ];

          dealDataPoints.push(...calculationEntries);
        }

        const dealDocumentEntries = buildDocumentEntries(
          DEAL_DOCUMENT_TYPES,
          normalizeDealDocumentType,
          getDealDocumentLabel,
          dealDocuments,
        );

        let vehicleSnapshot: FinanceEntitySnapshot | null = null;
        const vehicleId = dealSummary?.vehicleId ?? null;
        if (vehicleId) {
          const { data: vehicleRow, error: vehicleError } = await supabase
            .from("vehicles")
            .select(
              "id, vin, make, model, variant, year, mileage, color_exterior, color_interior, fuel_type, transmission, engine_capacity, license_plate, body_type, status",
            )
            .eq("id", vehicleId)
            .maybeSingle();

          if (vehicleError) {
            console.error("[workflow] failed to load vehicle for finance review", vehicleError);
          }

          let vehicleDocs: VehicleDocumentWithUrl[] = [];
          const { data: vehicleDocsData, error: vehicleDocsError } = await supabase
            .from("vehicle_documents")
            .select("id, document_type, title, status, storage_path, metadata")
            .eq("vehicle_id", vehicleId);

          if (vehicleDocsError) {
            console.error("[workflow] failed to load vehicle documents", vehicleDocsError);
          } else if (Array.isArray(vehicleDocsData)) {
            vehicleDocs = await Promise.all(
              vehicleDocsData.map(async (doc) => ({
                id:
                  (doc.id as string | undefined) ??
                  (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `vehicle-doc-${Math.random().toString(36).slice(2, 10)}`),
                document_type: (doc.document_type as string | null | undefined) ?? null,
                title: (doc.title as string | null | undefined) ?? null,
                status: (doc.status as string | null | undefined) ?? null,
                storage_path: (doc.storage_path as string | null | undefined) ?? null,
                metadata: doc.metadata ?? null,
                signedUrl: doc.storage_path
                  ? await createSignedStorageUrl({ bucket: VEHICLE_STORAGE_BUCKET, path: doc.storage_path as string })
                  : null,
              })),
            );
          }

          if (vehicleRow) {
            const vehicleTitle = [vehicleRow.make, vehicleRow.model, vehicleRow.variant].filter(Boolean).join(" ");
            const engineLabel =
              vehicleRow.engine_capacity != null && Number.isFinite(Number(vehicleRow.engine_capacity))
                ? `${formatNumberValue(vehicleRow.engine_capacity)} л`
                : "—";
            const mileageLabel =
              vehicleRow.mileage != null && Number.isFinite(Number(vehicleRow.mileage))
                ? `${formatNumberValue(vehicleRow.mileage)} км`
                : "—";
            const vehicleStatusLabel =
              vehicleRow.status && OPS_VEHICLE_STATUS_META[vehicleRow.status]
                ? OPS_VEHICLE_STATUS_META[vehicleRow.status].label
                : formatStringValue(vehicleRow.status);

            const vehicleDataPoints: SummaryDataPoint[] = [
              { label: "Авто", value: vehicleTitle.length > 0 ? vehicleTitle : "—" },
              { label: "VIN", value: formatStringValue(vehicleRow.vin) },
              { label: "Год", value: vehicleRow.year ? String(vehicleRow.year) : "—" },
              { label: "Статус авто", value: vehicleStatusLabel },
              { label: "Тип кузова", value: formatStringValue(vehicleRow.body_type) },
              { label: "Топливо", value: formatStringValue(vehicleRow.fuel_type) },
              { label: "Коробка", value: formatStringValue(vehicleRow.transmission) },
              { label: "Двигатель", value: engineLabel },
              { label: "Пробег", value: mileageLabel },
              { label: "Цвет (наружный)", value: formatStringValue(vehicleRow.color_exterior) },
              { label: "Цвет (салон)", value: formatStringValue(vehicleRow.color_interior) },
              { label: "Номерной знак", value: formatStringValue(vehicleRow.license_plate) },
            ];

            const vehicleDocumentEntries = buildDocumentEntries(
              VEHICLE_DOCUMENT_TYPES,
              normalizeVehicleDocumentType,
              getVehicleDocumentLabel,
              vehicleDocs,
            );

            vehicleSnapshot = {
              title: "Авто",
              data: vehicleDataPoints,
              documents: vehicleDocumentEntries,
            };
          }
        }

        let clientSnapshot: FinanceEntitySnapshot | null = null;
        if (effectiveClientId) {
          const { data: profileRow, error: profileError } = await supabase
            .from("profiles")
            .select(
              "full_name, phone, emirates_id, passport_number, nationality, residency_status, date_of_birth, address, employment_info, financial_profile",
            )
            .eq("user_id", effectiveClientId)
            .maybeSingle();

          if (profileError) {
            console.error("[workflow] failed to load client profile", profileError);
          } else if (profileRow) {
            const employmentInfo =
              profileRow.employment_info && typeof profileRow.employment_info === "object" && !Array.isArray(profileRow.employment_info)
                ? (profileRow.employment_info as Record<string, unknown>)
                : null;
            const financialProfile =
              profileRow.financial_profile && typeof profileRow.financial_profile === "object" && !Array.isArray(profileRow.financial_profile)
                ? (profileRow.financial_profile as Record<string, unknown>)
                : null;
            const addressBranch =
              profileRow.address && typeof profileRow.address === "object" && !Array.isArray(profileRow.address)
                ? (profileRow.address as Record<string, unknown>)
                : null;

            const monthlyIncome = pickNumber(financialProfile, "monthly_income");
            const employer = pickString(employmentInfo, "company") ?? pickString(employmentInfo, "employer");
            const position = pickString(employmentInfo, "position") ?? pickString(employmentInfo, "role");
            const employmentType = pickString(employmentInfo, "employment_type");
            const city = pickString(addressBranch, "city") ?? pickString(addressBranch, "city_name");

            const clientDataPoints: SummaryDataPoint[] = [
              { label: "ФИО", value: formatStringValue(profileRow.full_name) },
              { label: "Телефон", value: formatStringValue(profileRow.phone) },
              { label: "Emirates ID", value: formatStringValue(profileRow.emirates_id) },
              { label: "Паспорт", value: formatStringValue(profileRow.passport_number) },
              { label: "Гражданство", value: formatStringValue(profileRow.nationality) },
              { label: "Резиденство", value: formatStringValue(profileRow.residency_status) },
              { label: "Дата рождения", value: formatDateValue(profileRow.date_of_birth) },
              { label: "Город", value: formatStringValue(city) },
              { label: "Работодатель", value: formatStringValue(employer) },
              { label: "Должность", value: formatStringValue(position) },
              { label: "Тип занятости", value: formatStringValue(employmentType) },
              { label: "Месячный доход", value: monthlyIncome != null ? formatCurrencyValue(monthlyIncome) : "—" },
            ];

            const clientDocumentEntries = buildDocumentEntries(
              CLIENT_DOCUMENT_TYPES,
              normalizeClientDocumentType,
              getClientDocumentLabel,
              clientDocuments,
            );

            clientSnapshot = {
              title: "Клиент",
              data: clientDataPoints,
              documents: clientDocumentEntries,
            };
          }
        }

        financeSnapshot = {
          deal: {
            title: "Сделка",
            data: dealDataPoints,
            documents: dealDocumentEntries,
          },
        };
      }
    }
  }

  return (
    <TaskDetailView
      task={task}
      guardMeta={
        guardMeta
          ? {
              key: guardMeta.key,
              label: guardMeta.label,
              requiresDocument: Boolean(guardMeta.requiresDocument),
            }
          : null
      }
      guardState={guardState}
      checklist={clientChecklist}
      deal={dealSummary}
      stageTitle={stageMeta?.title ?? null}
      guardDocuments={guardDocuments}
      financeSnapshot={financeSnapshot}
      completeAction={completeTaskFormAction}
    />
  );
}
