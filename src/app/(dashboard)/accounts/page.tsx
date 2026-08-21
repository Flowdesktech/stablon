"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import {
  DESTINATION_CHAINS,
  getChain,
  formatPaymentRails,
  formatChainLabel,
} from "@/lib/bridge-chains";
import {
  useVirtualAccounts,
  createVirtualAccount,
  updateVirtualAccountDestination,
  requestVirtualAccountFeeInvoice,
  FeeRequiredError,
} from "@/hooks/use-bridge";
import { toast } from "@/components/ui/toast";
import { useProfile } from "@/hooks/use-profile";
import { useSearchParams } from "next/navigation";
import { CopyAllButton } from "@/components/copy-all-button";
import { buildAccountDetailsText } from "@/lib/account-details";
import type { AppVirtualAccount } from "@/types/bridge";
import {
  Landmark,
  Plus,
  Copy,
  Check,
  Globe,
  DollarSign,
  Euro,
  PoundSterling,
  Loader2,
  Wallet,
  Pencil,
  X,
} from "lucide-react";

// One-time setup fee (USD) charged before the first virtual account is created.
// Shown prominently so the payment step isn't a surprise. Keep in sync with the
// server's VIRTUAL_ACCOUNT_FEE_USD.
const FEE_USD = process.env.NEXT_PUBLIC_VIRTUAL_ACCOUNT_FEE_USD || "10";
// Ongoing deposit processing fee (%), mirrored from BRIDGE_DEVELOPER_FEE_PERCENT.
const DEPOSIT_FEE_PERCENT = process.env.NEXT_PUBLIC_BRIDGE_DEVELOPER_FEE_PERCENT || "1";

// Prominent notice explaining the one-time setup fee, so users understand why
// they're asked to pay (via crypto) before their first account is created.
function FeeNotice() {
  return (
    <Alert
      variant="info"
      title={`One-time $${FEE_USD} setup fee`}
      description={
        <>
          Issuing a dedicated bank account carries a real provisioning cost, so we charge a{" "}
          <span className="font-medium text-foreground">one-time ${FEE_USD} fee</span>&nbsp; before your first
          account is created. It&apos;s paid in crypto (USDC, USDT, and more) via our payment partner,
          covers all your future accounts, and is separate from the {DEPOSIT_FEE_PERCENT}% processing on deposits.
        </>
      }
    />
  );
}

// Fiat currencies Bridge can issue virtual accounts for, with their local rail.
const FIAT_CURRENCIES = [
  { id: "usd", label: "USD", rail: "ACH / Wire", icon: DollarSign, color: "text-success" },
  { id: "eur", label: "EUR", rail: "SEPA", icon: Euro, color: "text-info" },
  { id: "gbp", label: "GBP", rail: "Faster Payments", icon: PoundSterling, color: "text-primary" },
];

