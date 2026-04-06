"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRewards, useRewardsHistory, useWallets } from "@/hooks/use-bridge";
import { formatDate } from "@/lib/utils";
import type { BridgeWallet } from "@/types/bridge";
import {
  TrendingUp,
  Sparkles,
  Lock,
  DollarSign,
  Clock,
  Info,
  Inbox,
} from "lucide-react";

export default function EarnPage() {
  const { rewards, isLoading: rewardsLoading } = useRewards();
  const { history, isLoading: historyLoading } = useRewardsHistory();
  const { wallets } = useWallets();

  const usdbBalance = (wallets as BridgeWallet[]).reduce((sum, w) => {
    return sum + parseFloat(w.balances?.usdb || "0");
  }, 0);

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
      <div>
        <h1 className="text-2xl font-bold text-white">Earn</h1>
        <p className="text-white/50 mt-1">Grow your balance automatically with stablecoin yields</p>
      </div>

      {/* Overview cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent" />
          <CardContent className="relative p-5">
            <p className="text-xs text-white/40 mb-1">Total Earned</p>
            {rewardsLoading ? (
              <div className="skeleton h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-emerald-400">
                ${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            )}
            <p className="text-xs text-white/40 mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent" />
          <CardContent className="relative p-5">
            <p className="text-xs text-white/40 mb-1">Earning Balance</p>
            <p className="text-2xl font-bold text-white">
              ${usdbBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-white/40 mt-1">USDB balance</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent" />
          <CardContent className="relative p-5">
            <p className="text-xs text-white/40 mb-1">Current APY</p>
            <p className="text-2xl font-bold text-blue-400">{currentApy}%</p>
            <p className="text-xs text-white/40 mt-1">Flexible yield</p>
          </CardContent>
        </Card>
      </div>

      {/* Products */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Earn Products</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {earnProducts.map((product) => (
            <Card key={product.id} className={`relative overflow-hidden ${product.status === "active" ? "border-emerald-500/20" : ""}`}>
              {product.status === "active" && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-300" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {product.status === "active" ? (
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-white/30" />
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
                    <p className="text-3xl font-bold text-white">{product.apy}</p>
                    <p className="text-xs text-white/40">APY</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{product.balance}</p>
                    <p className="text-xs text-white/40">Deposited</p>
                  </div>
                </div>
                {product.status === "active" ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-emerald-300">Earning {product.earned}</span>
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">How Earning Works</h3>
              <div className="space-y-2 text-sm text-white/50">
                <p>Your USDB balance earns yield automatically. USDB is backed 1:1 by US dollars, with reserves invested in US Treasuries.</p>
                <p>Rewards accrue daily and are reflected in your balance in real time. No staking, no lock-ups for flexible yield.</p>
                <p>Fixed-term products offer higher APY in exchange for a lock-up period, powered by institutional-grade private credit.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Earnings History</h2>
        <Card>
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            ) : (history as Array<{ id: string; type?: string; amount: string; created_at: string }>).length > 0 ? (
              <div className="divide-y divide-white/5">
                {(history as Array<{ id: string; type?: string; amount: string; created_at: string }>).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.type || "Flexible Yield"}</p>
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-emerald-400">+${parseFloat(item.amount).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <Inbox className="w-8 h-8 text-white/20" />
                <p className="text-sm text-white/40">No earnings history yet. Deposit USDB to start earning.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
