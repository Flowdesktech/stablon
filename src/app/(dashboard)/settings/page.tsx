"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCustomer, startKYC } from "@/hooks/use-bridge";
import { toast } from "@/components/ui/toast";
import { SecuritySection } from "@/components/settings/security-section";
import {
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Mail,
  Lock,
  Bell,
  Globe,
  Loader2,
  FileText,
} from "lucide-react";

type KYCStatus = "not_started" | "pending" | "approved" | "rejected" | "none";

type KycLinks = { kyc_link?: string; tos_link?: string | null; tos_accepted: boolean };

function KycTaskRow({
  icon: Icon,
  title,
  desc,
  done,
  actionLabel,
  href,
  onAction,
  loading,
}: {
  icon: typeof Shield;
  title: string;
  desc: string;
  done?: boolean;
  actionLabel: string;
  href?: string | null;
  onAction?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          {done ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Icon className="w-4 h-4 text-purple-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-white">{title}</p>
          <p className="text-xs text-white/40 truncate">{desc}</p>
        </div>
      </div>
      {done ? (
        <span className="text-xs text-emerald-400 shrink-0">Done</span>
      ) : href ? (
        // Native anchor so the new tab opens on the click itself (no popup block).
        <Button asChild size="sm" variant="outline">
          <a href={href} target="_blank" rel="noopener noreferrer">
            {actionLabel} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onAction} disabled={loading || !onAction}>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              {actionLabel} <ExternalLink className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}

const kycStatusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger"; icon: typeof CheckCircle2 }> = {
  not_started: { label: "Not Started", variant: "default", icon: AlertCircle },
  none: { label: "Not Started", variant: "default", icon: AlertCircle },
  pending: { label: "Under Review", variant: "warning", icon: Clock },
  approved: { label: "Verified", variant: "success", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "danger", icon: AlertCircle },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { customer, isLoading: customerLoading, mutate: refreshCustomer } = useCustomer();
  const [links, setLinks] = useState<KycLinks | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const fetchedRef = useRef(false);

  const kycStatus: KYCStatus = (customer?.kyc_status as KYCStatus) || "not_started";
  const statusConfig = kycStatusConfig[kycStatus] || kycStatusConfig.not_started;

  // Bridge returns rejection_reasons as objects ({ reason, developer_reason }).
  // Show the user-facing `reason`, de-duplicated.
  const rejectionReasons: string[] = Array.isArray(customer?.rejection_reasons)
    ? Array.from(
        new Set(
          (customer.rejection_reasons as Array<string | { reason?: string }>)
            .map((r) => (typeof r === "string" ? r : r?.reason))
            .filter((r): r is string => Boolean(r))
        )
      )
    : [];

  // Derive the task state from the customer so the checklist is the default view.
  const tosLink: string | null = links?.tos_link ?? customer?.tos_link ?? null;
  const tosAccepted: boolean =
    links?.tos_accepted ?? Boolean(customer?.has_accepted_terms_of_service);
  const needsKyc = ["not_started", "none", "rejected"].includes(kycStatus);

  // Fetch the hosted TOS + KYC links from Bridge. Creates the customer if needed.
  async function loadLinks(): Promise<KycLinks | null> {
    setLoadingLinks(true);
    try {
      const result = await startKYC();
      const next: KycLinks = {
        kyc_link: result?.kyc_link,
        tos_link: result?.tos_link,
        tos_accepted: Boolean(result?.tos_accepted),
      };
      setLinks(next);
      return next;
    } catch (err) {
      fetchedRef.current = false; // allow a retry
      toast({
        variant: "error",
        title: "Couldn't load verification",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return null;
    } finally {
      setLoadingLinks(false);
    }
  }

  // Auto-load the verification links once the customer is known and unverified —
  // no "Start Verification" click required.
  useEffect(() => {
    if (!needsKyc || links || fetchedRef.current || customerLoading) return;
    fetchedRef.current = true;
    void loadLinks();
  }, [needsKyc, links, customerLoading]);

  const kycLink: string | null = links?.kyc_link ?? null;

  const verificationTasks = (
    <div className="space-y-2">
      <KycTaskRow
        icon={FileText}
        title="Accept Terms of Service"
        desc="Required before verification can be approved"
        done={tosAccepted}
        actionLabel="Accept"
        href={tosLink}
        onAction={() => loadLinks()}
        loading={loadingLinks}
      />
      <KycTaskRow
        icon={Shield}
        title="Verify your identity"
        desc="Government ID and a quick selfie check"
        actionLabel="Verify"
        href={kycLink}
        onAction={() => loadLinks()}
        loading={loadingLinks}
      />
      <p className="text-xs text-white/40 pt-1">
        Finished both?{" "}
        <button onClick={() => refreshCustomer()} className="text-purple-400 hover:underline">
          Refresh status
        </button>
      </p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/50 mt-1">Manage your profile, verification, and preferences</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* KYC Verification */}
          <Card className={["not_started", "none"].includes(kycStatus) ? "border-amber-500/20" : kycStatus === "approved" ? "border-emerald-500/20" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Identity Verification (KYC)</CardTitle>
                    <CardDescription>Required to access all financial features</CardDescription>
                  </div>
                </div>
                {customerLoading ? (
                  <div className="skeleton h-6 w-24 rounded-full" />
                ) : (
                  <Badge variant={statusConfig.variant as "default" | "success" | "warning" | "danger"}>
                    <statusConfig.icon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {["not_started", "none"].includes(kycStatus) && (
                <div className="space-y-4">
                  <p className="text-sm text-white/50">
                    Complete identity verification to unlock deposits, withdrawals, card access, and more.
                    The process takes about 2 minutes.
                  </p>
                  {verificationTasks}
                </div>
              )}

              {kycStatus === "pending" && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">Verification in Progress</p>
                    <p className="text-xs text-amber-300/60 mt-1">
                      Your documents are being reviewed. This usually takes 1-24 hours.
                    </p>
                  </div>
                </div>
              )}

              {kycStatus === "approved" && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Identity Verified</p>
                    <p className="text-xs text-emerald-300/60 mt-1">
                      Your identity has been verified. You have full access to all features.
                    </p>
                  </div>
                </div>
              )}

              {kycStatus === "rejected" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-300">Verification Failed</p>
                      {rejectionReasons.length > 0 ? (
                        <ul className="mt-1 space-y-1 list-disc list-inside">
                          {rejectionReasons.map((reason) => (
                            <li key={reason} className="text-xs text-red-300/70">
                              {reason}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-red-300/60 mt-1">
                          Please try again with clearer documents or contact support.
                        </p>
                      )}
                    </div>
                  </div>
                  {verificationTasks}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Full Name</label>
                  <Input defaultValue={user?.displayName || ""} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
                  <Input defaultValue={user?.email || ""} disabled />
                </div>
              </div>
              <Button size="sm">Save Changes</Button>
            </CardContent>
          </Card>

          {/* Security */}
          <SecuritySection />
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Mail, label: "Email", value: user?.email || "—" },
                { icon: Globe, label: "Region", value: "Global" },
                { icon: Shield, label: "KYC Level", value: kycStatus === "approved" ? "Full" : "None" },
                { icon: Bell, label: "Notifications", value: "Enabled" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-white/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/40">{item.label}</p>
                    <p className="text-sm text-white truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-white mb-2">Feature Access</h3>
              <div className="space-y-2">
                {[
                  { feature: "Dashboard", unlocked: true },
                  { feature: "Deposits", unlocked: kycStatus === "approved" },
                  { feature: "Withdrawals", unlocked: kycStatus === "approved" },
                  { feature: "Visa Card", unlocked: kycStatus === "approved" },
                  { feature: "Swap", unlocked: kycStatus === "approved" },
                  { feature: "Earn", unlocked: kycStatus === "approved" },
                ].map((item) => (
                  <div key={item.feature} className="flex items-center justify-between text-sm">
                    <span className="text-white/60">{item.feature}</span>
                    {item.unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-white/20" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
