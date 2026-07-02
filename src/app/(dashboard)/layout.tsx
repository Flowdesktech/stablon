import { Sidebar } from "@/components/layout/sidebar";
import { FeatureGuard } from "@/components/layout/feature-guard";
import { AppLock } from "@/components/app-lock";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
