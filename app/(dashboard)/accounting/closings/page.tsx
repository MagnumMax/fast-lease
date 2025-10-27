"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusVariant: Record<string, { label: string; variant: "success" | "info" | "warning" | "danger" }> = {
  done: { label: "Done", variant: "success" },
  in_progress: { label: "In progress", variant: "info" },
  pending: { label: "Pending", variant: "warning" },
  blocked: { label: "Blocked", variant: "danger" },
};

const INITIAL_CHECKLIST = [
  { step: "Bank feeds imported", owner: "Accounting", due: "D+1", status: "done" },
  { step: "Vendor accruals posted", owner: "FinOps", due: "D+2", status: "in_progress" },
  { step: "Investor payout reconciliation", owner: "Finance", due: "D+2", status: "blocked" },
  { step: "VAT draft", owner: "Tax", due: "D+3", status: "pending" },
];

export default function AccountingClosingsPage() {
  const [items, setItems] = useState(INITIAL_CHECKLIST);

  function handleAdvance(step: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.step === step
          ? { ...item, status: item.status === "done" ? "done" : "done" }
          : item,
      ),
    );
  }

  return (
    <Card className="border border-border bg-card/70">
      <CardHeader>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Month-end closing</p>
          <CardTitle className="text-2xl">Чек-лист периода</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div
            key={item.step}
            className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-base font-semibold text-foreground">{item.step}</p>
              <p className="text-xs text-muted-foreground">Owner: {item.owner} · Due {item.due}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant[item.status]?.variant ?? "info"}>
                {statusVariant[item.status]?.label ?? item.status}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => handleAdvance(item.step)}>
                Mark done
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
