"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { AlertCircle, DownloadCloud, Plus, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminProcessRecord,
  AdminProcessStatus,
  AdminProcessVersion,
} from "@/lib/data/admin/bpm";

type AdminBpmOverviewProps = {
  initialProcesses: AdminProcessRecord[];
  initialVersions: AdminProcessVersion[];
};

type NewProcessForm = {
  code: string;
  name: string;
  owner: string;
  tags: string;
};

const STATUS_META: Record<
  AdminProcessStatus,
  { label: string; description: string; badgeVariant: "success" | "warning" | "outline" }
> = {
  active: {
    label: "Active",
    description: "Process is live and orchestrating operations.",
    badgeVariant: "success",
  },
  inactive: {
    label: "Inactive",
    description: "Process is temporarily disabled.",
    badgeVariant: "outline",
  },
  draft: {
    label: "Draft",
    description: "Process is in design, not yet deployed.",
    badgeVariant: "warning",
  },
  archived: {
    label: "Archived",
    description: "Process is stored for reference only.",
    badgeVariant: "outline",
  },
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function generateClientId(prefix: string) {
  try {
    if (
      typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Ignore and fallback below
  }

  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${random}${timestamp}`;
}

export function AdminBpmOverview({
  initialProcesses,
  initialVersions,
}: AdminBpmOverviewProps) {
  const [processes, setProcesses] = useState<AdminProcessRecord[]>(() =>
    [...initialProcesses].sort((a, b) => a.code.localeCompare(b.code)),
  );
  const [versions, setVersions] =
    useState<AdminProcessVersion[]>(initialVersions);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(
    initialProcesses[0]?.id ?? null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<NewProcessForm>({
    code: "",
    name: "",
    owner: "",
    tags: "",
  });

  const selectedProcess = useMemo(
    () => processes.find((process) => process.id === selectedProcessId) ?? null,
    [processes, selectedProcessId],
  );

  const selectedVersions = useMemo(() => {
    if (!selectedProcess) return [];
    return versions
      .filter((version) => version.processId === selectedProcess.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [versions, selectedProcess]);

  function resetForm() {
    setForm({ code: "", name: "", owner: "", tags: "" });
  }

  function handleCreateProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;
    const code = form.code.trim() || `BPM-${(processes.length + 1).toString().padStart(2, "0")}`;

    setIsCreating(true);

    setTimeout(() => {
      const newProcess: AdminProcessRecord = {
        id: generateClientId("process"),
        code,
        name: form.name.trim(),
        status: "draft",
        version: "v1.0",
        description: `Process created for ${form.name.trim()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: form.owner.trim() || "Automation",
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const initialVersion: AdminProcessVersion = {
        id: generateClientId("version"),
        processId: newProcess.id,
        version: "v1.0",
        status: "current",
        changes: ["Initial version"],
        note: "Initial draft created via admin console.",
        effectiveDate: newProcess.updatedAt,
        createdAt: newProcess.updatedAt,
      };

      setProcesses((prev) => [newProcess, ...prev]);
      setVersions((prev) => [initialVersion, ...prev]);
      setSelectedProcessId(newProcess.id);
      setIsCreating(false);
      setIsCreateDialogOpen(false);
      resetForm();
    }, 600);
  }

  function handlePromoteProcess(processId: string, version: string) {
    setProcesses((prev) =>
      prev.map((process) => {
        if (process.id !== processId) return process;
        return {
          ...process,
          status: "active",
          version,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/80 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              BPMN Processes
            </p>
            <CardTitle className="text-2xl">
              Orchestration management
            </CardTitle>
            <CardDescription>
              Mirror of /beta/admin/bpm — manage lease orchestration and compliance flows.
            </CardDescription>
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-amber-400 bg-amber-50/60 px-3 py-2 text-xs text-amber-600 dark:border-amber-300 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              Конструктор работает в демо-режиме и не синхронизирует диаграммы с Supabase.
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                New process
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-3xl p-0">
              <form className="flex max-h-[90vh] flex-col" onSubmit={handleCreateProcess}>
                <DialogHeader className="space-y-2 px-6 pt-6">
                  <DialogTitle>Create orchestration</DialogTitle>
                  <DialogDescription>
                    Define a BPMN entry before publishing it to operations.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="process-code">Process ID</Label>
                    <Input
                      id="process-code"
                      value={form.code}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, code: event.target.value }))
                      }
                      placeholder="BPM-04"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="process-name">Name</Label>
                    <Input
                      id="process-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Vehicle Handover"
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="process-owner">Owner</Label>
                    <Input
                      id="process-owner"
                      value={form.owner}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, owner: event.target.value }))
                      }
                      placeholder="Operations"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="process-tags">Tags</Label>
                    <Input
                      id="process-tags"
                      value={form.tags}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, tags: event.target.value }))
                      }
                      placeholder="handover, compliance"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setIsCreating(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl" disabled={isCreating}>
                    {isCreating ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                          <path d="M22 12a10 10 0 0 1-10 10" />
                        </svg>
                        Creating…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Workflow className="h-4 w-4" />
                        Save process
                      </span>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map((process) => {
                const statusMeta = STATUS_META[process.status];
                const isSelected = process.id === selectedProcessId;
                return (
                  <TableRow
                    key={process.id}
                    className="cursor-pointer transition hover:bg-muted/40"
                    data-selected={isSelected}
                    onClick={() => setSelectedProcessId(process.id)}
                  >
                    <TableCell className="font-medium">{process.code}</TableCell>
                    <TableCell>
                      <p className="font-medium">{process.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Owner: {process.owner}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {process.tags.map((tag: string) => (
                          <Badge key={`${process.id}-${tag}`} variant="secondary">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusMeta.badgeVariant}
                        className="rounded-xl px-3 py-1"
                      >
                        {statusMeta.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{statusMeta.description}</p>
                    </TableCell>
                    <TableCell>{process.version}</TableCell>
                    <TableCell>{formatDate(process.updatedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="border border-border/80 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Diagram editor</CardTitle>
              <CardDescription>
                Placeholder canvas that mirrors BPMN builder from /beta prototype.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                if (selectedProcess) {
                  handlePromoteProcess(selectedProcess.id, selectedProcess.version);
                }
              }}
              disabled={!selectedProcess || selectedProcess.status === "active"}
            >
              <Workflow className="mr-2 h-4 w-4" />
              Promote to active
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
              {selectedProcess ? (
                <div className="space-y-2 text-center">
                  <p className="font-semibold text-foreground">{selectedProcess.name}</p>
                  <p>
                    Version {selectedProcess.version} • Owner {selectedProcess.owner}
                  </p>
                  <Badge variant="outline">BPMN canvas placeholder</Badge>
                </div>
              ) : (
                <p>Select a process to preview the diagram canvas.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/80 backdrop-blur">
          <CardHeader className="flex flex-col gap-2">
            <CardTitle>Version history</CardTitle>
            <CardDescription>
              Chronological releases for the selected orchestration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No historical versions yet. Publish initial draft to begin versioning.
              </p>
            ) : (
              selectedVersions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-2xl border border-border bg-background/60 px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{version.version}</p>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {formatDate(version.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{version.note}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 text-xs font-semibold text-brand-500 hover:text-brand-400"
                    onClick={() => handlePromoteProcess(version.processId, version.version)}
                  >
                    <DownloadCloud className="mr-1 h-3 w-3" />
                    Generate BPMN package
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
