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
  Wallet,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Loader2,
} from "lucide-react";

type WithdrawMethod = "bank" | "crypto";

const onChainNetworks = [
  { id: "ethereum", name: "Ethereum", tokens: ["usdc", "usdt"] },
  { id: "solana", name: "Solana", tokens: ["usdc", "usdt"] },
  { id: "polygon", name: "Polygon", tokens: ["usdc", "usdt"] },
  { id: "arbitrum", name: "Arbitrum", tokens: ["usdc", "usdt"] },
  { id: "base", name: "Base", tokens: ["usdc"] },
  { id: "optimism", name: "Optimism", tokens: ["usdc"] },
  { id: "avalanche", name: "Avalanche", tokens: ["usdc", "usdt"] },
];

export default function WithdrawPage() {
  const { bankAccounts, isLoading: accountsLoading, mutate: refreshAccounts } = useExternalAccounts();
  const { transfers, isLoading: transfersLoading } = useTransfers();
  const { wallets } = useWallets();

  const [method, setMethod] = useState<WithdrawMethod>("bank");

  // Bank withdrawal state
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

  // On-chain withdrawal state
  const [network, setNetwork] = useState<string>("ethereum");
  const [token, setToken] = useState<string>("usdc");
  const [toAddress, setToAddress] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [cryptoSubmitting, setCryptoSubmitting] = useState(false);
  const [cryptoSubmitted, setCryptoSubmitted] = useState(false);

  const usdBalance = (wallets as BridgeWallet[]).reduce((sum, w) => {
    const bal = parseFloat(w.balances?.usd || w.balances?.usdc || "0");
    return sum + bal;
  }, 0);

  const activeNetwork = onChainNetworks.find((n) => n.id === network) ?? onChainNetworks[0];

  const withdrawalTransfers = (transfers as BridgeTransfer[])
    .filter((t) => {
      const rail = t.destination?.payment_rail || "";
      const isBank = ["ach", "wire", "sepa", "pix", "spei", "fps"].some((r) => rail.includes(r));
      const isOnChain = Boolean(t.destination?.to_address);
      return method === "bank" ? isBank : isOnChain;
    })
    .slice(0, 5);

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
      // toast handled in helper
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
      setAmount("");
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      // toast handled in helper
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCryptoWithdraw() {
    if (!toAddress || !cryptoAmount) return;
    setCryptoSubmitting(true);
    try {
      await createTransfer({
        amount: cryptoAmount,
        source: { payment_rail: "bridge_wallet", currency: token },
        destination: { payment_rail: network, currency: token, to_address: toAddress.trim() },
      });
      setCryptoSubmitted(true);
      setCryptoAmount("");
      setToAddress("");
      setTimeout(() => setCryptoSubmitted(false), 3000);
    } catch {
      // toast handled in helper
    } finally {
      setCryptoSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>
        <p className="text-white/50 mt-1">Cash out to your bank account or send on-chain to any wallet</p>
      </div>

      <div className="flex gap-3">
        <Button
          variant={method === "bank" ? "default" : "outline"}
          onClick={() => setMethod("bank")}
          className="flex-1 sm:flex-none"
        >
          <Landmark className="w-4 h-4" /> To Bank
        </Button>
        <Button
          variant={method === "crypto" ? "default" : "outline"}
          onClick={() => setMethod("crypto")}
          className="flex-1 sm:flex-none"
        >
          <Wallet className="w-4 h-4" /> On-Chain
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {method === "bank" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bank Withdrawal</CardTitle>
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
                    Withdraw to Bank
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">On-Chain Withdrawal</CardTitle>
                <CardDescription>Send stablecoins to an external wallet address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Network</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {onChainNetworks.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setNetwork(n.id);
                          if (!n.tokens.includes(token)) setToken(n.tokens[0]);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          network === n.id
                            ? "border-purple-500/50 bg-purple-500/5"
                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                          {n.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-white truncate">{n.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Token</label>
                  <div className="flex gap-2">
                    {activeNetwork.tokens.map((t) => (
                      <button
                        key={t}
                        onClick={() => setToken(t)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                          token === t
                            ? "border-purple-500/50 bg-purple-500/5 text-white"
                            : "border-white/5 bg-white/[0.02] text-white/60 hover:bg-white/[0.04]"
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Destination Address</label>
                  <Input
                    placeholder={`Recipient ${activeNetwork.name} address`}
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Amount</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      className="text-lg pr-20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/50">
                      {token.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/40">Available: {formatCurrency(usdBalance)}</span>
                    <button
                      onClick={() => setCryptoAmount(String(usdBalance))}
                      className="text-xs text-purple-400 hover:underline cursor-pointer"
                    >
                      Withdraw Max
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">
                    Double-check the address and network. On-chain transfers are irreversible, and sending to the wrong network may result in permanent loss.
                  </p>
                </div>

                {cryptoSubmitted ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-300">Withdrawal Submitted</p>
                      <p className="text-xs text-emerald-300/60">Your on-chain transfer is being processed.</p>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleCryptoWithdraw} className="w-full" disabled={!toAddress || !cryptoAmount || cryptoSubmitting}>
                    {cryptoSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpFromLine className="w-4 h-4" />}
                    Withdraw On-Chain
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Withdrawal Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Amount</span>
                <span className="text-white">
                  {method === "bank" ? `$${amount || "0.00"}` : `${cryptoAmount || "0.00"} ${token.toUpperCase()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Network Fee</span>
                <span className="text-emerald-400">$0.00</span>
              </div>
              <div className="border-t border-white/5 pt-3 flex justify-between text-sm">
                <span className="text-white/70 font-medium">You receive</span>
                <span className="text-white font-bold">
                  {method === "bank" ? `$${amount || "0.00"}` : `${cryptoAmount || "0.00"} ${token.toUpperCase()}`}
                </span>
              </div>
              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <AlertCircle className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                <p className="text-xs text-white/40">
                  {method === "bank"
                    ? "Bank withdrawals are processed during banking hours. Weekends and holidays may cause delays."
                    : "On-chain withdrawals typically settle within minutes, depending on network congestion."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {method === "bank" ? "Bank Withdrawals" : "On-Chain Withdrawals"}
        </h2>
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
                      <p className="text-sm font-medium text-white">
                        {method === "bank"
                          ? formatCurrency(parseFloat(item.amount || "0"))
                          : `${parseFloat(item.amount || "0")} ${(item.destination?.currency || "").toUpperCase()}`}
                      </p>
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
