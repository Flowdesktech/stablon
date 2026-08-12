import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { FeatureGuard } from "@/components/layout/feature-guard";
import { AppLock } from "@/components/app-lock";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { getSessionUser } from "@/lib/firebase/server-auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side session gate. The proxy middleware only checks
  // that a session cookie exists; here we verify it's actually valid. An
  // expired/revoked cookie redirects to /login on the server before any client
  // render, which avoids the client-side redirect race that intermittently
  // surfaced as a "This page could not be found" screen.
  const session = await getSessionUser();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <ImpersonationBanner />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <FeatureGuard>{children}</FeatureGuard>
        </div>
      </main>
      <AppLock />
    </div>
  );
}
