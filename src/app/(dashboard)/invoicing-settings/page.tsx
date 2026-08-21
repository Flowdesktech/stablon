"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  ErrorState,
  Field,
  LoadingState,
  PageHeading,
  SubmitButton,
  selectClassName,
} from "@/components/invoicing/invoice-ui";
import { TemplatePicker } from "@/components/invoicing/template-picker";
import {
  invoicingRequest,
  jsonBody,
  useInvoicingData,
} from "@/components/invoicing/api";
import type { InvoiceProfile } from "@/types/invoicing";

const EMPTY_PROFILE: Omit<InvoiceProfile, "id" | "ownerUid" | "createdAt" | "updatedAt"> = {
  name: "Business",
  company: "",
  displayName: "",
  email: "",
  phone: "",
  address: { street: "", street2: "", city: "", subdivision: "", postalCode: "", country: "USA" },
  logoUrl: "",
  isDefault: false,
  settings: {
    prefix: "INV",
    nextNumber: 1,
    taxRate: "0",
    currency: "USD",
    paymentTerms: "Due on receipt",
    dueDateDuration: 7,
    autoIncrementNumber: true,
    timezone: "UTC",
    templateId: "modern-blue",
  },
  settlement: {
    enabled: false,
    destinationType: "address",
    address: "",
    bridgeWalletId: "",
    paymentRail: "ethereum",
    currency: "usdc",
    developerFeePercent: "0",
    acceptedFiatRails: ["ach_push", "wire", "sepa", "faster_payments"],
    acceptedCryptoRails: ["ethereum", "base", "polygon", "solana", "tron"],
  },
};

function cloneProfile(
  profile: Omit<InvoiceProfile, "id" | "ownerUid" | "createdAt" | "updatedAt">
) {
  return structuredClone(profile);
}

