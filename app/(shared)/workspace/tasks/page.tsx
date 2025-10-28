import { OpsTasksBoard } from "@/app/(dashboard)/ops/_components/tasks-board";
import { getSessionUser } from "@/lib/auth/session";
import { getWorkspaceTasks } from "@/lib/supabase/queries/tasks";

export default async function WorkspaceTasksPage() {
  const sessionUser = await getSessionUser();
  const tasks = sessionUser
    ? await getWorkspaceTasks(
        sessionUser.primaryRole ? { assigned: "role" } : { assigned: "me" },
      )
    : [];

  return (
    <OpsTasksBoard
      initialTasks={tasks}
      currentUserId={sessionUser?.user.id ?? null}
      primaryRole={sessionUser?.primaryRole ?? null}
    />
  );
}
