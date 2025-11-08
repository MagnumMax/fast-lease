"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createTicketSchema = z.object({
  topic: z.string().min(3, "Укажите тему запроса"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  message: z.string().min(10, "Опишите запрос подробнее"),
});

export async function createSupportTicketAction(
  prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const session = await getSessionUser();

  if (!session) {
    return { success: false, error: "Необходимо войти в систему." };
  }

  const validated = createTicketSchema.safeParse({
    topic: formData.get("topic"),
    priority: formData.get("priority") ?? "medium",
    message: formData.get("message"),
  });

  if (!validated.success) {
    const firstError = validated.error.issues[0]?.message ?? "Некорректные данные.";
    return { success: false, error: firstError };
  }

  const supabase = await createSupabaseServerClient();

  const ticketNumber = `SUP-${new Date()
    .getFullYear()
    .toString()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      ticket_number: ticketNumber,
      client_id: session.user.id,
      topic: validated.data.topic,
      priority: validated.data.priority,
      status: "open",
      description: validated.data.message,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[support] create ticket failed", error);
    return { success: false, error: "Не удалось создать тикет. Попробуйте позже." };
  }

  await supabase.from("support_messages").insert({
    ticket_id: ticket?.id,
    author_id: session.user.id,
    body: validated.data.message,
  });

  revalidatePath("/client/support");
  return { success: true };
}
