import { redirect } from "next/navigation";
import { requireSuperAdminPage } from "@/lib/admin";

export default async function AdminPage() {
  await requireSuperAdminPage();
  redirect("/admin/users");
}
