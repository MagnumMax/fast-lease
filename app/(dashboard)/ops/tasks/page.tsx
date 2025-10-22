import { OpsTasksBoard } from "@/app/(dashboard)/ops/_components/tasks-board";
import { OPS_TASKS } from "@/lib/supabase/queries/operations";

export default function OpsTasksPage() {
  return <OpsTasksBoard initialTasks={OPS_TASKS} />;
}
