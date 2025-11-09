"use client";

import { useMemo, useState } from "react";

import { formatRelativeDays } from "@/app/(dashboard)/client/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type PipelineItem = {
  id: string;
  applicant: string;
  amount: string;
  age: string;
  flag?: string;
  owner?: string;
};

type PipelineColumn = {
  id: string;
  title: string;
  limit: number;
  items: PipelineItem[];
};

const INITIAL_COLUMNS: PipelineColumn[] = [
  {
    id: "precheck",
    title: "Pre-check",
    limit: 6,
    items: [
      { id: "AP-1901", applicant: "Yasmeen", amount: "AED 120K", age: "2024-07-04T06:00:00Z" },
      { id: "AP-1899", applicant: "Logistics Hub", amount: "AED 240K", age: "2024-07-03T22:00:00Z" },
    ],
  },
  {
    id: "aecb",
    title: "AECB",
    limit: 5,
    items: [
      { id: "AP-1898", applicant: "Mohammed", amount: "AED 95K", age: "2024-07-03T19:10:00Z" },
      { id: "AP-1897", applicant: "Hanifa", amount: "AED 60K", age: "2024-07-03T18:40:00Z" },
      { id: "AP-1894", applicant: "Retail Co.", amount: "AED 310K", age: "2024-07-03T15:00:00Z" },
    ],
  },
  {
    id: "manual",
    title: "Manual review",
    limit: 4,
    items: [
      { id: "AP-1889", applicant: "Oasis Catering", amount: "AED 420K", age: "2024-07-03T13:30:00Z", flag: "High exposure" },
      { id: "AP-1887", applicant: "Aslam", amount: "AED 70K", age: "2024-07-03T10:50:00Z" },
    ],
  },
  {
    id: "approval",
    title: "Approval",
    limit: 6,
    items: [
      { id: "AP-1882", applicant: "Green Mobility", amount: "AED 510K", age: "2024-07-03T08:30:00Z" },
    ],
  },
];

export default function RiskPipelinePage() {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [flagsOnly, setFlagsOnly] = useState(false);

  const visibleColumns = useMemo(() => {
    if (!flagsOnly) return columns;
    return columns.map((column) => ({
      ...column,
      items: column.items.filter((item) => Boolean(item.flag)),
    }));
  }, [columns, flagsOnly]);

  function handleAdvance(columnIndex: number, itemId: string) {
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, items: [...col.items] }));
      const column = next[columnIndex];
      const itemIndex = column.items.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) return prev;
      const [item] = column.items.splice(itemIndex, 1);
      const targetColumn = next[columnIndex + 1];
      if (targetColumn) {
        targetColumn.items = [...targetColumn.items, item];
      } else {
        column.items.splice(itemIndex, 0, item);
      }
      return next;
    });
  }

  function handleAssign(columnIndex: number, itemId: string) {
    setColumns((prev) =>
      prev.map((column, idx) =>
        idx !== columnIndex
          ? column
          : {
              ...column,
              items: column.items.map((item) =>
                item.id === itemId ? { ...item, owner: "You" } : item,
              ),
            },
      ),
    );
  }

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-2 text-sm">
        <Checkbox
          checked={flagsOnly}
          onCheckedChange={(checked) => setFlagsOnly(checked === true)}
        />
        Показывать только flagged
      </label>

      <div className="grid gap-4 lg:grid-cols-4">
        {visibleColumns.map((column, columnIndex) => (
          <Card key={column.id} className="border border-border bg-card/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{column.title}</CardTitle>
                <Badge variant={column.items.length >= column.limit ? "danger" : "secondary"}>
                  {column.items.length}/{column.limit}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-dashed border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.id}</p>
                    <span className="text-xs text-muted-foreground">{formatRelativeDays(item.age)}</span>
                  </div>
                  <p className="text-base text-foreground">{item.applicant}</p>
                  <p className="text-sm text-muted-foreground">{item.amount}{item.owner ? ` · ${item.owner}` : ""}</p>
                  {item.flag ? (
                    <Badge variant="warning" className="mt-2">{item.flag}</Badge>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleAssign(columnIndex, item.id)}>
                      Assign
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      disabled={columnIndex === columns.length - 1}
                      onClick={() => handleAdvance(columnIndex, item.id)}
                    >
                      Advance
                    </Button>
                  </div>
                </div>
              ))}
              {column.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет заявок</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
