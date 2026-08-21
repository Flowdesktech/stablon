import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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
    <DashboardShell>
      <main className="min-w-0">
        <ImpersonationBanner />
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <FeatureGuard>{children}</FeatureGuard>
        </div>
      </main>
      <AppLock />
    </DashboardShell>
  );
}
