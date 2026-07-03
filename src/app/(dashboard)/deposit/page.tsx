"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVirtualAccounts, useWallets, createWallet } from "@/hooks/use-bridge";
import type { AppVirtualAccount, BridgeWallet } from "@/types/bridge";
import { formatPaymentRails, formatChainLabel } from "@/lib/bridge-chains";
import { CopyAllButton } from "@/components/copy-all-button";
import { buildAccountDetailsText } from "@/lib/account-details";
import {
  ArrowDownToLine,
  Landmark,
  Wallet,
  Copy,
  Check,
  Globe,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";

type DepositMethod = "fiat" | "crypto";

const fiatRails = [
  { id: "ach", name: "ACH", region: "United States", currency: "USD", speed: "1-2 days" },
  { id: "wire", name: "Wire Transfer", region: "United States", currency: "USD", speed: "Same day" },
  { id: "sepa", name: "SEPA", region: "Europe", currency: "EUR", speed: "1-2 days" },
  { id: "pix", name: "PIX", region: "Brazil", currency: "BRL", speed: "Instant" },
  { id: "spei", name: "SPEI", region: "Mexico", currency: "MXN", speed: "Instant" },
  { id: "fps", name: "Faster Payments", region: "United Kingdom", currency: "GBP", speed: "Instant" },
];

const cryptoChains = [
  { id: "ethereum", name: "Ethereum", tokens: ["USDC", "USDT", "DAI"] },
  { id: "solana", name: "Solana", tokens: ["USDC", "USDT"] },
  { id: "polygon", name: "Polygon", tokens: ["USDC", "USDT"] },
  { id: "arbitrum", name: "Arbitrum", tokens: ["USDC", "USDT"] },
  { id: "optimism", name: "Optimism", tokens: ["USDC"] },
  { id: "base", name: "Base", tokens: ["USDC"] },
  { id: "avalanche", name: "Avalanche", tokens: ["USDC", "USDT"] },
  { id: "stellar", name: "Stellar", tokens: ["USDC"] },
  { id: "tron", name: "Tron", tokens: ["USDT"] },
];

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/5">
      <div className="min-w-0">
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-sm text-white font-mono break-all">{value}</p>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/40" />}
      </button>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-xs text-white/80 text-right break-words">{value}</p>
    </div>
  );
}

function DepositSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35 pb-1">{title}</p>
      {children}
    </div>
  );
}

function FiatDepositDetails({ accounts, rail }: { accounts: AppVirtualAccount[]; rail: string }) {
  const isUsd = ["ach", "wire"].includes(rail);
  const matchCurrency = isUsd ? "usd" : rail === "sepa" ? "eur" : rail === "pix" ? "brl" : rail === "spei" ? "mxn" : "gbp";
  const account = accounts.find((a) => a.currency?.toLowerCase() === matchCurrency);
  const details = account?.account_details;

  if (!account || !details) {
    return (
      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-amber-300">
          No {matchCurrency.toUpperCase()} virtual account found. Create one in the Accounts page first, then come back to get deposit details.
        </p>
      </div>
    );
  }

  const railsLabel = formatPaymentRails(account.payment_rails);
  const dest = account.destination;

  return (
    <div className="space-y-3">
      <CopyAllButton text={buildAccountDetailsText(account)} className="w-full" />
      {railsLabel && <CopyField label="Payment rail(s)" value={railsLabel} />}
      {details.beneficiary_name && <CopyField label="Beneficiary name" value={details.beneficiary_name} />}
      {details.bank_name && <CopyField label="Bank name" value={details.bank_name} />}
      {details.routing_number && <CopyField label="Bank routing number" value={details.routing_number} />}
      {details.account_number && <CopyField label="Bank account number" value={details.account_number} />}
      {details.iban && <CopyField label="IBAN" value={details.iban} />}
      {details.bic && <CopyField label="BIC / SWIFT" value={details.bic} />}
      {details.clabe && <CopyField label="CLABE" value={details.clabe} />}
      {details.br_code && <CopyField label="PIX key" value={details.br_code} />}
      {details.beneficiary_address && <CopyField label="Beneficiary address" value={details.beneficiary_address} />}
      <CopyField label="Currency" value={account.currency.toUpperCase()} />

      {dest && (dest.address || dest.currency || dest.payment_rail) && (
        <DepositSection title="Destination details">
          {dest.payment_rail && <InfoLine label="Destination blockchain" value={formatChainLabel(dest.payment_rail)} />}
          {dest.currency && <InfoLine label="Destination currency" value={dest.currency.toUpperCase()} />}
          {dest.address && <CopyField label="Destination wallet address" value={dest.address} />}
        </DepositSection>
      )}

      <div className="mt-1 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-amber-300">
          Deposited funds will be automatically converted to stablecoins and credited to your Stablon balance.
        </p>
      </div>
    </div>
  );
}

