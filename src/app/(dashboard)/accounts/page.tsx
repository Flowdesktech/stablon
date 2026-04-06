"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVirtualAccounts, createVirtualAccount } from "@/hooks/use-bridge";
import type { BridgeVirtualAccount } from "@/types/bridge";
import {
  Landmark,
  Plus,
  Copy,
  Check,
  Globe,
  DollarSign,
  Euro,
  Inbox,
  Loader2,
} from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03] border border-white/5">
      <div>
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-sm text-white font-mono">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

export default function AccountsPage() {
  const { accounts, isLoading, mutate } = useVirtualAccounts();
  const [creating, setCreating] = useState(false);
  const [creatingCurrency, setCreatingCurrency] = useState<string | null>(null);

  async function handleCreate(currency: string) {
    setCreatingCurrency(currency);
    try {
      await createVirtualAccount(currency);
      setCreating(false);
    } catch {
      // API will fail without a real Bridge key -- handled gracefully
    } finally {
      setCreatingCurrency(null);
      mutate();
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Global Accounts</h1>
          <p className="text-white/50 mt-1">USD and EUR bank accounts for receiving payments worldwide</p>
        </div>
        <Button onClick={() => setCreating(!creating)}>
          <Plus className="w-4 h-4" /> New Account
        </Button>
      </div>

      {creating && (
        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle>Create Virtual Account</CardTitle>
            <CardDescription>Choose a currency for your new global account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {["usd", "eur"].map((currency) => (
                <Button
                  key={currency}
                  variant="outline"
                  className="flex-1 h-20 flex-col gap-2"
                  disabled={creatingCurrency !== null}
                  onClick={() => handleCreate(currency)}
                >
                  {creatingCurrency === currency ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : currency === "usd" ? (
                    <DollarSign className="w-6 h-6" />
                  ) : (
                    <Euro className="w-6 h-6" />
                  )}
                  <span>{currency.toUpperCase()} Account</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : (accounts as BridgeVirtualAccount[]).length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {(accounts as BridgeVirtualAccount[]).map((account) => {
            const details = account.account_details || {};
            const isUsd = account.currency?.toLowerCase() === "usd";
            return (
              <Card key={account.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        {isUsd ? <DollarSign className="w-5 h-5 text-emerald-400" /> : <Euro className="w-5 h-5 text-blue-400" />}
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.currency?.toUpperCase()} Account</CardTitle>
                        <p className="text-xs text-white/40">{isUsd ? "ACH / Wire" : "SEPA"}</p>
                      </div>
                    </div>
                    <Badge variant={account.status === "active" ? "success" : "secondary"}>
                      {account.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {details.bank_name && (
                    <div className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                      {details.bank_name}
                    </div>
                  )}
                  {details.account_number && <DetailRow label="Account Number" value={details.account_number} />}
                  {details.routing_number && <DetailRow label="Routing Number" value={details.routing_number} />}
                  {details.iban && <DetailRow label="IBAN" value={details.iban} />}
                  {details.bic && <DetailRow label="BIC / SWIFT" value={details.bic} />}
                  {details.clabe && <DetailRow label="CLABE" value={details.clabe} />}
                  {details.pix_key && <DetailRow label="PIX Key" value={details.pix_key} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <Globe className="w-7 h-7 text-white/20" />
            </div>
            <div>
              <p className="text-white/70 font-medium">No accounts yet</p>
              <p className="text-sm text-white/40 mt-1">Create a USD or EUR virtual account to receive payments worldwide.</p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Create Account
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
