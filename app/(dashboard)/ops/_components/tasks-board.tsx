"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import Sortable, { type SortableEvent } from "sortablejs";
import { Plus, Search, Check, Ban, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OpsTask, OpsTaskStatus } from "@/lib/supabase/queries/operations";

type OpsTasksBoardProps = {
  initialTasks: OpsTask[];
};

type SortableInstance = Sortable | null;

const STATUS_ORDER: OpsTaskStatus[] = ["new", "in-progress", "done", "cancelled"];

const STATUS_META: Record<
  OpsTaskStatus,
  { title: string; badge: ComponentProps<typeof Badge>["variant"] }
> = {
  new: { title: "New", badge: "info" },
  "in-progress": { title: "In Progress", badge: "info" },
  done: { title: "Done", badge: "success" },
  cancelled: { title: "Cancelled", badge: "outline" },
};

type TaskFormState = {
  title: string;
  description: string;
  owner: string;
  due: string;
  priority: OpsTask["priority"];
  status: OpsTaskStatus;
};

const DEFAULT_FORM: TaskFormState = {
  title: "",
  description: "",
  owner: "Maria",
  due: "",
  priority: "normal",
  status: "new",
};

export function OpsTasksBoard({ initialTasks }: OpsTasksBoardProps) {
  const [tasks, setTasks] = useState<OpsTask[]>(() => initialTasks);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpsTaskStatus | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState<TaskFormState>(DEFAULT_FORM);
  const [selectedTask, setSelectedTask] = useState<OpsTask | null>(null);

  const columnRefs = useRef<Record<OpsTaskStatus, HTMLDivElement | null>>({
    new: null,
    "in-progress": null,
    done: null,
    cancelled: null,
  });

  const sortableInstances = useRef<Record<OpsTaskStatus, SortableInstance>>({
    new: null,
    "in-progress": null,
    done: null,
    cancelled: null,
  });

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesQuery =
        !query ||
        `${task.title} ${task.owner} ${task.source} ${task.description ?? ""}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  useEffect(() => {
    // Уничтожаем все существующие instances перед созданием новых
    Object.values(sortableInstances.current).forEach((instance) => {
      if (instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
        } catch (error) {
          console.warn("[tasks-board] Error destroying sortable instance:", error);
        }
      }
    });

    // Очищаем ссылки на instances
    Object.keys(sortableInstances.current).forEach((status) => {
      sortableInstances.current[status as OpsTaskStatus] = null;
    });

    // Создаем новые instances для каждого статуса
    STATUS_ORDER.forEach((status) => {
      const element = columnRefs.current[status];
      if (element && element.querySelector('[data-task-card]')) {
        try {
          sortableInstances.current[status] = Sortable.create(element, {
            group: "ops-tasks",
            animation: 150,
            handle: "[data-task-card]",
            ghostClass: "opacity-60",
            dragClass: "shadow-linear",
            onEnd: (event: SortableEvent) => {
              const taskId = event.item.getAttribute("data-task-id");
              const newStatus = event.to.getAttribute("data-status") as OpsTaskStatus | null;

              if (!taskId || !newStatus || !STATUS_ORDER.includes(newStatus)) {
                return;
              }

              setTasks((prev) =>
                prev.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        status: newStatus,
                      }
                    : task,
                ),
              );
            },
          });
        } catch (error) {
          console.error("[tasks-board] Error creating sortable instance:", error);
          sortableInstances.current[status] = null;
        }
      }
    });

    // Сохраняем текущее значение для cleanup
    const currentInstances = sortableInstances.current;

    return () => {
      Object.values(currentInstances).forEach((instance) => {
        if (instance && typeof instance.destroy === 'function') {
          try {
            instance.destroy();
          } catch (error) {
            console.warn("[tasks-board] Error in cleanup destroying sortable instance:", error);
          }
        }
      });
    };
  }, [columnRefs]);

  function handleCreateTask() {
    if (!formState.title.trim()) return;
    const newTask: OpsTask = {
      id: `${Date.now()}`,
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      owner: formState.owner,
      due: formState.due || "Today · 15:30",
      priority: formState.priority,
      source: "Manual",
      status: formState.status,
      createdBy: "user",
    };
    setTasks((prev) => [newTask, ...prev]);
    setFormState(DEFAULT_FORM);
    setIsCreateOpen(false);
  }

  async function handleTaskAction(task: OpsTask, status: OpsTaskStatus) {
    if (status === "done") {
      try {
        console.log("[tasks-board] Completing task", { taskId: task.id });
        const response = await fetch(`/api/tasks/${task.id}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });
        if (response.ok) {
          console.log("[tasks-board] Task completed successfully", { taskId: task.id });
          setTasks((prev) =>
            prev.map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    status,
                  }
                : item,
            ),
          );
        } else {
          console.error("[tasks-board] Failed to complete task", { taskId: task.id, response });
        }
      } catch (error) {
        console.error("[tasks-board] Error completing task", { taskId: task.id, error });
      }
    } else {
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
              ...item,
              status,
            }
          : item,
      ),
    );
    }
    setSelectedTask(null);
  }

  function handleDeleteTask(task: OpsTask) {
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    setSelectedTask(null);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardDescription>Operations</CardDescription>
            <CardTitle>Task Manager</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks"
                className="h-10 w-56 rounded-xl pl-9 pr-3"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as OpsTaskStatus | "all")
              }
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                  <DialogDescription>Plan an action for the operations queue.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Title</Label>
                    <Input
                      id="task-title"
                      value={formState.title}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Confirm financing docs"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <textarea
                      id="task-description"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, description: event.target.value }))
                      }
                      rows={3}
                      className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      placeholder="Add context or next steps"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="task-owner">Assignee</Label>
                      <select
                        id="task-owner"
                        value={formState.owner}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, owner: event.target.value }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <option>Maria</option>
                        <option>Roman</option>
                        <option>Anna</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-priority">Priority</Label>
                      <select
                        id="task-priority"
                        value={formState.priority}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            priority: event.target.value as OpsTask["priority"],
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-status">Status</Label>
                      <select
                        id="task-status"
                        value={formState.status}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            status: event.target.value as OpsTaskStatus,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <option value="new">New</option>
                        <option value="in-progress">In progress</option>
                        <option value="done">Done</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-due">Deadline</Label>
                      <Input
                        id="task-due"
                        type="datetime-local"
                        value={formState.due}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, due: event.target.value }))
                        }
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask} className="rounded-xl">
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const tasksForColumn = filteredTasks.filter((task) => task.status === status);
          return (
            <div key={status} className="flex flex-col rounded-2xl border border-border bg-card/50 p-4 shadow-outline">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{meta.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tasksForColumn.length} {tasksForColumn.length === 1 ? "task" : "tasks"}
                  </p>
                </div>
                <Badge variant={meta.badge}>{meta.title}</Badge>
              </header>
              <div
                ref={(element) => {
                  columnRefs.current[status] = element;
                }}
                data-status={status}
                className="flex flex-1 flex-col gap-3"
              >
                {tasksForColumn.map((task) => (
                  <article
                    key={task.id}
                    data-task-card
                    data-task-id={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-background/80 p-4 text-sm shadow-sm transition hover:border-foreground/40"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{task.title}</p>
                      <Badge
                        variant={task.priority === "high" ? "danger" : "outline"}
                        className="rounded-lg"
                      >
                        {task.priority === "high" ? "High" : "Normal"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{task.owner}</span>
                      <span>{task.due}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <Dialog open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          {selectedTask ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span>{selectedTask.title}</span>
                  <Badge
                    variant={selectedTask.priority === "high" ? "danger" : "outline"}
                    className="rounded-lg"
                  >
                    {selectedTask.priority === "high" ? "High" : "Normal"} priority
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Owner — {selectedTask.owner} · Source — {selectedTask.source}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {selectedTask.description ? (
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Description</p>
                    <p className="mt-1 text-foreground/90">{selectedTask.description}</p>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Due</p>
                    <p className="mt-1 text-foreground/90">{selectedTask.due}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                    <Badge variant={STATUS_META[selectedTask.status].badge} className="mt-1">
                      {STATUS_META[selectedTask.status].title}
                    </Badge>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6 flex flex-wrap gap-3 sm:flex-nowrap">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={() => selectedTask && handleTaskAction(selectedTask, "done")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Mark Done
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={() => selectedTask && handleTaskAction(selectedTask, "cancelled")}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  onClick={() => selectedTask && handleDeleteTask(selectedTask)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
