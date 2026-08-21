"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { PageHeader } from "@/components/ui/page";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useVirtualAccounts, useWallets, createWallet } from "@/hooks/use-bridge";
import type { AppVirtualAccount, BridgeWallet } from "@/types/bridge";
import { formatPaymentRails, formatChainLabel } from "@/lib/bridge-chains";
import { CopyAllButton } from "@/components/copy-all-button";
import { buildAccountDetailsText } from "@/lib/account-details";
import {
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
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-muted px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-all font-mono text-sm text-foreground">{value}</p>
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        type="button"
        aria-label={`Copy ${label.toLowerCase()}`}
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-right text-xs text-foreground">{value}</p>
    </div>
  );
}

function DepositSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted px-3 py-2">
      <p className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function FiatDepositDetails({ accounts, rail }: { accounts: AppVirtualAccount[]; rail: string }) {
  const isUsd = ["ach", "wire"].includes(rail);
  const matchCurrency = isUsd ? "usd" : rail === "sepa" ? "eur" : "gbp";
  const account = accounts.find((a) => a.currency?.toLowerCase() === matchCurrency);
  const details = account?.account_details;

  if (!account || !details) {
    return (
      <Alert
        variant="warning"
        title={`No ${matchCurrency.toUpperCase()} account found`}
        description="Create one from Accounts, then return to view deposit details."
      />
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
      {details.beneficiary_address && <CopyField label="Beneficiary address" value={details.beneficiary_address} />}
      <CopyField label="Currency" value={account.currency.toUpperCase()} />

      {dest && (dest.address || dest.currency || dest.payment_rail) && (
        <DepositSection title="Destination details">
          {dest.payment_rail && <InfoLine label="Destination blockchain" value={formatChainLabel(dest.payment_rail)} />}
          {dest.currency && <InfoLine label="Destination currency" value={dest.currency.toUpperCase()} />}
          {dest.address && <CopyField label="Destination wallet address" value={dest.address} />}
        </DepositSection>
      )}

      <Alert
        variant="warning"
        title="Automatic conversion"
        description="Deposited funds will be converted to stablecoins and credited to your balance."
      />
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
            <Alert
              variant="warning"
              title="Use the selected network"
              description="Only send supported tokens on this network. Other assets may be permanently lost."
            />
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-surface-muted p-4">
              <p className="text-sm text-foreground">
                You don&apos;t have a {chainData.name} deposit wallet yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
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
              <Alert
                variant="danger"
                title="Deposit address unavailable"
                description={genError || "We couldn't load your wallets. Your account may require additional approval."}
              />
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
      <PageHeader title="Deposit funds" description="Add money by bank transfer or on-chain deposit." />

      <SegmentedControl
        label="Deposit method"
        value={method}
        onChange={(value) => {
          const next = value as DepositMethod;
          setMethod(next);
          if (next === "fiat") setSelectedRail("ach");
          else setSelectedChain("ethereum");
        }}
        options={[
          { value: "fiat", label: "Bank transfer", icon: <Landmark className="h-4 w-4" /> },
          { value: "crypto", label: "On-chain", icon: <Wallet className="h-4 w-4" /> },
        ]}
        className="w-full sm:w-auto"
      />

      {method === "fiat" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Select payment rail</h2>
            {fiatRails.map((rail) => (
              <button
                key={rail.id}
                onClick={() => setSelectedRail(rail.id)}
                className={`flex w-full items-center justify-between rounded-md border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  selectedRail === rail.id ? "border-primary bg-info-muted" : "border-border bg-surface hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-subtle">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{rail.name}</p>
                    <p className="text-xs text-muted-foreground">{rail.region} &middot; {rail.currency}</p>
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
              <DataView className="border-dashed shadow-none">
                <DataState title="Select a payment rail" description="Deposit instructions will appear here." />
              </DataView>
            )}
          </div>
        </div>
      )}

      {method === "crypto" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">Select blockchain</h2>
            {cryptoChains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`flex w-full items-center justify-between rounded-md border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  selectedChain === chain.id ? "border-primary bg-info-muted" : "border-border bg-surface hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-subtle text-sm font-semibold text-muted-foreground">
                    {chain.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{chain.name}</p>
                    <p className="text-xs text-muted-foreground">{chain.tokens.join(", ")}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
              <DataView className="border-dashed shadow-none">
                <DataState title="Select a blockchain" description="Your deposit address will appear here." />
              </DataView>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
