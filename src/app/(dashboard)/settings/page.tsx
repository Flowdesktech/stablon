"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { useCustomer, startKYC } from "@/hooks/use-bridge";
import { toast } from "@/components/ui/toast";
import { SecuritySection } from "@/components/settings/security-section";
import { outstandingKycRequirements } from "@/lib/kyc";
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

type KYCStatus = "not_started" | "incomplete" | "pending" | "approved" | "rejected" | "none";

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
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-subtle">
          {done ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <Icon className="h-4 w-4 text-info" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {done ? (
        <span className="shrink-0 text-xs text-success">Done</span>
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
  incomplete: { label: "Action Needed", variant: "warning", icon: AlertCircle },
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
  const needsKyc = ["not_started", "none", "rejected", "incomplete"].includes(kycStatus);

  // What Bridge still needs from the user (e.g. a government ID document) when
  // the customer is created but not yet approved.
  const outstanding = outstandingKycRequirements(customer);

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
      <div className="rounded-md border border-info/25 bg-info-muted p-3">
        <div className="flex items-center gap-2">
          <Badge variant="default">Recommended</Badge>
          <p className="text-sm font-medium text-foreground">
            Bridge Persona verification
          </p>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Use Bridge&apos;s guided, provider-hosted flow for identity documents and
          selfie verification.
        </p>
      </div>
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
      <p className="pt-1 text-xs text-muted-foreground">
        Finished both?{" "}
        <button onClick={() => refreshCustomer()} className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Refresh status
        </button>
      </p>

      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted p-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Manual in-app verification
          </p>
          <p className="text-xs text-muted-foreground">
            Use this fallback only if you cannot complete the hosted Persona flow.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/verify">View options</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Settings" description="Manage your profile, verification, security, and preferences." />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* KYC Verification */}
          <Card className={["not_started", "none", "incomplete"].includes(kycStatus) ? "border-warning/30" : kycStatus === "approved" ? "border-success/30" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-info-muted">
                    <Shield className="h-5 w-5 text-info" />
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
                  <p className="text-sm text-muted-foreground">
                    Complete identity verification to unlock eligible financial features.
                  </p>
                  {verificationTasks}
                </div>
              )}

              {kycStatus === "incomplete" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-md border border-warning/25 bg-warning-muted p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">A few more steps needed</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        We&apos;ve received your details. Bridge still needs the following to finish
                        verifying your identity:
                      </p>
                      {outstanding.length > 0 ? (
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          {outstanding.map((req) => (
                            <li key={req} className="text-xs text-foreground">
                              {req}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Complete the remaining verification steps below.
                        </p>
                      )}
                    </div>
                  </div>
                  {verificationTasks}
                </div>
              )}

              {kycStatus === "pending" && (
                <Alert
                  variant="warning"
                  title="Verification in progress"
                  description="Your submitted information is being reviewed."
                />
              )}

              {kycStatus === "approved" && (
                <Alert
                  variant="success"
                  title="Identity verified"
                  description="Your identity has been approved."
                />
              )}

              {kycStatus === "rejected" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-md border border-danger/25 bg-danger-muted p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Verification failed</p>
                      {rejectionReasons.length > 0 ? (
                        <ul className="mt-1 space-y-1 list-disc list-inside">
                          {rejectionReasons.map((reason) => (
                            <li key={reason} className="text-xs text-foreground">
                              {reason}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-info-muted">
                  <User className="h-5 w-5 text-info" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name">
                  <Input defaultValue={user?.displayName || ""} />
                </Field>
                <Field label="Email">
                  <Input defaultValue={user?.email || ""} disabled />
                </Field>
              </div>
              <Button size="sm">Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-info-muted">
                    <FileText className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Invoicing</CardTitle>
                    <CardDescription>
                      Business profiles, invoice defaults, templates, and payment settlement
                    </CardDescription>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/invoicing-settings">Manage</Link>
                </Button>
              </div>
            </CardHeader>
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
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="truncate text-sm text-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="mb-2 text-sm font-medium text-foreground">Feature access</h3>
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
                    <span className="text-muted-foreground">{item.feature}</span>
                    {item.unlocked ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
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
