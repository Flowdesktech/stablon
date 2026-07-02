import { requireSuperAdminPage } from "@/lib/admin";
import { AdminWalletsTable } from "@/components/admin/wallets-table";

export default async function AdminWalletsPage() {
  await requireSuperAdminPage();
  return <AdminWalletsTable />;
}
