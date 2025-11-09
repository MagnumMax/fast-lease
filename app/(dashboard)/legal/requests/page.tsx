"use client";

import { useMemo, useState } from "react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LegalRequest = {
  id: string;
  title: string;
  source: string;
  priority: "critical" | "high" | "medium";
  due: string;
  owner?: string;
};

const INITIAL_REQUESTS: LegalRequest[] = [
  { id: "LR-512", title: "Проверить addendum для DEAL-9042", source: "Finance", priority: "high", due: "Сегодня" },
  { id: "LR-507", title: "Обновить clausу buy-out", source: "Product", priority: "medium", due: "Завтра" },
  { id: "LR-498", title: "Регуляторный пакет batch-52", source: "Compliance", priority: "critical", due: "4ч" },
];

const priorityMap: Record<string, { label: string; variant: "danger" | "warning" | "info" }> = {
  critical: { label: "Critical", variant: "danger" },
  high: { label: "High", variant: "warning" },
  medium: { label: "Medium", variant: "info" },
};

export default function LegalRequestsPage() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => (priorityFilter === "all" ? true : request.priority === priorityFilter));
  }, [requests, priorityFilter]);

  function handleAssign(id: string) {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id ? { ...request, owner: "You" } : request,
      ),
    );
  }

  function handleClose(id: string) {
    setRequests((prev) => prev.filter((request) => request.id !== id));
  }

  return (
    <Card className="border border-border bg-card/70">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Requests</p>
            <CardTitle className="text-2xl">Очередь обращений</CardTitle>
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-10 w-[180px]">
              <SelectValue placeholder="Все приоритеты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все приоритеты</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.id}</TableCell>
                <TableCell>{request.title}</TableCell>
                <TableCell>{request.source}</TableCell>
                <TableCell>
                  <Badge variant={priorityMap[request.priority]?.variant ?? "info"}>
                    {priorityMap[request.priority]?.label ?? request.priority}
                  </Badge>
                </TableCell>
                <TableCell>{request.due}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleAssign(request.id)}>
                      Assign me
                    </Button>
                    <Button variant="brand" size="sm" onClick={() => handleClose(request.id)}>
                      Close
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
