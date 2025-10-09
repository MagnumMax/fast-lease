import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "./utils";

export type SupportTicket = {
  id: string;
  ticketNumber: string | null;
  topic: string;
  priority: string;
  status: string;
  lastMessageAt: string;
  lastMessagePreview?: string | null;
};

type SupportTicketListProps = {
  tickets: SupportTicket[];
  onCreateTicket?: () => void;
};

function resolvePriorityTone(priority: string) {
  const normalized = priority.toLowerCase();
  if (normalized === "critical" || normalized === "high") {
    return "bg-rose-100 text-rose-700";
  }
  if (normalized === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

export function SupportTicketList({
  tickets,
  onCreateTicket,
}: SupportTicketListProps) {
  return (
    <Card className="border border-border bg-card shadow-linear">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <CardTitle className="text-lg font-semibold text-foreground">
            Active tickets
          </CardTitle>
        </div>
        {onCreateTicket ? (
          <Button
            type="button"
            size="sm"
            className="rounded-xl text-xs font-semibold"
            onClick={onCreateTicket}
          >
            Create ticket
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No support tickets yet — we&apos;re ready to help whenever you need us.
          </p>
        ) : (
          tickets.map((ticket) => (
            <article
              key={ticket.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {ticket.topic}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ticket.ticketNumber ?? ticket.id} · updated{" "}
                  {formatDate(ticket.lastMessageAt, {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                {ticket.lastMessagePreview ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {ticket.lastMessagePreview}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${resolvePriorityTone(ticket.priority)}`}
                >
                  {ticket.priority}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {ticket.status.replace(/_/g, " ")}
                </span>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
