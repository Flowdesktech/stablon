import { AdminTransactionsTable } from "@/components/admin/transactions-table";
import { requireSuperAdminPage } from "@/lib/admin";

export default async function AdminTransactionsPage() {
  await requireSuperAdminPage();
  return <AdminTransactionsTable />;
}
