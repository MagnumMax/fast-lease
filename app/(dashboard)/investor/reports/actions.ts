"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const reportRequestSchema = z
  .object({
    reportType: z.enum(["payment_schedule", "portfolio_yield", "cash_flow"]),
    periodFrom: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Укажите корректную дату начала периода",
    }),
    periodTo: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Укажите корректную дату окончания периода",
    }),
    format: z.enum(["pdf", "xlsx", "csv"]),
    sendCopy: z.boolean().default(false),
  })
  .refine(
    (data) => new Date(data.periodFrom) <= new Date(data.periodTo),
    {
      message: "Дата начала не может быть позже даты окончания.",
      path: ["periodTo"],
    },
  );

export type RequestReportState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const INITIAL_STATE: RequestReportState = { status: "idle" };

async function resolveInvestorPortfolioId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
) {
  const { data: investor, error: investorError } = await supabase
    .from("investors")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (investorError) {
    console.error("[investor] failed to resolve investor for report request", investorError);
    throw new Error("Не удалось определить портфель инвестора.");
  }

  if (!investor) {
    throw new Error("Портфель инвестора не найден.");
  }

  const { data: portfolio, error: portfolioError } = await supabase
    .from("investment_portfolios")
    .select("id")
    .eq("investor_id", investor.id)
    .order("created_at", { ascending: true })
    .maybeSingle();

  if (portfolioError) {
    console.error("[investor] failed to resolve portfolio for report request", portfolioError);
    throw new Error("Не удалось получить данные портфеля.");
  }

  if (!portfolio) {
    throw new Error("Портфель инвестора не найден.");
  }

  return portfolio.id as string;
}

function generateReportCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const serial = Math.floor(Math.random() * 900 + 100);
  return `REP-${year}-${serial}`;
}

export async function requestInvestorReportAction(
  prevState: RequestReportState | undefined,
  formData: FormData,
): Promise<RequestReportState> {
  const session = await getSessionUser();
  if (!session) {
    return { status: "error", message: "Необходимо выполнить вход." };
  }

  const validated = reportRequestSchema.safeParse({
    reportType: formData.get("reportType"),
    periodFrom: formData.get("periodFrom"),
    periodTo: formData.get("periodTo"),
    format: formData.get("format"),
    sendCopy: formData.get("sendCopy") === "on",
  });

  if (!validated.success) {
    const firstError = validated.error.errors[0]?.message ?? "Некорректные параметры запроса.";
    return { status: "error", message: firstError };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const portfolioId = await resolveInvestorPortfolioId(supabase, session.user.id);
    const reportCode = generateReportCode();

    const { error } = await supabase.from("investor_reports").insert({
      portfolio_id: portfolioId,
      report_code: reportCode,
      report_type: validated.data.reportType,
      period_start: validated.data.periodFrom,
      period_end: validated.data.periodTo,
      format: validated.data.format,
      status: "queued",
      send_copy: validated.data.sendCopy,
      requested_by: session.user.id,
      metadata: {
        requested_via: "dashboard",
      },
    });

    if (error) {
      console.error("[investor] failed to insert report request", error);
      return { status: "error", message: "Не удалось отправить запрос. Попробуйте позже." };
    }

    revalidatePath("/investor/reports");
    return { status: "success" };
  } catch (error) {
    console.error("[investor] unexpected report request failure", error);
    return { status: "error", message: error instanceof Error ? error.message : "Ошибка запроса." };
  }
}

export async function getInitialReportState(): Promise<RequestReportState> {
  return Promise.resolve(INITIAL_STATE);
}
