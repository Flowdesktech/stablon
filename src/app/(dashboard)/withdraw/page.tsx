"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useExternalAccounts, addExternalAccount, useTransfers, createTransfer, useWallets } from "@/hooks/use-bridge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BridgeExternalAccount, BridgeTransfer, BridgeWallet } from "@/types/bridge";
import {
  ArrowUpFromLine,
  Landmark,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Loader2,
} from "lucide-react";

export default function WithdrawPage() {
  const { bankAccounts, isLoading: accountsLoading, mutate: refreshAccounts } = useExternalAccounts();
  const { transfers, isLoading: transfersLoading } = useTransfers();
  const { wallets } = useWallets();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [showAddBank, setShowAddBank] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [bankName, setBankName] = useState("");
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const usdBalance = (wallets as BridgeWallet[]).reduce((sum, w) => {
    const bal = parseFloat(w.balances?.usd || w.balances?.usdc || "0");
    return sum + bal;
  }, 0);

  const withdrawalTransfers = (transfers as BridgeTransfer[]).filter((t) =>
    ["ach", "wire", "sepa"].some((r) => (t.destination?.payment_rail || "").includes(r))
  ).slice(0, 5);

  async function handleSaveBank() {
    setSavingBank(true);
    try {
      await addExternalAccount({
        currency: "usd",
        bank_name: bankName,
        account_owner_name: holderName,
        account_type: "checking",
        account_number: accountNumber,
        routing_number: routingNumber,
      });
      setShowAddBank(false);
      setBankName(""); setHolderName(""); setAccountNumber(""); setRoutingNumber("");
    } catch {
      // graceful
    } finally {
      setSavingBank(false);
      refreshAccounts();
    }
  }

  async function handleWithdraw() {
    if (!selectedAccount || !amount) return;
    setSubmitting(true);
    try {
      await createTransfer({
        amount,
        source: { payment_rail: "bridge_wallet", currency: "usdc" },
        destination: { payment_rail: "ach", currency: "usd", external_account_id: selectedAccount },
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      // graceful
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>
        <p className="text-white/50 mt-1">Cash out to your bank account via local payment rails</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Withdrawal Details</CardTitle>
              <CardDescription>Choose a destination and enter the amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Destination Bank Account</label>
                <div className="space-y-2">
                  {accountsLoading ? (
                    <div className="skeleton h-16 rounded-xl" />
                  ) : (bankAccounts as BridgeExternalAccount[]).length > 0 ? (
                    (bankAccounts as BridgeExternalAccount[]).map((account) => (
                      <button
                        key={account.id}
                        onClick={() => setSelectedAccount(account.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedAccount === account.id
                            ? "border-purple-500/50 bg-purple-500/5"
                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                            <Landmark className="w-4 h-4 text-white/50" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{account.bank_name}</p>
                            <p className="text-xs text-white/40">
                              ••{account.last_4} &middot; {account.currency?.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{account.currency?.toUpperCase()}</Badge>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-white/40 py-2">No bank accounts linked yet. Add one below.</p>
                  )}
                  <button
                    onClick={() => setShowAddBank(!showAddBank)}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Bank Account
                  </button>
                </div>
              </div>

              {showAddBank && (
                <Card className="border-purple-500/20">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium text-white">Add New Bank Account</p>
                    <Input placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    <Input placeholder="Account Holder Name" value={holderName} onChange={(e) => setHolderName(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Account Number / IBAN" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                      <Input placeholder="Routing / BIC" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                      <Button size="sm" className="flex-1" onClick={handleSaveBank} disabled={savingBank}>
                        {savingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Account"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddBank(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg pr-20"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-white/50 hover:text-white/70 transition-colors cursor-pointer">
                    USD <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-white/40">Available: {formatCurrency(usdBalance)}</span>
                  <button
                    onClick={() => setAmount(String(usdBalance))}
                    className="text-xs text-purple-400 hover:underline cursor-pointer"
                  >
                    Withdraw Max
                  </button>
                </div>
              </div>

              {submitted ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Withdrawal Initiated</p>
                    <p className="text-xs text-emerald-300/60">Your funds will arrive within 1-2 business days.</p>
                  </div>
                </div>
              ) : (
                <Button onClick={handleWithdraw} className="w-full" disabled={!selectedAccount || !amount || submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpFromLine className="w-4 h-4" />}
                  Withdraw Funds
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Withdrawal Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Amount</span>
                <span className="text-white">${amount || "0.00"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Fee</span>
                <span className="text-emerald-400">$0.00</span>
              </div>
              <div className="border-t border-white/5 pt-3 flex justify-between text-sm">
                <span className="text-white/70 font-medium">You receive</span>
                <span className="text-white font-bold">${amount || "0.00"}</span>
              </div>
              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <AlertCircle className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                <p className="text-xs text-white/40">
                  Withdrawals are processed during banking hours. Weekends and holidays may cause delays.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Withdrawal History</h2>
        <Card>
          <CardContent className="p-0">
            {transfersLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            ) : withdrawalTransfers.length > 0 ? (
              <div className="divide-y divide-white/5">
                {withdrawalTransfers.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <ArrowUpFromLine className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {(item.destination?.payment_rail || "withdrawal").toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{formatCurrency(parseFloat(item.amount || "0"))}</p>
                      <Badge variant={item.state === "completed" ? "success" : "warning"}>{item.state}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <Inbox className="w-8 h-8 text-white/20" />
                <p className="text-sm text-white/40">No withdrawal history yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
