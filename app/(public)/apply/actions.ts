"use server";

import { randomUUID } from "node:crypto";

import { pricingPlans } from "@/lib/data/pricing";
import type { ResidencyStatus } from "@/lib/data/application";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type PreferencesPayload = {
  monthlyBudget: number;
  usagePurpose: string;
  mileage: string;
  notes: string;
};

type PersonalPayload = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  city: string;
  email: string;
  phone: string;
};

type EnsureDraftInput = {
  applicationId?: string;
  residencyStatus: ResidencyStatus;
  selectedCarId?: string;
  planId?: string;
  preferences: PreferencesPayload;
  personal?: PersonalPayload;
};

type SubmitApplicationInput = {
  applicationId: string;
  residencyStatus: ResidencyStatus;
  selectedCarId?: string;
  planId?: string;
  preferences: PreferencesPayload;
  personal: PersonalPayload;
};

export async function ensureApplicationDraftAction(
  payload: EnsureDraftInput,
): Promise<{ applicationId: string; applicationNumber: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }
  if (!session) {
    throw new Error("Необходимо войти в систему для отправки заявки.");
  }

  const plan = payload.planId
    ? pricingPlans.find((item) => item.id === payload.planId)
    : undefined;

  const financialInfo = {
    preferences: payload.preferences,
    planId: payload.planId ?? null,
  };

  const personalInfo = payload.personal
    ? {
        firstName: payload.personal.firstName,
        lastName: payload.personal.lastName,
        dateOfBirth: payload.personal.dateOfBirth,
        email: payload.personal.email,
        phone: payload.personal.phone,
        city: payload.personal.city,
      }
    : undefined;

  if (payload.applicationId) {
    const { data, error } = await supabase
      .from("applications")
      .update({
        residency_status: payload.residencyStatus,
        status: "draft",
        personal_info: personalInfo,
        financial_info: financialInfo,
        references_info: {
          selectedCarId: payload.selectedCarId ?? null,
        },
        term_months: plan?.termMonths ?? null,
        down_payment: plan ? Number(plan.downPaymentPercent) : null,
        monthly_payment:
          plan?.priceAED ?? Number(payload.preferences.monthlyBudget),
      })
      .eq("id", payload.applicationId)
      .eq("user_id", session.user.id)
      .select("id, application_number")
      .single();

    if (error || !data) {
      throw error ?? new Error("Не удалось обновить черновик заявки.");
    }

    return {
      applicationId: data.id,
      applicationNumber: data.application_number ?? "",
    };
  }

  const applicationNumber = generateApplicationNumber();

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: session.user.id,
      status: "draft",
      application_number: applicationNumber,
      residency_status: payload.residencyStatus,
      personal_info: personalInfo,
      financial_info: financialInfo,
      references_info: {
        selectedCarId: payload.selectedCarId ?? null,
      },
      term_months: plan?.termMonths ?? null,
      down_payment: plan ? Number(plan.downPaymentPercent) : null,
      monthly_payment:
        plan?.priceAED ?? Number(payload.preferences.monthlyBudget),
    })
    .select("id, application_number")
    .single();

  if (error || !data) {
    throw error ?? new Error("Не удалось создать черновик заявки.");
  }

  return {
    applicationId: data.id,
    applicationNumber: data.application_number ?? applicationNumber,
  };
}

export async function uploadApplicationDocumentAction(formData: FormData) {
  const applicationId = formData.get("applicationId");
  const documentId = formData.get("documentId");
  const file = formData.get("file");

  if (
    typeof applicationId !== "string" ||
    typeof documentId !== "string" ||
    !(file instanceof File)
  ) {
    throw new Error("Некорректные данные для загрузки документа.");
  }

  const service = await createSupabaseServiceClient();

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop() ?? "dat";
  const storagePath = `${applicationId}/${documentId}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await service.storage
    .from("application-documents")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await service
    .from("application_documents")
    .upsert(
      {
        application_id: applicationId,
        document_type: documentId,
        original_filename: file.name,
        stored_filename: storagePath,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        status: "uploaded",
      },
      { onConflict: "application_id,document_type" },
    )
    .select("id, document_type, status, original_filename")
    .single();

  if (error || !data) {
    throw error ?? new Error("Не удалось сохранить документ.");
  }

  return {
    recordId: data.id,
    status: data.status ?? "uploaded",
    fileName: data.original_filename ?? file.name,
  };
}

export async function updateDocumentStatusAction(input: {
  applicationId: string;
  documentId: string;
  providedOffline: boolean;
}) {
  const service = await createSupabaseServiceClient();

  const status = input.providedOffline ? "pending_offline" : "pending";
  const fileName = input.providedOffline
    ? "Предоставлю менеджеру"
    : undefined;

  const { data, error } = await service
    .from("application_documents")
    .upsert(
      {
        application_id: input.applicationId,
        document_type: input.documentId,
        status,
        original_filename: fileName ?? null,
        stored_filename: null,
        storage_path: null,
        mime_type: null,
        file_size: null,
      },
      { onConflict: "application_id,document_type" },
    )
    .select("id, status, original_filename")
    .single();

  if (error || !data) {
    throw error ?? new Error("Не удалось обновить состояние документа.");
  }

  return {
    recordId: data.id,
    status: data.status ?? status,
    fileName: data.original_filename ?? fileName ?? "",
  };
}

export async function submitApplicationAction(
  payload: SubmitApplicationInput,
): Promise<{
  submittedAt: string;
  applicationNumber: string;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }
  if (!session) {
    throw new Error("Необходимо войти в систему для отправки заявки.");
  }

  const plan = payload.planId
    ? pricingPlans.find((item) => item.id === payload.planId)
    : undefined;

  const submittedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("applications")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
      residency_status: payload.residencyStatus,
      personal_info: payload.personal,
      financial_info: {
        preferences: payload.preferences,
        planId: payload.planId ?? null,
      },
      references_info: {
        selectedCarId: payload.selectedCarId ?? null,
      },
      term_months: plan?.termMonths ?? null,
      down_payment: plan ? Number(plan.downPaymentPercent) : null,
      monthly_payment:
        plan?.priceAED ?? Number(payload.preferences.monthlyBudget),
    })
    .eq("id", payload.applicationId)
    .eq("user_id", session.user.id)
    .select("application_number, submitted_at")
    .single();

  if (error || !data) {
    throw error ?? new Error("Не удалось отправить заявку.");
  }

  // Обновляем статусы документов на submitted
  await supabase
    .from("application_documents")
    .update({ status: "submitted" })
    .eq("application_id", payload.applicationId)
    .neq("status", "pending");

  return {
    submittedAt: data.submitted_at ?? submittedAt,
    applicationNumber: data.application_number ?? "",
  };
}

function generateApplicationNumber() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, "0");
  return `FL-${timestamp}-${suffix}`;
}
