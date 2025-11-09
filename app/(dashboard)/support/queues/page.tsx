"use client";

import { useMemo, useState } from "react";

import { formatRelativeDays } from "@/app/(dashboard)/client/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Ticket = {
  id: string;
  subject: string;
  client: string;
  age: string;
  priority: "high" | "normal" | "low";
  assignee?: string;
};

type Queue = {
  channel: string;
  sla: string;
  limit: number;
  tickets: Ticket[];
};

const INITIAL_QUEUES: Queue[] = [
  {
    channel: "WhatsApp",
    sla: "30 мин",
    limit: 25,
    tickets: [
      { id: "SUP-1802", subject: "Vehicle ready?", client: "Rashid", age: "2024-07-04T08:30:00Z", priority: "high" },
      { id: "SUP-1805", subject: "Upload documents", client: "Salma", age: "2024-07-04T08:45:00Z", priority: "normal" },
    ],
  },
  {
    channel: "Email",
    sla: "4 ч",
    limit: 60,
    tickets: [
      { id: "SUP-1791", subject: "Invoice copy", client: "Hitech Logistics", age: "2024-07-03T22:10:00Z", priority: "normal" },
      { id: "SUP-1789", subject: "Cancel request", client: "MK Rentals", age: "2024-07-03T19:00:00Z", priority: "high" },
      { id: "SUP-1784", subject: "Escrow question", client: "Sara P.", age: "2024-07-03T16:45:00Z", priority: "low" },
    ],
  },
  {
    channel: "Calls",
    sla: "Live",
    limit: 10,
    tickets: [
      { id: "SUP-1810", subject: "Delivery ETA", client: "Omar", age: "2024-07-04T08:55:00Z", priority: "normal" },
    ],
  },
];

const priorityLabel: Record<string, { label: string; variant: "danger" | "warning" | "secondary" }> = {
  high: { label: "High", variant: "danger" },
  normal: { label: "Normal", variant: "warning" },
  low: { label: "Low", variant: "secondary" },
};

export default function SupportQueuesPage() {
  const [queues, setQueues] = useState(INITIAL_QUEUES);
  const [channelFilter, setChannelFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredQueues = useMemo(() => {
    return queues
      .filter((queue) => (channelFilter === "all" ? true : queue.channel === channelFilter))
      .map((queue) => ({
        ...queue,
        tickets: queue.tickets.filter((ticket) =>
          priorityFilter === "all" ? true : ticket.priority === priorityFilter,
        ),
      }));
  }, [queues, channelFilter, priorityFilter]);

  const channelOptions = INITIAL_QUEUES.map((queue) => queue.channel);

  function handleAssign(channel: string, ticketId: string) {
    setQueues((prev) =>
      prev.map((queue) =>
        queue.channel === channel
          ? {
              ...queue,
              tickets: queue.tickets.map((ticket) =>
                ticket.id === ticketId ? { ...ticket, assignee: "You" } : ticket,
              ),
            }
          : queue,
      ),
    );
  }

  function handleResolve(channel: string, ticketId: string) {
    setQueues((prev) =>
      prev.map((queue) =>
        queue.channel === channel
          ? {
              ...queue,
              tickets: queue.tickets.filter((ticket) => ticket.id !== ticketId),
            }
          : queue,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="h-10 min-w-[160px]">
            <SelectValue placeholder="Все каналы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все каналы</SelectItem>
            {channelOptions.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {channel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-10 min-w-[160px]">
            <SelectValue placeholder="Все приоритеты" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все приоритеты</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {filteredQueues.map((queue) => (
          <Card key={queue.channel} className="border border-border bg-card/70">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{queue.channel}</p>
                  <CardTitle className="text-2xl">{queue.tickets.length}</CardTitle>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>SLA {queue.sla}</p>
                  <p>Limit {queue.limit}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {queue.tickets.map((ticket) => {
                const priority = priorityLabel[ticket.priority];
                return (
                  <div key={ticket.id} className="rounded-2xl border border-dashed border-border p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{ticket.id}</p>
                      <Badge variant={priority?.variant ?? "secondary"}>{priority?.label ?? ticket.priority}</Badge>
                    </div>
                    <p className="text-base text-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.client} · {formatRelativeDays(ticket.age)}
                      {ticket.assignee ? ` · ${ticket.assignee}` : ""}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleAssign(queue.channel, ticket.id)}>
                        Assign me
                      </Button>
                      <Button variant="brand" size="sm" onClick={() => handleResolve(queue.channel, ticket.id)}>
                        Resolve
                      </Button>
                    </div>
                  </div>
                );
              })}
              {queue.tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Очередь пуста</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
