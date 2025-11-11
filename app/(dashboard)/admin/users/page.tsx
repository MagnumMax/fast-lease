import { redirect } from "next/navigation";

export default function AdminUsersPage() {
  redirect("/app/settings/users");
}