export default function InvoicingSettingsPage() {
  const { data: profiles, error, isLoading, mutate } = useInvoicingData<InvoiceProfile[]>(
    "/api/invoicing/profiles",
    ["profiles"]
  );
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(cloneProfile(EMPTY_PROFILE));
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profiles?.length || selectedId || isNew) return;
    const first = profiles.find((profile) => profile.isDefault) || profiles[0];
    setSelectedId(first.id);
    setDraft(cloneProfile(first));
  }, [isNew, profiles, selectedId]);

  function chooseProfile(id: string) {
    const profile = profiles?.find((entry) => entry.id === id);
    if (!profile) return;
    setSelectedId(id);
    setIsNew(false);
    setDraft(cloneProfile(profile));
  }

  function newProfile() {
    setSelectedId("");
    setIsNew(true);
    setDraft(cloneProfile(EMPTY_PROFILE));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...draft,
        logoUrl: draft.logoUrl || "",
        phone: draft.phone || undefined,
        address: {
          ...draft.address,
          street2: draft.address.street2 || undefined,
          subdivision: draft.address.subdivision || undefined,
        },
        settlement: {
          ...draft.settlement,
          address: draft.settlement.address || undefined,
          bridgeWalletId: draft.settlement.bridgeWalletId || undefined,
        },
      };
      const saved = await invoicingRequest<InvoiceProfile>(
        isNew ? "/api/invoicing/profiles" : `/api/invoicing/profiles/${selectedId}`,
        { method: isNew ? "POST" : "PUT", ...jsonBody(payload) },
        ["profile"]
      );
      await mutate();
      setSelectedId(saved.id);
      setIsNew(false);
      setDraft(cloneProfile(saved));
      toast({ variant: "success", title: "Invoice settings saved" });
    } catch (saveError) {
      toast({
        variant: "error",
        title: "Settings not saved",
        description: saveError instanceof Error ? saveError.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <LoadingState rows={6} />;
  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;

  return (
    <form onSubmit={submit} className="space-y-6 animate-fade-in">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to account settings
      </Link>
      <PageHeading
        title="Invoicing settings"
        description="Manage business profiles, defaults, and where invoice payments settle."
        action={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={newProfile}>
              <Plus className="h-4 w-4" /> New profile
            </Button>
            <SubmitButton pending={saving}>
              <Save className="h-4 w-4" /> Save
            </SubmitButton>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4" role="group" aria-label="Invoice profiles">
          {(profiles || []).map((profile) => (
            <button
              type="button"
              key={profile.id}
              onClick={() => chooseProfile(profile.id)}
              aria-pressed={!isNew && selectedId === profile.id}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                !isNew && selectedId === profile.id
                  ? "border-primary bg-info-muted text-primary"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:bg-surface-subtle hover:text-foreground"
              }`}
            >
              {profile.name}{profile.isDefault ? " · Default" : ""}
            </button>
          ))}
          {isNew && (
            <span className="rounded-md border border-primary bg-info-muted px-3 py-2 text-sm font-medium text-primary">
              New profile
            </span>
          )}
          {!profiles?.length && !isNew && (
            <button
              type="button"
              onClick={newProfile}
              className="text-sm font-medium text-primary hover:underline"
            >
              Create your first invoice profile
            </button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Business profile</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Profile name"><Input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label="Company"><Input required value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} /></Field>
            <Field label="Display name"><Input required value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></Field>
            <Field label="Billing email"><Input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></Field>
            <Field label="Phone"><Input value={draft.phone || ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></Field>
            <Field label="Logo URL"><Input type="url" value={draft.logoUrl || ""} onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })} /></Field>
            <Field label="Street address" className="sm:col-span-2"><Input value={draft.address.street} onChange={(event) => setDraft({ ...draft, address: { ...draft.address, street: event.target.value } })} /></Field>
            <Field label="City"><Input value={draft.address.city} onChange={(event) => setDraft({ ...draft, address: { ...draft.address, city: event.target.value } })} /></Field>
            <Field label="State / region"><Input value={draft.address.subdivision || ""} onChange={(event) => setDraft({ ...draft, address: { ...draft.address, subdivision: event.target.value } })} /></Field>
            <Field label="Postal code"><Input value={draft.address.postalCode} onChange={(event) => setDraft({ ...draft, address: { ...draft.address, postalCode: event.target.value } })} /></Field>
            <Field label="Country code"><Input required minLength={3} maxLength={3} value={draft.address.country} onChange={(event) => setDraft({ ...draft, address: { ...draft.address, country: event.target.value.toUpperCase() } })} /></Field>
            <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
              <input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })} className="h-4 w-4 accent-primary" />
              Use this as my default invoice profile
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoice defaults</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice prefix"><Input required value={draft.settings.prefix} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, prefix: event.target.value.toUpperCase() } })} /></Field>
            <Field label="Next number"><Input required type="number" min="1" value={draft.settings.nextNumber} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, nextNumber: Number(event.target.value) } })} /></Field>
            <Field label="Currency"><Input required minLength={3} maxLength={3} value={draft.settings.currency} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, currency: event.target.value.toUpperCase() } })} /></Field>
            <Field label="Default tax %"><Input type="number" min="0" max="100" step="any" value={draft.settings.taxRate} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, taxRate: event.target.value } })} /></Field>
            <Field label="Days until due"><Input type="number" min="0" max="365" value={draft.settings.dueDateDuration} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, dueDateDuration: Number(event.target.value) } })} /></Field>
            <Field label="Timezone"><Input required value={draft.settings.timezone} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, timezone: event.target.value } })} /></Field>
            <Field label="Payment terms" className="sm:col-span-2"><Input value={draft.settings.paymentTerms} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, paymentTerms: event.target.value } })} /></Field>
            <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
              <input type="checkbox" checked={draft.settings.autoIncrementNumber} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, autoIncrementNumber: event.target.checked } })} className="h-4 w-4 accent-primary" />
              Automatically increment invoice numbers
            </label>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment settlement</CardTitle>
          <CardDescription>Required before a payment-enabled invoice can be published.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={draft.settlement.enabled} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, enabled: event.target.checked } })} className="h-4 w-4 accent-primary" />
            Enable invoice payment collection
          </label>
          <Field label="Destination type">
            <select className={selectClassName} value={draft.settlement.destinationType} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, destinationType: event.target.value as "bridge_wallet" | "address" } })}>
              <option value="address">Wallet address</option>
              <option value="bridge_wallet">Bridge wallet ID</option>
            </select>
          </Field>
          {draft.settlement.destinationType === "address" ? (
            <Field label="Destination address"><Input value={draft.settlement.address || ""} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, address: event.target.value } })} /></Field>
          ) : (
            <Field label="Bridge wallet ID"><Input value={draft.settlement.bridgeWalletId || ""} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, bridgeWalletId: event.target.value } })} /></Field>
          )}
          <Field label="Payment rail"><Input value={draft.settlement.paymentRail} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, paymentRail: event.target.value } })} /></Field>
          <Field label="Settlement currency"><Input value={draft.settlement.currency} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, currency: event.target.value.toLowerCase() } })} /></Field>
          <Field label="Processing fee %" hint="Optional; deducted by Bridge from settlement">
            <Input
              type="number"
              min="0"
              max="10"
              step="0.01"
              value={draft.settlement.developerFeePercent || "0"}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  settlement: {
                    ...draft.settlement,
                    developerFeePercent: event.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="Accepted fiat rails" hint="Comma-separated">
            <Input value={draft.settlement.acceptedFiatRails.join(", ")} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, acceptedFiatRails: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } })} />
          </Field>
          <Field label="Accepted crypto rails" hint="Comma-separated">
            <Input value={draft.settlement.acceptedCryptoRails.join(", ")} onChange={(event) => setDraft({ ...draft, settlement: { ...draft.settlement, acceptedCryptoRails: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Default template</CardTitle></CardHeader>
        <CardContent>
          <TemplatePicker value={draft.settings.templateId} onChange={(templateId) => setDraft({ ...draft, settings: { ...draft.settings, templateId } })} compact />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pending={saving}><Save className="h-4 w-4" /> Save settings</SubmitButton>
      </div>
    </form>
  );
}
