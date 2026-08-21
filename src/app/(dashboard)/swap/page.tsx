"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { useWallets, useExchangeRate, createTransfer, useTransfers } from "@/hooks/use-bridge";
import { formatDate } from "@/lib/utils";
import { aggregateWalletBalances } from "@/lib/bridge";
import type { BridgeWallet, BridgeTransfer } from "@/types/bridge";
import {
  ArrowLeftRight,
  ArrowDown,
  RefreshCw,
  Clock,
  TrendingUp,
  ChevronDown,
  Zap,
  Loader2,
} from "lucide-react";

// Surface only the fiat and stablecoin pairs this product supports.
const SWAP_PAIRS: Array<[string, string]> = [
  ["usd", "eur"],
  ["usd", "gbp"],
  ["usd", "usdt"],
];

const CURRENCY_META: Record<string, { name: string; fullName: string }> = {
  usd: { name: "USD", fullName: "US Dollar" },
  eur: { name: "EUR", fullName: "Euro" },
  gbp: { name: "GBP", fullName: "British Pound" },
  usdt: { name: "USDT", fullName: "Tether" },
};

// All currencies that appear in at least one swappable pair.
const SWAP_CURRENCIES = Array.from(new Set(SWAP_PAIRS.flat()));

// Currencies a given currency can convert to (either direction of a pair).
function availableTargets(from: string): string[] {
  const targets = new Set<string>();
  for (const [a, b] of SWAP_PAIRS) {
    if (a === from) targets.add(b);
    if (b === from) targets.add(a);
  }
  return Array.from(targets);
}

