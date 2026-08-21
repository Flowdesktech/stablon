"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { useRewards, useRewardsHistory, useWallets } from "@/hooks/use-bridge";
import { formatDate } from "@/lib/utils";
import { walletBalanceOf } from "@/lib/bridge";
import type { BridgeWallet } from "@/types/bridge";
import {
  TrendingUp,
  Sparkles,
  Lock,
  DollarSign,
  Clock,
} from "lucide-react";

export default function EarnPage() {
  const { rewards, isLoading: rewardsLoading } = useRewards();
  const { history, isLoading: historyLoading } = useRewardsHistory();
  const { wallets } = useWallets();

  const usdbBalance = (wallets as BridgeWallet[]).reduce(
    (sum, w) => sum + walletBalanceOf(w.balances, "usdb"),
    0
  );

  const totalEarned = rewards?.total_earned ? parseFloat(rewards.total_earned) : 0;
  const currentApy = rewards?.current_apy || "5.0";

  const earnProducts = [
    {
      id: "flex",
      name: "Flexible Yield",
      apy: `${currentApy}%`,
      description: "Earn on your liquid USDB balance. Withdraw anytime.",
      balance: `$${usdbBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      earned: `$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      status: usdbBalance > 0 ? "active" : "available",
      tag: "No lock-up",
    },
    {
      id: "30d",
      name: "30-Day Fixed",
      apy: "8.0%",
      description: "Lock your stablecoins for 30 days for higher returns.",
      balance: "$0.00",
      earned: "$0.00",
      status: "available",
      tag: "Coming Soon",
    },
    {
      id: "90d",
      name: "90-Day Fixed",
      apy: "12.0%",
      description: "Institutional-grade private credit. Powered by Kasu.",
      balance: "$0.00",
      earned: "$0.00",
      status: "available",
      tag: "Coming Soon",
    },
    {
      id: "180d",
      name: "180-Day Premium",
      apy: "20.0%",
      description: "Maximum returns with extended lock-up period.",
      balance: "$0.00",
      earned: "$0.00",
      status: "available",
      tag: "Coming Soon",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader title="Earn" description="Review available yield products and your earnings history." />

      {/* Overview cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Total earned"
          value={rewardsLoading ? <span className="text-muted-foreground">—</span> : `$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          detail="Lifetime earnings"
        />
        <StatCard
          label="Earning balance"
          value={`$${usdbBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          detail="USDB balance"
        />
        <StatCard label="Current APY" value={`${currentApy}%`} detail="Flexible yield" />
      </div>

      {/* Products */}
      <div>
        <SectionHeader title="Earn products" className="mb-4" />
        <div className="grid md:grid-cols-2 gap-4">
          {earnProducts.map((product) => (
            <Card key={product.id} className={product.status === "active" ? "border-success/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {product.status === "active" ? (
                      <Sparkles className="h-4 w-4 text-success" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    {product.name}
                  </CardTitle>
                  <Badge variant={product.tag === "No lock-up" ? "success" : "secondary"}>
                    {product.tag}
                  </Badge>
                </div>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-3xl font-semibold text-foreground">{product.apy}</p>
                    <p className="text-xs text-muted-foreground">APY</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{product.balance}</p>
                    <p className="text-xs text-muted-foreground">Deposited</p>
                  </div>
                </div>
                {product.status === "active" ? (
                  <div className="flex items-center justify-between rounded-md border border-success/25 bg-success-muted p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm text-success">Earning {product.earned}</span>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How it works */}
      <Alert
        variant="info"
        title="How flexible yield works"
        description="Eligible USDB balances accrue rewards according to the rate shown above. Rates may change."
      />

      {/* History */}
      <div>
        <SectionHeader title="Earnings history" className="mb-4" />
        <DataView>
            {historyLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            ) : (history as Array<{ id: string; type?: string; amount: string; created_at: string }>).length > 0 ? (
              <div className="divide-y divide-border">
                {(history as Array<{ id: string; type?: string; amount: string; created_at: string }>).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success-muted">
                        <DollarSign className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.type || "Flexible Yield"}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-success">+${parseFloat(item.amount).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <DataState title="No earnings history yet" description="Eligible earnings will appear here." />
            )}
        </DataView>
      </div>
    </div>
  );
}
