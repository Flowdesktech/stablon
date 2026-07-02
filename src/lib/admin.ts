import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { getUserDoc, type UserDoc } from "@/lib/users";

// Server Component guard for the admin area. Redirects unauthenticated users to
// login and non-admins back to the dashboard, so admin pages can assume a valid
// super-admin profile once this resolves.
export async function requireSuperAdminPage(): Promise<UserDoc> {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const user = await getUserDoc(session.uid);
  if (!user?.superAdmin) redirect("/dashboard");

  return user;
}
