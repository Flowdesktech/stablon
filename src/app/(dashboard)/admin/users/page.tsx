import { requireSuperAdminPage } from "@/lib/admin";
import { AdminUsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  await requireSuperAdminPage();
  return <AdminUsersTable />;
}
