import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function AdminUsersPage() {
  return (
    <RouteScaffold
      title="Админ · Пользователи"
      description="Управление учетными записями, ролями и аудитом из /beta/admin/users/index.html."
      referencePath="/beta/admin/users/index.html"
    />
  );
}
