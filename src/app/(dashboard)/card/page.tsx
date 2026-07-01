"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCards, provisionCard, useCardTransactions, toggleCardFreeze } from "@/hooks/use-bridge";
import { formatDate } from "@/lib/utils";
import type { BridgeCardAccount, BridgeCardTransaction } from "@/types/bridge";
import {
  CreditCard,
  Eye,
  EyeOff,
  Snowflake,
  Sun,
  Smartphone,
  ShoppingBag,
  Clock,
  Shield,
  Loader2,
  Inbox,
} from "lucide-react";

export default function CardPage() {
  const { cards, isLoading, mutate } = useCards();
  const [showNumber, setShowNumber] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const card = (cards as BridgeCardAccount[])[0] ?? null;
  const { transactions, isLoading: txLoading } = useCardTransactions(card?.id);
  const frozen = card?.status === "frozen";

  async function handleProvision() {
    setProvisioning(true);
    try {
      await provisionCard("usd");
    } catch {
      // graceful
    } finally {
      setProvisioning(false);
      mutate();
    }
  }

  async function handleToggleFreeze() {
    if (!card) return;
    setFreezing(true);
    try {
      await toggleCardFreeze(card.id, !frozen);
    } catch {
      // graceful
    } finally {
      setFreezing(false);
      mutate();
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Visa Card</h1>
          <p className="text-white/50 mt-1">Manage your Stablon Visa card</p>
        </div>
        <div className="skeleton h-64 max-w-md rounded-2xl" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Visa Card</h1>
          <p className="text-white/50 mt-1">Spend your stablecoins anywhere Visa is accepted</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Get Your Stablon Card</h2>
              <p className="text-white/50 text-sm mb-6">
                Spend stablecoins like cash at 200M+ merchants worldwide.
                Free digital card with Apple Pay and Google Pay support.
              </p>
              <div className="space-y-3 text-left mb-6">
                {["0% fee on USD spending", "Free virtual card", "Apple Pay & Google Pay", "Instant transaction alerts"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/60">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    {f}
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={handleProvision} disabled={provisioning}>
                {provisioning ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Card...</> : "Activate Free Card"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const last4 = card.card_number_last_4 || "****";
  const cardNumber = `•••• •••• •••• ${last4}`;
  const expiry = "••/••";
  const cvv = "•••";

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Visa Card</h1>
        <p className="text-white/50 mt-1">Manage your Stablon Visa card</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="relative w-full max-w-md">
            <div className={`aspect-[1.586/1] rounded-2xl p-6 flex flex-col justify-between transition-all ${frozen ? "bg-gradient-to-br from-gray-700 to-gray-900" : "bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <span className="text-white/80 text-sm font-medium">Stablon</span>
                </div>
                {frozen && <Badge variant="warning">Frozen</Badge>}
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Card Number</p>
                <p className="text-white text-lg font-mono tracking-widest">
                  {showNumber ? cardNumber : `•••• •••• •••• ${last4}`}
                </p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/60 text-[10px]">VALID THRU</p>
                  <p className="text-white text-sm font-mono">{showNumber ? expiry : "••/••"}</p>
                </div>
                <div>
                  <p className="text-white/60 text-[10px]">CVV</p>
                  <p className="text-white text-sm font-mono">{showNumber ? cvv : "•••"}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-lg italic">VISA</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowNumber(!showNumber)}>
              {showNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showNumber ? "Hide" : "Reveal"} Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFreeze}
              disabled={freezing}
              className={frozen ? "border-amber-500/30 text-amber-300" : ""}
            >
              {freezing ? <Loader2 className="w-4 h-4 animate-spin" /> : frozen ? <Sun className="w-4 h-4" /> : <Snowflake className="w-4 h-4" />}
              {frozen ? "Unfreeze" : "Freeze"} Card
            </Button>
            <Button variant="outline" size="sm">
              <Smartphone className="w-4 h-4" /> Add to Wallet
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Card Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Status", value: frozen ? "Frozen" : card.status || "Active" },
                { label: "Card Type", value: "Virtual Visa Debit" },
                { label: "Settlement", value: (card.settlement_currency || "USD").toUpperCase() },
                { label: "Spending Limit", value: "$25,000 / day" },
                { label: "Apple Pay", value: "Active" },
                { label: "Google Pay", value: "Active" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-white/50">{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Card Protected</p>
                <p className="text-xs text-white/40">Instant freeze, real-time alerts, zero liability</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Card Transactions</h2>
        <Card>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            ) : (transactions as BridgeCardTransaction[]).length > 0 ? (
              <div className="divide-y divide-white/5">
                {(transactions as BridgeCardTransaction[]).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-white/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{tx.merchant_name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <Clock className="w-3 h-3" /> {formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white">
                      -${parseFloat(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <Inbox className="w-8 h-8 text-white/20" />
                <p className="text-sm text-white/40">No card transactions yet. Start spending to see them here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