function getFiat(currency: string | undefined) {
  return FIAT_CURRENCIES.find((f) => f.id === (currency || "").toLowerCase());
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      type="button"
      aria-label="Copy value"
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface-muted px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-all font-mono text-sm text-foreground">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-right text-xs text-foreground">{value}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function AccountCard({ account }: { account: AppVirtualAccount }) {
  const details = account.account_details || {};
  const fiat = getFiat(account.currency);
  const CurrencyIcon = fiat?.icon ?? DollarSign;
  const railsLabel = formatPaymentRails(account.payment_rails);
  const dest = account.destination;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialChain =
    dest?.payment_rail && getChain(dest.payment_rail)
      ? dest.payment_rail
      : DESTINATION_CHAINS[0].id;
  const [chainId, setChainId] = useState(initialChain);
  const [coin, setCoin] = useState(
    dest?.currency?.toLowerCase() || getChain(initialChain)!.coins[0]
  );
  const [address, setAddress] = useState(dest?.address ?? "");

  const editChain = getChain(chainId) ?? DESTINATION_CHAINS[0];

  function handleChainChange(id: string) {
    setChainId(id);
    const next = getChain(id);
    if (next && !next.coins.includes(coin)) setCoin(next.coins[0]);
  }

  function startEdit() {
    setChainId(initialChain);
    setCoin(dest?.currency?.toLowerCase() || getChain(initialChain)!.coins[0]);
    setAddress(dest?.address ?? "");
    setEditing(true);
  }

  async function handleSave() {
    if (!address.trim() || saving) return;
    setSaving(true);
    try {
      await updateVirtualAccountDestination({
        id: account.id,
        destinationAddress: address,
        destinationNetwork: chainId,
        destinationCurrency: coin,
      });
      setEditing(false);
    } catch {
      // Errors surfaced via toast in the hook.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-subtle">
              <CurrencyIcon className={`h-5 w-5 ${fiat?.color ?? "text-muted-foreground"}`} />
            </div>
            <div>
              <CardTitle className="text-base">{account.currency?.toUpperCase()} Account</CardTitle>
              <p className="text-xs text-muted-foreground">{railsLabel || fiat?.rail || "Bank transfer"}</p>
            </div>
          </div>
          <Badge variant={account.status === "active" ? "success" : "secondary"}>
            {account.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {details.bank_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Landmark className="w-3.5 h-3.5" />
            {details.bank_name}
          </div>
        )}
        {details.beneficiary_name && <DetailRow label="Beneficiary name" value={details.beneficiary_name} />}
        {details.account_number && <DetailRow label="Account number" value={details.account_number} />}
        {details.routing_number && <DetailRow label="Routing number" value={details.routing_number} />}
        {details.iban && <DetailRow label="IBAN" value={details.iban} />}
        {details.bic && <DetailRow label="BIC / SWIFT" value={details.bic} />}
        {details.beneficiary_address && <DetailRow label="Beneficiary address" value={details.beneficiary_address} />}

        <CopyAllButton text={buildAccountDetailsText(account)} className="w-full" />

        {/* Destination */}
        <div className="rounded-md border border-border bg-surface-muted px-3 py-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Destination details</SectionLabel>
            {!editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1 text-xs text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Chain">
                  <Select
                    value={chainId}
                    onChange={(e) => handleChainChange(e.target.value)}
                  >
                    {DESTINATION_CHAINS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Coin">
                  <Select
                    value={coin}
                    onChange={(e) => setCoin(e.target.value)}
                  >
                    {editChain.coins.map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Wallet address">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={editChain.addressHint}
                  className="font-mono text-xs"
                />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={!address.trim() || saving} onClick={handleSave}>
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Check className="w-3.5 h-3.5" /> Save</>}
                </Button>
                <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
              </div>
            </div>
          ) : dest && (dest.address || dest.currency || dest.payment_rail) ? (
            <>
              {dest.payment_rail && <InfoRow label="Blockchain" value={formatChainLabel(dest.payment_rail)} />}
              {dest.currency && <InfoRow label="Currency" value={dest.currency.toUpperCase()} />}
              {dest.address && (
                <div className="flex items-center justify-between gap-2 pt-1.5">
                  <div className="min-w-0 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className="break-all font-mono text-xs text-foreground">{dest.address}</p>
                  </div>
                  <CopyButton text={dest.address} />
                </div>
              )}
            </>
          ) : (
            <p className="pt-1.5 text-xs text-muted-foreground">No destination set. Select Edit to add one.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountsPage() {
  const { accounts, isLoading, mutate } = useVirtualAccounts();
  const { profile } = useProfile();
  const feePaid = Boolean(profile?.vaFeePaid);
  const searchParams = useSearchParams();
  const paidParam = searchParams.get("paid");
  const cancelledParam = searchParams.get("payment");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fiatCurrency, setFiatCurrency] = useState("usd");
  const [chainId, setChainId] = useState(DESTINATION_CHAINS[0].id);
  const [coin, setCoin] = useState(DESTINATION_CHAINS[0].coins[0]);
  const [destinationAddress, setDestinationAddress] = useState("");

  const selectedChain = getChain(chainId) ?? DESTINATION_CHAINS[0];

  function handleChainChange(id: string) {
    setChainId(id);
    const next = getChain(id);
    // Reset coin to a value the newly selected chain actually supports.
    if (next && !next.coins.includes(coin)) setCoin(next.coins[0]);
  }

  async function handleCreate() {
    if (!destinationAddress.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createVirtualAccount({
        currency: fiatCurrency,
        destinationAddress,
        destinationNetwork: chainId,
        destinationCurrency: coin,
      });
      setCreating(false);
      setDestinationAddress("");
    } catch (err) {
      if (err instanceof FeeRequiredError) {
        // Setup fee not paid yet: send the user to the NOWPayments invoice.
        try {
          const invoiceUrl = await requestVirtualAccountFeeInvoice();
          if (invoiceUrl) {
            window.location.href = invoiceUrl;
            return;
          }
        } catch (payErr) {
          toast({
            variant: "error",
            title: "Couldn't start the payment",
            description: payErr instanceof Error ? payErr.message : "Please try again.",
          });
        }
      }
      // Other errors are surfaced via toast in the hook.
    } finally {
      setSubmitting(false);
      mutate();
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Global accounts"
        description="Manage USD, EUR, and GBP accounts for receiving payments."
        actions={
          <Button onClick={() => setCreating(!creating)}>
            <Plus className="h-4 w-4" /> New account
          </Button>
        }
      />

      {paidParam === "1" && (
        <Alert variant="success" title="Payment received" description="Once it confirms on-chain, you can create your account. Try again in a moment." />
      )}
      {cancelledParam === "cancelled" && (
        <Alert variant="warning" title="Payment cancelled" description={`A one-time $${FEE_USD} setup fee is required to create your first virtual account. You can retry below.`} />
      )}

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>Create Virtual Account</CardTitle>
            <CardDescription>
              Incoming fiat is auto-converted to your chosen stablecoin and sent on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Fiat account currency */}
            <Field label="Account currency">
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {FIAT_CURRENCIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFiatCurrency(c.id)}
                    className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                      fiatCurrency === c.id
                        ? "border-primary bg-info-muted text-foreground"
                        : "border-border bg-surface text-muted-foreground hover:bg-surface-muted"
                    }`}
                  >
                    <c.icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{c.label}</span>
                    <span className="text-[10px] text-muted-foreground">{c.rail}</span>
                  </button>
                ))}
              </div>
            </Field>

            {/* Destination chain + coin */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Destination chain">
                <Select
                  value={chainId}
                  onChange={(e) => handleChainChange(e.target.value)}
                >
                  {DESTINATION_CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Stablecoin">
                <Select
                  value={coin}
                  onChange={(e) => setCoin(e.target.value)}
                >
                  {selectedChain.coins.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Destination address */}
            <Field
              label="Destination wallet address"
              hint={`${coin.toUpperCase()} on ${selectedChain.label} will be delivered to this address.`}
            >
              <Input
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder={selectedChain.addressHint}
                className="font-mono text-sm"
              />
            </Field>

            {!feePaid && <FeeNotice />}

            <Button
              className="w-full"
              disabled={!destinationAddress.trim() || submitting}
              onClick={handleCreate}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {feePaid ? "Creating…" : "Redirecting to payment…"}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> {feePaid ? `Create ${fiatCurrency.toUpperCase()} Account` : `Pay $${FEE_USD} & Create Account`}
                </>
              )}
            </Button>
            {!feePaid && (
              <p className="text-center text-[11px] text-muted-foreground">
                You&apos;ll be redirected to our secure crypto checkout to complete the one-time payment.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <DataView><DataState kind="loading" title="Loading accounts" /></DataView>
      ) : (accounts as AppVirtualAccount[]).length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {(accounts as AppVirtualAccount[]).map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      ) : creating ? null : (
        <DataView>
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-subtle">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No accounts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a USD, EUR, or GBP virtual account to receive payments.</p>
            </div>
            {!feePaid && (
              <div className="w-full max-w-md text-left">
                <FeeNotice />
              </div>
            )}
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Create account
            </Button>
          </div>
        </DataView>
      )}
    </div>
  );
}
