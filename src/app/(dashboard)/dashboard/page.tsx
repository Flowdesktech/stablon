"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { useWallets, useTransfers, useActivity, useCustomer, createBridgeCustomer } from "@/hooks/use-bridge";
import { ActivityRow } from "@/components/activity/activity-row";
import { useInvoicingData } from "@/components/invoicing/api";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { aggregateWalletBalances } from "@/lib/bridge";
import type { BridgeWallet, ActivityItem } from "@/types/bridge";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  CreditCard,
  Wallet,
  DollarSign,
  Euro,
  ChevronRight,
  Loader2,
  Files,
} from "lucide-react";

const quickActions = [
  { label: "Deposit", icon: ArrowDownToLine, href: "/deposit" },
  { label: "Withdraw", icon: ArrowUpFromLine, href: "/withdraw" },
  { label: "Swap", icon: ArrowLeftRight, href: "/swap" },
  { label: "Card", icon: CreditCard, href: "/card" },
];

const currencyIcons: Record<string, typeof DollarSign> = {
  usd: DollarSign, eur: Euro, usdc: Wallet, usdt: Wallet, usdb: Wallet,
};

function aggregateBalances(wallets: BridgeWallet[]) {
  return aggregateWalletBalances(wallets);
}


function AccountSetupBanner() {
  const { customer, isLoading, mutate: refreshCustomer } = useCustomer();
  const { mutate: refreshWallets } = useWallets();
  const { mutate: refreshTransfers } = useTransfers();
  const [linking, setLinking] = useState(false);

  if (isLoading || customer?.id) return null;

  async function handleLink() {
    setLinking(true);
    try {
      await createBridgeCustomer();
      await Promise.all([refreshCustomer(), refreshWallets(), refreshTransfers()]);
      toast({
        variant: "success",
        title: "Account set up",
        description: "Your account is linked. Complete verification to unlock all features.",
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't set up your account",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLinking(false);
    }
  }

  return (
    <Alert
      variant="info"
      title="Finish setting up your account"
      description="Link your account to enable deposits, withdrawals, swaps, and card access."
      action={
        <Button onClick={handleLink} disabled={linking} className="shrink-0">
          {linking ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
          ) : (
            "Set up account"
          )}
        </Button>
      }
    />
  );
}

// Prompts a linked-but-unverified customer to complete KYC. Hidden once the
// account is approved (and while a customer hasn't been linked — the setup
// banner handles that case).
function VerifyBanner() {
  const { customer, isLoading } = useCustomer();
  if (isLoading || !customer?.id) return null;

  const status = customer.kyc_status as string | undefined;
  if (status === "approved") return null;

  const pending = status === "pending";
  const incomplete = status === "incomplete";

  const title = pending
    ? "Verification in review"
    : incomplete
      ? "Finish verifying your identity"
      : "Verify your identity";
  const description = pending
    ? "Bridge is reviewing your details. You can review or update your submission if needed."
    : incomplete
      ? "A few more steps are needed to finish verification and unlock all features."
      : "Complete verification to unlock deposits, withdrawals, swaps, and your card.";
  const ctaLabel = pending
    ? "Review submission"
    : incomplete
      ? "Continue verification"
      : "Verify identity";

  return (
    <Alert
      variant="warning"
      title={title}
      description={description}
      action={
        <Button asChild variant={pending ? "outline" : undefined}>
          <Link href="/verify">{ctaLabel}</Link>
        </Button>
      }
    />
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { wallets, isLoading: walletsLoading } = useWallets();
  const { activity, isLoading: activityLoading } = useActivity();
  const { data: invoiceStats } = useInvoicingData<{
    total: number;
    draft: number;
    outstanding: number;
    overdue: number;
    paid: number;
  }>("/api/invoicing/stats");

  if (authLoading || walletsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-32" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32" />)}
        </div>
      </div>
    );
  }

  if (!user) redirect("/login");

  const balances = aggregateBalances(wallets);
  const totalUsd = balances.reduce((sum, b) => {
    if (["usd", "usdc", "usdt", "usdb"].includes(b.currency.toLowerCase())) return sum + b.amount;
    return sum;
  }, 0);

  const recentActivity = (activity as ActivityItem[]).slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`Welcome back, ${user.displayName || "there"}`}
        description="Here’s your account overview."
      />

      <AccountSetupBanner />
      <VerifyBanner />

      {/* Total balance */}
      <Card>
        <CardContent className="p-6">
          <p className="mb-1 text-sm text-muted-foreground">Total balance</p>
          <p className="text-4xl font-semibold tracking-tight text-foreground">
            {formatCurrency(totalUsd)}
          </p>
          {balances.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">No balances yet. Deposit funds to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <Card className="group h-full transition-colors hover:bg-surface-muted">
              <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-info-muted text-primary">
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-info-muted">
              <Files className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">Invoicing</p>
                  <p className="text-sm text-muted-foreground">Create invoices and collect payments.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/invoices">View invoices</Link>
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center sm:max-w-md sm:text-left">
                <div>
                  <p className="text-lg font-semibold text-foreground">{invoiceStats?.total ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-warning">{invoiceStats?.outstanding ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-success">{invoiceStats?.paid ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Paid</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance cards */}
      <div>
        <SectionHeader title="Balances" className="mb-4" />
        {balances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((b) => {
              const Icon = currencyIcons[b.currency.toLowerCase()] || Wallet;
              const symbol = b.currency.toLowerCase() === "eur" ? "€" : "$";
              return (
                <StatCard
                  key={b.currency}
                  label={b.currency.toUpperCase()}
                  icon={<Icon className="h-5 w-5" />}
                  value={`${symbol}${b.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                />
              );
            })}
          </div>
        ) : (
          <DataView>
            <DataState
              title="No balances yet"
              description="Deposit funds to see balances here."
              action={<Button asChild size="sm"><Link href="/deposit">Make a deposit</Link></Button>}
            />
          </DataView>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/transactions">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <DataView>
            {activityLoading ? (
              <DataState kind="loading" title="Loading activity" />
            ) : recentActivity.length > 0 ? (
              <div className="divide-y divide-border">
                {recentActivity.map((tx) => (
                  <ActivityRow key={`${tx.kind}-${tx.id}`} item={tx} />
                ))}
              </div>
            ) : (
              <DataState title="No transactions yet" description="Your account activity will appear here." />
            )}
        </DataView>
      </div>
    </div>
  );
}
