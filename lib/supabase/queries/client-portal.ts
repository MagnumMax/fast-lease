import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSignedStorageUrl } from "@/lib/supabase/storage";

type Nullable<T> = T | null;

export type ClientPortalSnapshot = {
  deal: Nullable<{
    id: string;
    dealNumber: Nullable<string>;
    status: string;
    monthlyPayment: Nullable<number>;
    totalAmount: Nullable<number>;
    principalAmount: Nullable<number>;
    termMonths: Nullable<number>;
    interestRate: Nullable<number>;
    contractStartDate: Nullable<string>;
    contractEndDate: Nullable<string>;
    firstPaymentDate: Nullable<string>;
    assignedAccountManager: Nullable<string>;
    createdAt: string;
    updatedAt: string;
  }>;
  dealEvents: Array<{
    id: string;
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  application: Nullable<{
    id: string;
    applicationNumber: Nullable<string>;
    status: string;
    submittedAt: Nullable<string>;
    approvedAt: Nullable<string>;
    createdAt: string;
    updatedAt: string;
    assignedTo: Nullable<string>;
  }>;
  vehicle: Nullable<{
    id: string;
    vin: Nullable<string>;
    make: string;
    model: string;
    variant: Nullable<string>;
    year: Nullable<number>;
    bodyType: Nullable<string>;
    fuelType: Nullable<string>;
    transmission: Nullable<string>;
    mileage: Nullable<number>;
    status: string;
    monthlyLeaseRate: Nullable<number>;
    residualValue: Nullable<number>;
    location: Record<string, unknown>;
    features: Record<string, unknown>;
  }>;
  vehicleImages: Array<{
    id: string;
    storagePath: string;
    label: Nullable<string>;
    isPrimary: boolean;
  }>;
  vehicleSpecifications: Array<{
    id: string;
    category: Nullable<string>;
    specKey: string;
    specValue: Nullable<string>;
    unit: Nullable<string>;
    sortOrder: number;
  }>;
  vehicleServices: Array<{
    id: string;
    serviceType: Nullable<string>;
    title: string;
    description: Nullable<string>;
    dueDate: Nullable<string>;
    mileageTarget: Nullable<number>;
    status: string;
    completedAt: Nullable<string>;
    attachments: Array<Record<string, unknown>>;
    createdAt: string;
    updatedAt: string;
  }>;
  vehicleTelematics: Nullable<{
    id: string;
    odometer: Nullable<number>;
    batteryHealth: Nullable<number>;
    fuelLevel: Nullable<number>;
    tirePressure: Record<string, unknown>;
    location: Record<string, unknown>;
    lastReportedAt: string;
  }>;
  applicationDocuments: Array<{
    id: string;
    documentType: string;
    documentCategory: Nullable<string>;
    originalFilename: Nullable<string>;
    storagePath: Nullable<string>;
    status: Nullable<string>;
    uploadedAt: string;
    verifiedAt: Nullable<string>;
    signedUrl: Nullable<string>;
  }>;
  dealDocuments: Array<{
    id: string;
    title: string;
    documentType: Nullable<string>;
    status: Nullable<string>;
    storagePath: Nullable<string>;
    signedAt: Nullable<string>;
    createdAt: string;
    signedUrl: Nullable<string>;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: Nullable<string>;
    invoiceType: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    dueDate: string;
    issueDate: string;
    status: string;
    paidAt: Nullable<string>;
    createdAt: string;
    updatedAt: string;
    pdfUrl: Nullable<string>;
  }>;
  payments: Array<{
    id: string;
    invoiceId: Nullable<string>;
    amount: number;
    status: string;
    method: Nullable<string>;
    receivedAt: Nullable<string>;
    createdAt: string;
  }>;
  paymentSchedules: Array<{
    id: string;
    sequence: number;
    dueDate: string;
    amount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: Nullable<string>;
    icon: Nullable<string>;
    severity: Nullable<string>;
    createdAt: string;
    readAt: Nullable<string>;
  }>;
  supportTickets: Array<{
    id: string;
    ticketNumber: Nullable<string>;
    topic: string;
    priority: string;
    status: string;
    lastMessageAt: string;
    lastMessagePreview: Nullable<string>;
    createdAt: string;
    updatedAt: string;
  }>;
  referral: Nullable<{
    id: string;
    code: string;
    shareUrl: Nullable<string>;
    createdAt: string;
    expiresAt: Nullable<string>;
    events: Array<{
      id: string;
      eventType: string;
      occurredAt: string;
      metadata: Record<string, unknown>;
    }>;
    deals: Array<{
      id: string;
      friendName: Nullable<string>;
      status: Nullable<string>;
      monthlyPayment: Nullable<number>;
      createdAt: string;
    }>;
    rewards: Array<{
      id: string;
      rewardAmount: Nullable<number>;
      status: string;
      createdAt: string;
      paidAt: Nullable<string>;
    }>;
  }>;
};

const DOCUMENTS_BUCKET = "application-documents";

function asNumber(value: unknown): Nullable<number> {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function ensureRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function getClientPortalSnapshot(
  clientId: string,
): Promise<ClientPortalSnapshot> {
  const supabase = await createSupabaseServerClient();

  const { data: dealRow, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dealError) {
    console.error("[client-portal] failed to load deal", dealError);
  }

  const deal = dealRow
    ? {
        id: dealRow.id as string,
        dealNumber: (dealRow.deal_number as string) ?? null,
        status: (dealRow.status as string) ?? "draft",
        monthlyPayment: asNumber(dealRow.monthly_payment),
        monthlyLeaseRate: asNumber(dealRow.monthly_lease_rate ?? dealRow.monthly_payment),
        totalAmount: asNumber(dealRow.total_amount),
        principalAmount: asNumber(dealRow.principal_amount),
        termMonths: asNumber(dealRow.term_months),
        interestRate: asNumber(dealRow.interest_rate),
        contractStartDate: (dealRow.contract_start_date as string) ?? null,
        contractEndDate: (dealRow.contract_end_date as string) ?? null,
        firstPaymentDate: (dealRow.first_payment_date as string) ?? null,
        assignedAccountManager: (dealRow.assigned_account_manager as string) ?? null,
        createdAt: (dealRow.created_at as string) ?? new Date().toISOString(),
        updatedAt: (dealRow.updated_at as string) ?? new Date().toISOString(),
      }
    : null;

  const dealId = (dealRow?.id as string) ?? null;
  const vehicleId = (dealRow?.vehicle_id as string) ?? null;
  const applicationId = (dealRow?.application_id as string) ?? null;

  const {
    data: referralCodeData,
    error: referralCodeError,
  } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (referralCodeError) {
    console.error("[client-portal] failed to load referral code", referralCodeError);
  }

  const referralId = referralCodeData ? (referralCodeData.id as string) : null;

  const [
    applicationRow,
    vehicleRow,
    vehicleImagesRows,
    vehicleSpecsRows,
    vehicleServicesRows,
    vehicleTelematicsRow,
    applicationDocumentsRows,
    dealDocumentsRows,
    invoicesRows,
    paymentsRows,
    paymentSchedulesRows,
    notificationsRows,
    supportTicketsRows,
    dealEventsRows,
    referralEventsRows,
    referralDealsRows,
    referralRewardsRows,
  ] = await Promise.all([
    applicationId
      ? supabase
          .from("applications")
          .select("*")
          .eq("id", applicationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    vehicleId
      ? supabase
          .from("vehicles")
          .select("*")
          .eq("id", vehicleId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    vehicleId
      ? supabase
          .from("vehicle_images")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    vehicleId
      ? supabase
          .from("vehicle_specifications")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    dealId
      ? supabase
          .from("vehicle_services")
          .select("*")
          .eq("deal_id", dealId)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    vehicleId
      ? supabase
          .from("vehicle_telematics")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    applicationId
      ? supabase
          .from("application_documents")
          .select("*")
          .eq("application_id", applicationId)
          .order("uploaded_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    dealId
      ? supabase
          .from("deal_documents")
          .select("*")
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    dealId
      ? supabase
          .from("invoices")
          .select("*")
          .eq("deal_id", dealId)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    dealId
      ? supabase
          .from("payments")
          .select("*")
          .eq("deal_id", dealId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    dealId
      ? supabase
          .from("payment_schedules")
          .select("*")
          .eq("deal_id", dealId)
          .order("sequence", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("client_notifications")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("support_tickets")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(5),
    dealId
      ? supabase
          .from("deal_events")
          .select("*")
          .eq("deal_id", dealId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    referralId
      ? supabase
          .from("referral_events")
          .select("*")
          .eq("referral_id", referralId)
          .order("occurred_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    referralId
      ? supabase
          .from("referral_deals")
          .select("*")
          .eq("referral_id", referralId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    referralId
      ? supabase
          .from("referral_rewards")
          .select("*")
          .eq("referral_id", referralId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const referralEvents = referralEventsRows.data ?? [];
  const referralDeals = referralDealsRows.data ?? [];
  const referralRewards = referralRewardsRows.data ?? [];

  const applicationDocumentSignedUrls = await Promise.all(
    (applicationDocumentsRows.data ?? []).map(async (doc) => ({
      id: doc.id as string,
      url: await createSignedStorageUrl({
        bucket: DOCUMENTS_BUCKET,
        path: (doc.storage_path as string) ?? null,
      }),
    })),
  );

  const dealDocumentSignedUrls = await Promise.all(
    (dealDocumentsRows.data ?? []).map(async (doc) => ({
      id: doc.id as string,
      url: await createSignedStorageUrl({
        bucket: DOCUMENTS_BUCKET,
        path: (doc.storage_path as string) ?? null,
      }),
    })),
  );

  const invoiceSignedUrls = await Promise.all(
    (invoicesRows.data ?? []).map(async (invoice) => ({
      id: invoice.id as string,
      url: await createSignedStorageUrl({
        bucket: DOCUMENTS_BUCKET,
        path: (invoice.pdf_storage_path as string) ?? null,
      }),
    })),
  );

  const applicationDocumentUrlMap = new Map(
    applicationDocumentSignedUrls.map(({ id, url }) => [id, url]),
  );
  const dealDocumentUrlMap = new Map(
    dealDocumentSignedUrls.map(({ id, url }) => [id, url]),
  );
  const invoiceUrlMap = new Map(
    invoiceSignedUrls.map(({ id, url }) => [id, url]),
  );

  return {
    deal,
    dealEvents: (dealEventsRows.data ?? []).map((event) => ({
      id: event.id as string,
      eventType: (event.event_type as string) ?? "event",
      payload: ensureRecord(event.payload),
      createdAt: (event.created_at as string) ?? new Date().toISOString(),
    })),
    application: applicationRow?.data
      ? {
          id: applicationRow.data.id as string,
          applicationNumber: (applicationRow.data.application_number as string) ?? null,
          status: (applicationRow.data.status as string) ?? "draft",
          submittedAt: (applicationRow.data.submitted_at as string) ?? null,
          approvedAt: (applicationRow.data.approved_at as string) ?? null,
          createdAt: (applicationRow.data.created_at as string) ?? new Date().toISOString(),
          updatedAt: (applicationRow.data.updated_at as string) ?? new Date().toISOString(),
          assignedTo: (applicationRow.data.assigned_to as string) ?? null,
        }
      : null,
    vehicle: vehicleRow?.data
      ? {
          id: vehicleRow.data.id as string,
          vin: (vehicleRow.data.vin as string) ?? null,
          make: (vehicleRow.data.make as string) ?? "Vehicle",
          model: (vehicleRow.data.model as string) ?? "",
          variant: (vehicleRow.data.variant as string) ?? null,
          year: asNumber(vehicleRow.data.year),
          bodyType: (vehicleRow.data.body_type as string) ?? null,
          fuelType: (vehicleRow.data.fuel_type as string) ?? null,
          transmission: (vehicleRow.data.transmission as string) ?? null,
          mileage: asNumber(vehicleRow.data.mileage),
          status: (vehicleRow.data.status as string) ?? "draft",
          monthlyLeaseRate: deal?.monthlyLeaseRate ?? null,
          residualValue: asNumber(vehicleRow.data.residual_value),
          location: {},
          features: ensureRecord(vehicleRow.data.features),
        }
      : null,
    vehicleImages: (vehicleImagesRows.data ?? []).map((image) => ({
      id: image.id as string,
      storagePath: (image.storage_path as string) ?? "",
      label: (image.label as string) ?? null,
      isPrimary: Boolean(image.is_primary),
    })),
    vehicleSpecifications: (vehicleSpecsRows.data ?? []).map((spec) => ({
      id: spec.id as string,
      category: (spec.category as string) ?? null,
      specKey: (spec.spec_key as string) ?? "",
      specValue: (spec.spec_value as string) ?? null,
      unit: (spec.unit as string) ?? null,
      sortOrder: Number(spec.sort_order ?? 0),
    })),
    vehicleServices: (vehicleServicesRows.data ?? []).map((service) => ({
      id: service.id as string,
      serviceType: (service.service_type as string) ?? null,
      title: (service.title as string) ?? "",
      description: (service.description as string) ?? null,
      dueDate: (service.due_date as string) ?? null,
      mileageTarget: asNumber(service.mileage_target),
      status: (service.status as string) ?? "scheduled",
      completedAt: (service.completed_at as string) ?? null,
      attachments: Array.isArray(service.attachments)
        ? (service.attachments as Array<Record<string, unknown>>)
        : [],
      createdAt: (service.created_at as string) ?? new Date().toISOString(),
      updatedAt: (service.updated_at as string) ?? new Date().toISOString(),
    })),
    vehicleTelematics: vehicleTelematicsRow?.data
      ? {
          id: vehicleTelematicsRow.data.id as string,
          odometer: asNumber(vehicleTelematicsRow.data.odometer),
          batteryHealth: asNumber(vehicleTelematicsRow.data.battery_health),
          fuelLevel: asNumber(vehicleTelematicsRow.data.fuel_level),
          tirePressure: ensureRecord(vehicleTelematicsRow.data.tire_pressure),
          location: ensureRecord(vehicleTelematicsRow.data.location),
          lastReportedAt:
            (vehicleTelematicsRow.data.last_reported_at as string) ??
            new Date().toISOString(),
        }
      : null,
    applicationDocuments: (applicationDocumentsRows.data ?? []).map((doc) => ({
      id: doc.id as string,
      documentType: (doc.document_type as string) ?? "",
      documentCategory: (doc.document_category as string) ?? null,
      originalFilename: (doc.original_filename as string) ?? null,
      storagePath: (doc.storage_path as string) ?? null,
      status: (doc.status as string) ?? null,
      uploadedAt: (doc.uploaded_at as string) ?? new Date().toISOString(),
      verifiedAt: (doc.verified_at as string) ?? null,
      signedUrl: applicationDocumentUrlMap.get(doc.id as string) ?? null,
    })),
    dealDocuments: (dealDocumentsRows.data ?? []).map((doc) => ({
      id: doc.id as string,
      title: (doc.title as string) ?? "",
      documentType: (doc.document_type as string) ?? null,
      status: (doc.status as string) ?? null,
      storagePath: (doc.storage_path as string) ?? null,
      signedAt: (doc.signed_at as string) ?? null,
      createdAt: (doc.created_at as string) ?? new Date().toISOString(),
      signedUrl: dealDocumentUrlMap.get(doc.id as string) ?? null,
    })),
    invoices: (invoicesRows.data ?? []).map((invoice) => ({
      id: invoice.id as string,
      invoiceNumber: (invoice.invoice_number as string) ?? null,
      invoiceType: (invoice.invoice_type as string) ?? "monthly_payment",
      amount: asNumber(invoice.amount) ?? 0,
      taxAmount: asNumber(invoice.tax_amount) ?? 0,
      totalAmount: asNumber(invoice.total_amount) ?? 0,
      currency: (invoice.currency as string) ?? "AED",
      dueDate: (invoice.due_date as string) ?? new Date().toISOString(),
      issueDate: (invoice.issue_date as string) ?? new Date().toISOString(),
      status: (invoice.status as string) ?? "pending",
      paidAt: (invoice.paid_at as string) ?? null,
      createdAt: (invoice.created_at as string) ?? new Date().toISOString(),
      updatedAt: (invoice.updated_at as string) ?? new Date().toISOString(),
      pdfUrl: invoiceUrlMap.get(invoice.id as string) ?? null,
    })),
    payments: (paymentsRows.data ?? []).map((payment) => ({
      id: payment.id as string,
      invoiceId: (payment.invoice_id as string) ?? null,
      amount: asNumber(payment.amount) ?? 0,
      status: (payment.status as string) ?? "initiated",
      method: (payment.method as string) ?? null,
      receivedAt: (payment.received_at as string) ?? null,
      createdAt: (payment.created_at as string) ?? new Date().toISOString(),
    })),
    paymentSchedules: (paymentSchedulesRows.data ?? []).map((row) => ({
      id: row.id as string,
      sequence: Number(row.sequence ?? 0),
      dueDate: (row.due_date as string) ?? new Date().toISOString(),
      amount: asNumber(row.amount) ?? 0,
      status: (row.status as string) ?? "pending",
      createdAt: (row.created_at as string) ?? new Date().toISOString(),
      updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    })),
    notifications: (notificationsRows.data ?? []).map((notification) => ({
      id: notification.id as string,
      title: (notification.title as string) ?? "",
      message: (notification.message as string) ?? null,
      icon: (notification.icon as string) ?? null,
      severity: (notification.severity as string) ?? null,
      createdAt:
        (notification.created_at as string) ?? new Date().toISOString(),
      readAt: (notification.read_at as string) ?? null,
    })),
    supportTickets: (supportTicketsRows.data ?? []).map((ticket) => ({
      id: ticket.id as string,
      ticketNumber: (ticket.ticket_number as string) ?? null,
      topic: (ticket.topic as string) ?? "",
      priority: (ticket.priority as string) ?? "medium",
      status: (ticket.status as string) ?? "open",
      lastMessageAt:
        (ticket.last_message_at as string) ?? new Date().toISOString(),
      lastMessagePreview: (ticket.last_message_preview as string) ?? null,
      createdAt: (ticket.created_at as string) ?? new Date().toISOString(),
      updatedAt: (ticket.updated_at as string) ?? new Date().toISOString(),
    })),
    referral:
      referralCodeData
        ? {
            id: referralCodeData.id as string,
            code: (referralCodeData.code as string) ?? "",
            shareUrl: (referralCodeData.share_url as string) ?? null,
            createdAt:
              (referralCodeData.created_at as string) ?? new Date().toISOString(),
            expiresAt: (referralCodeData.expires_at as string) ?? null,
            events: referralEvents.map((event) => ({
              id: event.id as string,
              eventType: (event.event_type as string) ?? "click",
              occurredAt:
                (event.occurred_at as string) ?? new Date().toISOString(),
              metadata: ensureRecord(event.metadata),
            })),
            deals: referralDeals.map((item) => ({
              id: item.id as string,
              friendName: (item.friend_name as string) ?? null,
              status: (item.status as string) ?? null,
              monthlyPayment: asNumber(item.monthly_payment),
              createdAt:
                (item.created_at as string) ?? new Date().toISOString(),
            })),
            rewards: referralRewards.map((reward) => ({
              id: reward.id as string,
              rewardAmount: asNumber(reward.reward_amount),
              status: (reward.status as string) ?? "pending",
              createdAt:
                (reward.created_at as string) ?? new Date().toISOString(),
              paidAt: (reward.paid_at as string) ?? null,
            })),
          }
        : null,
  };
}