function CryptoDepositDetails({
  chainData,
  wallet,
  walletsError,
}: {
  chainData: { id: string; name: string; tokens: string[] };
  wallet: BridgeWallet | undefined;
  walletsError: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      await createWallet(chainData.id);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Couldn't create wallet.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deposit Address</CardTitle>
        <CardDescription>Send {chainData.tokens.join(" or ")} to this address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {wallet ? (
          <>
            <CopyField label={`${chainData.name} Address`} value={wallet.address} />
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-300">
                Only send supported tokens on the selected network. Sending other assets may result in permanent loss.
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/5">
              <p className="text-sm text-white/70">
                You don&apos;t have a {chainData.name} deposit wallet yet.
              </p>
              <p className="text-xs text-white/40 mt-1">
                Generate one to get a permanent on-chain address for receiving {chainData.tokens.join(" / ")}.
              </p>
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <><Plus className="w-4 h-4" /> Generate {chainData.name} address</>
              )}
            </Button>
            {(genError || walletsError) && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-xs text-red-300">
                  {genError ||
                    "We couldn't load your wallets from Bridge. Your account may need additional approval to create custodial wallets — contact your Bridge representative."}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DepositPage() {
  const [method, setMethod] = useState<DepositMethod>("fiat");
  const [selectedRail, setSelectedRail] = useState<string | null>("ach");
  const [selectedChain, setSelectedChain] = useState<string | null>("ethereum");
  const { accounts } = useVirtualAccounts();
  const { wallets, error: walletsError } = useWallets();

  const walletForChain = (chainId: string) => {
    const network = chainId.toLowerCase();
    return (wallets as BridgeWallet[]).find((w) => w.network?.toLowerCase() === network);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit Funds</h1>
        <p className="text-white/50 mt-1">Add money via bank transfer or crypto deposit</p>
      </div>

      <div className="flex gap-3">
        <Button
          variant={method === "fiat" ? "default" : "outline"}
          onClick={() => { setMethod("fiat"); setSelectedRail("ach"); }}
          className="flex-1 sm:flex-none"
        >
          <Landmark className="w-4 h-4" /> Bank Transfer
        </Button>
        <Button
          variant={method === "crypto" ? "default" : "outline"}
          onClick={() => { setMethod("crypto"); setSelectedChain("ethereum"); }}
          className="flex-1 sm:flex-none"
        >
          <Wallet className="w-4 h-4" /> On-Chain
        </Button>
      </div>

      {method === "fiat" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-white/60">Select Payment Rail</h2>
            {fiatRails.map((rail) => (
              <button
                key={rail.id}
                onClick={() => setSelectedRail(rail.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedRail === rail.id ? "border-purple-500/50 bg-purple-500/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-white/50" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{rail.name}</p>
                    <p className="text-xs text-white/40">{rail.region} &middot; {rail.currency}</p>
                  </div>
                </div>
                <Badge variant="secondary">{rail.speed}</Badge>
              </button>
            ))}
          </div>
          <div>
            {selectedRail ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Deposit Instructions</CardTitle>
                  <CardDescription>Send funds to the following account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <FiatDepositDetails accounts={accounts as AppVirtualAccount[]} rail={selectedRail} />
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-white/10">
                <div className="text-center">
                  <ArrowDownToLine className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/40">Select a payment rail to see deposit instructions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {method === "crypto" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-white/60">Select Blockchain</h2>
            {cryptoChains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedChain === chain.id ? "border-purple-500/50 bg-purple-500/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-white/60">
                    {chain.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{chain.name}</p>
                    <p className="text-xs text-white/40">{chain.tokens.join(", ")}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </button>
            ))}
          </div>
          <div>
            {selectedChain ? (
              <CryptoDepositDetails
                key={selectedChain}
                chainData={cryptoChains.find((c) => c.id === selectedChain)!}
                wallet={walletForChain(selectedChain)}
                walletsError={Boolean(walletsError)}
              />
            ) : (
              <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-white/10">
                <div className="text-center">
                  <Wallet className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/40">Select a blockchain to see your deposit address</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
