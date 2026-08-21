"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { PageHeader, SectionHeader } from "@/components/ui/page";
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
} from "lucide-react";

export default function CardPage() {
  const { cards, error, isLoading, mutate } = useCards();
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
        <PageHeader title="Visa card" description="Manage your card and review card activity." />
        <DataView className="max-w-md"><DataState kind="loading" title="Loading card" /></DataView>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title="Visa card" description="Manage your card and review card activity." />
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert
            className="w-full max-w-md"
            variant="danger"
            title="Cards unavailable"
            description={error.message}
            action={<Button variant="outline" onClick={() => mutate()}>Try again</Button>}
          />
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title="Visa card" description="Create and manage your virtual card." />
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-md bg-info-muted">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Create your virtual card</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Request a card linked to your account balance.
              </p>
              <div className="space-y-3 text-left mb-6">
                {["Card controls in your account", "Transaction history", "Freeze and unfreeze controls"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {f}
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={handleProvision} disabled={provisioning}>
                {provisioning ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating card...</> : "Create card"}
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
      <PageHeader title="Visa card" description="Manage your card controls and review card activity." />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="relative w-full max-w-md">
            <div className={`flex aspect-[1.586/1] flex-col justify-between rounded-lg border p-6 shadow-[var(--shadow-md)] transition-colors ${frozen ? "border-border-strong bg-surface-muted text-muted-foreground" : "border-foreground/10 bg-foreground text-background"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-current/20">
                    <span className="text-sm font-semibold">S</span>
                  </div>
                  <span className="text-sm font-medium">Stablon</span>
                </div>
                {frozen && <Badge variant="warning">Frozen</Badge>}
              </div>
              <div>
                <p className="mb-1 text-xs opacity-70">Card number</p>
                <p className="font-mono text-lg tracking-widest">
                  {showNumber ? cardNumber : `•••• •••• •••• ${last4}`}
                </p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] opacity-70">VALID THRU</p>
                  <p className="font-mono text-sm">{showNumber ? expiry : "••/••"}</p>
                </div>
                <div>
                  <p className="text-[10px] opacity-70">CVV</p>
                  <p className="font-mono text-sm">{showNumber ? cvv : "•••"}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold italic">VISA</p>
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
              className={frozen ? "border-warning/30 text-warning" : ""}
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
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">Card controls</p>
                <p className="text-xs text-muted-foreground">Freeze or unfreeze your card at any time.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <SectionHeader title="Card transactions" className="mb-4" />
        <DataView>
            {txLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            ) : (transactions as BridgeCardTransaction[]).length > 0 ? (
              <div className="divide-y divide-border">
                {(transactions as BridgeCardTransaction[]).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-muted sm:px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-subtle">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.merchant_name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      -${parseFloat(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <DataState title="No card transactions yet" description="Card activity will appear here." />
            )}
        </DataView>
      </div>
    </div>
  );
}
