import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function OpsTasksPage() {
  return (
    <RouteScaffold
      title="Операции · Задачи"
      description="Kanban доска с drag-n-drop и чеклистами из /beta/ops/tasks/index.html."
      referencePath="/beta/ops/tasks/index.html"
    />
  );
}
