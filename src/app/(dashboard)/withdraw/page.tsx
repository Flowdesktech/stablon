"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { Field } from "@/components/ui/field";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useExternalAccounts, addExternalAccount, useTransfers, createTransfer, useWallets } from "@/hooks/use-bridge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { walletBalanceOf } from "@/lib/bridge";
import type { BridgeExternalAccount, BridgeTransfer, BridgeWallet } from "@/types/bridge";
import {
  ArrowUpFromLine,
  Landmark,
  Wallet,
  Plus,
  Clock,
  AlertCircle,
  ChevronDown,
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
    return sum + walletBalanceOf(w.balances, "usd") + walletBalanceOf(w.balances, "usdc");
  }, 0);

  const activeNetwork = onChainNetworks.find((n) => n.id === network) ?? onChainNetworks[0];

  const withdrawalTransfers = (transfers as BridgeTransfer[])
    .filter((t) => {
      const rail = t.destination?.payment_rail || "";
      const isBank = ["ach", "wire", "sepa", "fps"].some((r) => rail.includes(r));
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
      <PageHeader title="Withdraw funds" description="Send funds to a linked bank account or an external wallet." />

      <SegmentedControl
        label="Withdrawal method"
        value={method}
        onChange={(value) => setMethod(value as WithdrawMethod)}
        options={[
          { value: "bank", label: "To bank", icon: <Landmark className="h-4 w-4" /> },
          { value: "crypto", label: "On-chain", icon: <Wallet className="h-4 w-4" /> },
        ]}
        className="w-full sm:w-auto"
      />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {method === "bank" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bank Withdrawal</CardTitle>
                <CardDescription>Choose a destination and enter the amount</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field label="Destination bank account">
                  <div className="space-y-2">
                    {accountsLoading ? (
                      <div className="skeleton h-16 rounded-md" />
                    ) : (bankAccounts as BridgeExternalAccount[]).length > 0 ? (
                      (bankAccounts as BridgeExternalAccount[]).map((account) => (
                        <button
                          key={account.id}
                          onClick={() => setSelectedAccount(account.id)}
                          className={`flex w-full items-center justify-between rounded-md border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                            selectedAccount === account.id
                              ? "border-primary bg-info-muted"
                              : "border-border bg-surface hover:bg-surface-muted"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-subtle">
                              <Landmark className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-foreground">{account.bank_name}</p>
                              <p className="text-xs text-muted-foreground">
                                ••{account.last_4} &middot; {account.currency?.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">{account.currency?.toUpperCase()}</Badge>
                        </button>
                      ))
                    ) : (
                      <p className="py-2 text-sm text-muted-foreground">No bank accounts linked yet. Add one below.</p>
                    )}
                    <button
                      onClick={() => setShowAddBank(!showAddBank)}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-strong p-3 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Plus className="w-4 h-4" /> Add Bank Account
                    </button>
                  </div>
                </Field>

                {showAddBank && (
                  <Card className="bg-surface-muted">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">Add new bank account</p>
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

                <Field label="Amount">
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg pr-20"
                    />
                    <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm text-muted-foreground">
                      USD <ChevronDown className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Available: {formatCurrency(usdBalance)}</span>
                    <button
                      onClick={() => setAmount(String(usdBalance))}
                      className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Withdraw Max
                    </button>
                  </div>
                </Field>

                {submitted ? (
                  <Alert variant="success" title="Withdrawal initiated" description="Your bank transfer is being processed." />
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
                <Field label="Network">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {onChainNetworks.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setNetwork(n.id);
                          if (!n.tokens.includes(token)) setToken(n.tokens[0]);
                        }}
                        className={`flex items-center gap-2 rounded-md border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                          network === n.id
                            ? "border-primary bg-info-muted"
                            : "border-border bg-surface hover:bg-surface-muted"
                        }`}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-subtle text-xs font-semibold text-muted-foreground">
                          {n.name.charAt(0)}
                        </div>
                        <span className="truncate text-sm font-medium text-foreground">{n.name}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Token">
                  <div className="flex gap-2">
                    {activeNetwork.tokens.map((t) => (
                      <button
                        key={t}
                        onClick={() => setToken(t)}
                        className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                          token === t
                            ? "border-primary bg-info-muted text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:bg-surface-muted"
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Destination address">
                  <Input
                    placeholder={`Recipient ${activeNetwork.name} address`}
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                </Field>

                <Field label="Amount">
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      className="text-lg pr-20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {token.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Available: {formatCurrency(usdBalance)}</span>
                    <button
                      onClick={() => setCryptoAmount(String(usdBalance))}
                      className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Withdraw Max
                    </button>
                  </div>
                </Field>

                <Alert
                  variant="warning"
                  title="Check the address and network"
                  description="On-chain transfers are irreversible. Using the wrong network may result in permanent loss."
                />

                {cryptoSubmitted ? (
                  <Alert variant="success" title="Withdrawal submitted" description="Your on-chain transfer is being processed." />
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
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground">
                  {method === "bank" ? `$${amount || "0.00"}` : `${cryptoAmount || "0.00"} ${token.toUpperCase()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network fee</span>
                <span className="text-success">$0.00</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-sm">
                <span className="font-medium text-foreground">You receive</span>
                <span className="font-semibold text-foreground">
                  {method === "bank" ? `$${amount || "0.00"}` : `${cryptoAmount || "0.00"} ${token.toUpperCase()}`}
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-surface-muted p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
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
        <SectionHeader title={method === "bank" ? "Bank withdrawals" : "On-chain withdrawals"} className="mb-4" />
        <DataView>
            {transfersLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
              </div>
            ) : withdrawalTransfers.length > 0 ? (
              <div className="divide-y divide-border">
                {withdrawalTransfers.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info-muted">
                        <ArrowUpFromLine className="h-4 w-4 text-info" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {(item.destination?.payment_rail || "withdrawal").toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
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
              <DataState title="No withdrawal history yet" description="Completed and pending withdrawals will appear here." />
            )}
        </DataView>
      </div>
    </div>
  );
}
