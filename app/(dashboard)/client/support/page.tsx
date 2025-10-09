import { redirect } from "next/navigation";
import { Headset } from "lucide-react";

import { SupportTicketList } from "@/app/(dashboard)/client/_components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { getClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

import { SupportForm } from "./support-form";

export default async function ClientSupportPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?next=/client/support");
  }

  const snapshot = await getClientPortalSnapshot(sessionUser.user.id);

  return (
    <div className="space-y-8">
      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Headset className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Support
            </p>
            <CardTitle className="text-2xl font-semibold text-foreground">
              We&apos;re ready to help 24/7
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <SupportForm />
          <p className="text-xs text-muted-foreground">
            Attachments и чат будут доступны после создания тикета. Среднее время ответа — 24 минуты.
          </p>
        </CardContent>
      </Card>

      <SupportTicketList tickets={snapshot.supportTickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        topic: ticket.topic,
        priority: ticket.priority,
        status: ticket.status,
        lastMessageAt: ticket.lastMessageAt,
        lastMessagePreview: ticket.lastMessagePreview,
      }))} />
    </div>
  );
}
