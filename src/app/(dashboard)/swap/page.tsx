"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  Loader2,
  Inbox,
} from "lucide-react";

// Bridge's exchange-rates API only quotes these pairs: USD ↔ BRL, COP, EUR,
// GBP, MXN, USDT. Of those we surface the ones this app supports (MXN/BRL were
// removed). Crypto like USDC/USDB is NOT directly convertible to fiat here, so
// we only list currencies that have a real rate.
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
    return !["ach", "wire", "sepa", "pix", "spei"].some((r) => src.includes(r) || dst.includes(r));
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
      <div>
        <h1 className="text-2xl font-bold text-white">Swap</h1>
        <p className="text-white/50 mt-1">
          Convert between supported currencies instantly.{" "}
          <span className="text-white/70">Available pairs: USD ↔ EUR, USD ↔ GBP, USD ↔ USDT.</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6 space-y-2">
              {/* From */}
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">You pay</span>
                  <span className="text-xs text-white/40">Balance: {fromCurrencyData.balance}</span>
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
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <span className="text-sm font-medium text-white">{fromCurrencyData.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                    </button>
                    {showFromPicker && (
                      <div className="absolute top-full right-0 mt-2 w-48 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl z-10 py-1">
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
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-white/40 ml-2">{c.fullName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {fromAmount && (
                  <button
                    onClick={() => setFromAmount(fromCurrencyData.balance.replace(/,/g, ""))}
                    className="text-xs text-purple-400 hover:underline mt-1 cursor-pointer"
                  >
                    Use Max
                  </button>
                )}
                {insufficientBalance && (
                  <p className="text-xs text-red-400 mt-1">
                    Insufficient {fromCurrencyData.name} balance (available: {fromCurrencyData.balance}).
                  </p>
                )}
              </div>

              <div className="flex justify-center -my-1 relative z-10">
                <button
                  onClick={flipCurrencies}
                  className="w-10 h-10 rounded-xl bg-[#1a1a2e] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* To */}
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">You receive</span>
                  <span className="text-xs text-white/40">Balance: {toCurrencyData.balance}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-white flex-1">
                    {toAmount || <span className="text-white/20">0.00</span>}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => { setShowToPicker(!showToPicker); setShowFromPicker(false); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <span className="text-sm font-medium text-white">{toCurrencyData.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                    </button>
                    {showToPicker && (
                      <div className="absolute top-full right-0 mt-2 w-48 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl z-10 py-1">
                        {toOptions.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setToCurrency(c.id); setShowToPicker(false); }}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-white/40 ml-2">{c.fullName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {pairUnsupported && fromCurrency !== toCurrency && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-300">
                    This pair isn't available to swap right now ({fromCurrencyData.name} → {toCurrencyData.name}). Try a different currency.
                  </p>
                </div>
              )}

              {fromAmount && rateValue && !pairUnsupported && (
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <RefreshCw className="w-3 h-3" />
                    1 {fromCurrencyData.name} = {rateValue.toFixed(4)} {toCurrencyData.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Zap className="w-3 h-3" /> Instant
                  </div>
                </div>
              )}

              {swapped ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">Swap Complete</p>
                    <p className="text-xs text-emerald-300/60">
                      Converted {fromAmount} {fromCurrencyData.name} to {toAmount} {toCurrencyData.name}
                    </p>
                  </div>
                </div>
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
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Exchange Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rateValue ? (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{fromCurrencyData.name} / {toCurrencyData.name}</span>
                  <span className="text-white font-mono">{rateValue.toFixed(4)}</span>
                </div>
              ) : pairUnsupported ? (
                <p className="text-xs text-amber-300/80">
                  {fromCurrencyData.name} → {toCurrencyData.name} isn't a supported swap pair.
                </p>
              ) : (
                <p className="text-xs text-white/40">Select currencies to see live rate</p>
              )}
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">
                  Supported pairs
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SWAP_PAIRS.map(([a, b]) => (
                    <span
                      key={`${a}-${b}`}
                      className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/60"
                    >
                      {CURRENCY_META[a].name} ↔ {CURRENCY_META[b].name}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-white/30 mt-2">Rates update every ~30 seconds</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Instant Swaps</p>
                  <p className="text-xs text-white/40 mt-1">
                    Swaps between supported pairs are settled instantly. No slippage, no complexity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Swaps</h2>
        <Card>
          <CardContent className="p-0">
            {swapTransfers.length > 0 ? (
              <div className="divide-y divide-white/5">
                {swapTransfers.map((swap) => (
                  <div key={swap.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <ArrowLeftRight className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {(swap.source?.currency || "").toUpperCase()} → {(swap.destination?.currency || "").toUpperCase()}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                          <Clock className="w-3 h-3" /> {formatDate(swap.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/50">{swap.amount} {(swap.source?.currency || "").toUpperCase()}</p>
                      <Badge variant={swap.state === "completed" ? "success" : "warning"}>{swap.state}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center gap-3 text-center">
                <Inbox className="w-8 h-8 text-white/20" />
                <p className="text-sm text-white/40">No swap history yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