export default function SwapPage() {
  const { wallets } = useWallets();
  const { transfers } = useTransfers();
  const [fromCurrency, setFromCurrency] = useState("usd");
  const [toCurrency, setToCurrency] = useState("eur");
  const [fromAmount, setFromAmount] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const { rate: exchangeRateData, error: rateError } = useExchangeRate(fromCurrency, toCurrency);
  const rateValue = exchangeRateData?.rate ? parseFloat(exchangeRateData.rate) : null;

  // Bridge returns a 400 ("Exchange rate from X to Y is not supported") when a
  // pair has no route. Detect that so we can show a friendly message and block
  // the swap, instead of surfacing the raw error text.
  const rateStatus = (rateError as (Error & { status?: number }) | undefined)?.status;
  const rateErrorMessage = (rateError?.message || "").toLowerCase();
  const pairUnsupported =
    rateStatus === 400 ||
    rateErrorMessage.includes("not supported") ||
    rateErrorMessage.includes("exchange rate");

  const balanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const { currency, amount } of aggregateWalletBalances(wallets as BridgeWallet[])) {
      map[currency] = amount;
    }
    return map;
  }, [wallets]);

  const fromBalance = balanceMap[fromCurrency] ?? 0;
  const fromAmountNum = parseFloat(fromAmount);
  const insufficientBalance =
    Boolean(fromAmount) && Number.isFinite(fromAmountNum) && fromAmountNum > fromBalance;
  const swapReady =
    Boolean(fromAmount) && rateValue !== null && !pairUnsupported && !insufficientBalance;

  const currencies = SWAP_CURRENCIES.map((id) => ({
    id,
    ...CURRENCY_META[id],
    balance: (balanceMap[id] || 0).toLocaleString("en-US", { minimumFractionDigits: 2 }),
  }));

  // "To" options limited to what the selected "from" currency can actually
  // convert to.
  const toOptions = currencies.filter((c) => availableTargets(fromCurrency).includes(c.id));

  const fromCurrencyData = currencies.find((c) => c.id === fromCurrency)!;
  const toCurrencyData = currencies.find((c) => c.id === toCurrency)!;
  const toAmount = fromAmount && rateValue ? (parseFloat(fromAmount) * rateValue).toFixed(2) : "";

  const swapTransfers = (transfers as BridgeTransfer[]).filter((t) => {
    const src = t.source?.payment_rail || "";
    const dst = t.destination?.payment_rail || "";
    return !["ach", "wire", "sepa"].some((r) => src.includes(r) || dst.includes(r));
  }).slice(0, 5);

  async function handleSwap() {
    if (!fromAmount) return;
    setSwapping(true);
    try {
      await createTransfer({
        amount: fromAmount,
        source: { payment_rail: "bridge_wallet", currency: fromCurrency },
        destination: { payment_rail: "bridge_wallet", currency: toCurrency },
      });
      setSwapped(true);
      setTimeout(() => setSwapped(false), 3000);
    } catch {
      // graceful
    } finally {
      setSwapping(false);
    }
  }

  const flipCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount("");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Swap"
        description="Convert supported balances between USD, EUR, GBP, and USDT."
      />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6 space-y-2">
              {/* From */}
              <div className="rounded-md border border-border bg-surface-muted p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">You pay</span>
                  <span className="text-xs text-muted-foreground">Balance: {fromCurrencyData.balance}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="text-2xl font-bold border-0 bg-transparent p-0 h-auto focus:ring-0"
                  />
                  <div className="relative">
                    <button
                      onClick={() => { setShowFromPicker(!showFromPicker); setShowToPicker(false); }}
                      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <span className="text-sm font-medium text-foreground">{fromCurrencyData.name}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {showFromPicker && (
                      <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-md border border-border-strong bg-surface py-1 shadow-[var(--shadow-md)]">
                        {currencies.filter((c) => c.id !== toCurrency).map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setFromCurrency(c.id);
                              setShowFromPicker(false);
                              // If the current target isn't reachable from the new
                              // source, snap to the first available target.
                              if (!availableTargets(c.id).includes(toCurrency)) {
                                const next = availableTargets(c.id)[0];
                                if (next) setToCurrency(next);
                              }
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="ml-2 text-muted-foreground">{c.fullName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {fromAmount && (
                  <button
                    onClick={() => setFromAmount(fromCurrencyData.balance.replace(/,/g, ""))}
                    className="mt-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Use Max
                  </button>
                )}
                {insufficientBalance && (
                  <p className="mt-1 text-xs text-danger">
                    Insufficient {fromCurrencyData.name} balance (available: {fromCurrencyData.balance}).
                  </p>
                )}
              </div>

              <div className="flex justify-center -my-1 relative z-10">
                <button
                  onClick={flipCurrencies}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>

              {/* To */}
              <div className="rounded-md border border-border bg-surface-muted p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">You receive</span>
                  <span className="text-xs text-muted-foreground">Balance: {toCurrencyData.balance}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-2xl font-semibold text-foreground">
                    {toAmount || <span className="text-muted-foreground">0.00</span>}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => { setShowToPicker(!showToPicker); setShowFromPicker(false); }}
                      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <span className="text-sm font-medium text-foreground">{toCurrencyData.name}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {showToPicker && (
                      <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-md border border-border-strong bg-surface py-1 shadow-[var(--shadow-md)]">
                        {toOptions.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setToCurrency(c.id); setShowToPicker(false); }}
                            className="w-full px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="ml-2 text-muted-foreground">{c.fullName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {pairUnsupported && fromCurrency !== toCurrency && (
                <Alert
                  variant="warning"
                  title="Pair unavailable"
                  description={`${fromCurrencyData.name} → ${toCurrencyData.name} cannot be quoted right now. Select another pair.`}
                />
              )}

              {fromAmount && rateValue && !pairUnsupported && (
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="w-3 h-3" />
                    1 {fromCurrencyData.name} = {rateValue.toFixed(4)} {toCurrencyData.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3" /> Instant
                  </div>
                </div>
              )}

              {swapped ? (
                <Alert
                  variant="success"
                  title="Swap complete"
                  description={`Converted ${fromAmount} ${fromCurrencyData.name} to ${toAmount} ${toCurrencyData.name}.`}
                />
              ) : (
                <Button onClick={handleSwap} className="w-full" disabled={!swapReady || swapping}>
                  {swapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                  Swap Now
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-info" />
                Exchange Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rateValue ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{fromCurrencyData.name} / {toCurrencyData.name}</span>
                  <span className="font-mono text-foreground">{rateValue.toFixed(4)}</span>
                </div>
              ) : pairUnsupported ? (
                <p className="text-xs text-warning">
                  {fromCurrencyData.name} → {toCurrencyData.name} isn&apos;t a supported swap pair.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Select currencies to see the current rate.</p>
              )}
              <div className="border-t border-border pt-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Supported pairs
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SWAP_PAIRS.map(([a, b]) => (
                    <span
                      key={`${a}-${b}`}
                      className="rounded-md border border-border bg-surface-subtle px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      {CURRENCY_META[a].name} ↔ {CURRENCY_META[b].name}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Rates refresh periodically.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Zap className="mt-0.5 h-5 w-5 shrink-0 text-info" />
                <div>
                  <p className="text-sm font-medium text-foreground">Supported pairs</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Availability and quoted rates depend on the selected currencies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History */}
      <div>
        <SectionHeader title="Recent swaps" className="mb-4" />
        <DataView>
            {swapTransfers.length > 0 ? (
              <div className="divide-y divide-border">
                {swapTransfers.map((swap) => (
                  <div key={swap.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info-muted">
                        <ArrowLeftRight className="h-4 w-4 text-info" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {(swap.source?.currency || "").toUpperCase()} → {(swap.destination?.currency || "").toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {formatDate(swap.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{swap.amount} {(swap.source?.currency || "").toUpperCase()}</p>
                      <Badge variant={swap.state === "completed" ? "success" : "warning"}>{swap.state}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DataState title="No swap history yet" description="Completed and pending swaps will appear here." />
            )}
        </DataView>
      </div>
    </div>
  );
}
