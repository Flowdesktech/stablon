"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallets, useTransfers, useActivity, useCustomer, createBridgeCustomer } from "@/hooks/use-bridge";
import { ActivityRow } from "@/components/activity/activity-row";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import type { BridgeWallet, ActivityItem } from "@/types/bridge";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  Wallet,
  DollarSign,
  Euro,
  ChevronRight,
  Inbox,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const quickActions = [
  { label: "Deposit", icon: ArrowDownToLine, href: "/deposit", gradient: "from-emerald-500 to-emerald-700" },
  { label: "Withdraw", icon: ArrowUpFromLine, href: "/withdraw", gradient: "from-blue-500 to-blue-700" },
  { label: "Swap", icon: ArrowLeftRight, href: "/swap", gradient: "from-purple-500 to-purple-700" },
  { label: "Card", icon: CreditCard, href: "/card", gradient: "from-amber-500 to-amber-700" },
];

const currencyIcons: Record<string, typeof DollarSign> = {
  usd: DollarSign, eur: Euro, usdc: Wallet, usdt: Wallet, usdb: Wallet,
};

function aggregateBalances(wallets: BridgeWallet[]) {
  const totals: Record<string, number> = {};
  for (const w of wallets) {
    for (const [currency, amount] of Object.entries(w.balances || {})) {
      totals[currency] = (totals[currency] || 0) + parseFloat(amount);
    }
  }
  return Object.entries(totals).map(([currency, amount]) => ({ currency, amount }));
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
    <Card className="relative overflow-hidden border-purple-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/15 to-blue-600/10" />
      <CardContent className="relative p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white">Finish setting up your account</p>
          <p className="text-sm text-white/60 mt-1">
            Link your account to enable deposits, withdrawals, swaps, and your card. This only takes a moment.
          </p>
        </div>
        <Button onClick={handleLink} disabled={linking} className="shrink-0">
          {linking ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
          ) : (
            "Set up account"
          )}
        </Button>
      </CardContent>
    </Card>
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
    <Card className="relative overflow-hidden border-amber-500/25">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
      <CardContent className="relative p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="text-sm text-white/60 mt-1">{description}</p>
        </div>
        <Link href="/verify" className="shrink-0">
          <Button variant={pending ? "outline" : undefined}>{ctaLabel}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { wallets, isLoading: walletsLoading } = useWallets();
  const { activity, isLoading: activityLoading } = useActivity();

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
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user.displayName || "there"}
        </h1>
        <p className="text-white/50 mt-1">Here&apos;s your financial overview</p>
      </div>

      <AccountSetupBanner />
      <VerifyBanner />

      {/* Total balance */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10" />
        <CardContent className="relative p-6">
          <p className="text-sm text-white/60 mb-1">Total Balance</p>
          <p className="text-4xl font-bold text-white tracking-tight">
            {formatCurrency(totalUsd)}
          </p>
          {balances.length === 0 && (
            <p className="text-sm text-white/40 mt-2">No balances yet. Deposit funds to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Card className="hover:bg-white/[0.06] transition-all cursor-pointer group">
              <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white/80">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Balance cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Balances</h2>
        {balances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((b) => {
              const Icon = currencyIcons[b.currency.toLowerCase()] || Wallet;
              const symbol = b.currency.toLowerCase() === "eur" ? "€" : "$";
              return (
                <Card key={b.currency} className="hover:bg-white/[0.06] transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white/60" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {symbol}{b.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-white/50 mt-1">{b.currency.toUpperCase()}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
              <Wallet className="w-8 h-8 text-white/20" />
              <p className="text-sm text-white/40">No balances yet. Deposit funds to see them here.</p>
              <Link href="/deposit"><Button size="sm">Make a Deposit</Button></Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <Button asChild variant="ghost" size="sm" className="text-white/50">
            <Link href="/transactions">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {activityLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="divide-y divide-white/5">
                {recentActivity.map((tx) => (
                  <ActivityRow key={`${tx.kind}-${tx.id}`} item={tx} />
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <Inbox className="w-8 h-8 text-white/20" />
                <p className="text-sm text-white/40">No transactions yet. Your activity will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
