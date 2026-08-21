"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  ErrorState,
  Field,
  LoadingState,
  PageHeading,
  SubmitButton,
  formatInvoiceMoney,
  selectClassName,
} from "@/components/invoicing/invoice-ui";
import {
  LineItemEditor,
  type EditableLineItem,
} from "@/components/invoicing/line-item-editor";
import { TemplatePicker } from "@/components/invoicing/template-picker";
import {
  invoicingRequest,
  jsonBody,
  useInvoicingData,
} from "@/components/invoicing/api";
import type {
  Invoice,
  InvoiceClient,
  InvoiceProfile,
  InvoiceTotals,
} from "@/types/invoicing";

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function InvoiceForm({
  invoice,
  initialTemplateId,
}: {
  invoice?: Invoice;
  initialTemplateId?: string;
}) {
  const router = useRouter();
  const editing = Boolean(invoice);
  const { data: profiles, error: profilesError, isLoading: profilesLoading } =
    useInvoicingData<InvoiceProfile[]>("/api/invoicing/profiles", ["profiles"]);
  const { data: clients, error: clientsError, isLoading: clientsLoading } =
    useInvoicingData<InvoiceClient[]>("/api/invoicing/clients", ["clients"]);

  const [profileId, setProfileId] = useState(invoice?.profileId || "");
  const [clientId, setClientId] = useState(invoice?.clientId || "");
  const [issueDate, setIssueDate] = useState(invoice?.issueDate || dateValue(new Date()));
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate || dateValue(addDays(new Date(), 7))
  );
  const [currency, setCurrency] = useState(invoice?.currency || "USD");
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(
    invoice?.lineItems.map(({ id, description, quantity, rate }) => ({
      id,
      description,
      quantity,
      rate,
    })) || [{ description: "", quantity: "1", rate: "0" }]
  );
  const [taxRate, setTaxRate] = useState(invoice?.totals.taxRate || "0");
  const [discountType, setDiscountType] = useState<InvoiceTotals["discountType"]>(
    invoice?.totals.discountType || "none"
  );
  const [discountValue, setDiscountValue] = useState(
    invoice?.totals.discountValue || "0"
  );
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [paymentTerms, setPaymentTerms] = useState(
    invoice?.paymentTerms || "Due on receipt"
  );
  const [templateId, setTemplateId] = useState(
    invoice?.templateId || initialTemplateId || "modern-blue"
  );
  const [saving, setSaving] = useState(false);

  const selectedProfile = profiles?.find((profile) => profile.id === profileId);
  const filteredClients = useMemo(
    () => (clients || []).filter((client) => client.profileId === profileId),
    [clients, profileId]
  );

  useEffect(() => {
    if (profileId || !profiles?.length) return;
    const profile = profiles.find((entry) => entry.isDefault) || profiles[0];
    setProfileId(profile.id);
    setCurrency(profile.settings.currency);
    setTaxRate(profile.settings.taxRate);
    setPaymentTerms(profile.settings.paymentTerms);
    if (!initialTemplateId) setTemplateId(profile.settings.templateId);
    setDueDate(dateValue(addDays(new Date(issueDate), profile.settings.dueDateDuration)));
  }, [profiles, profileId, issueDate, initialTemplateId]);

  useEffect(() => {
    if (!clientId || filteredClients.some((client) => client.id === clientId)) return;
    setClientId("");
  }, [clientId, filteredClients]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      0
    );
    const requestedDiscount = Math.max(Number(discountValue) || 0, 0);
    const discount =
      discountType === "percent"
        ? subtotal * Math.min(requestedDiscount, 100) / 100
        : discountType === "fixed"
          ? Math.min(requestedDiscount, subtotal)
          : 0;
    const taxable = Math.max(subtotal - discount, 0);
    const tax = taxable * Math.max(Number(taxRate) || 0, 0) / 100;
    return { subtotal, discount, tax, total: taxable + tax };
  }, [discountType, discountValue, lineItems, taxRate]);

  function changeProfile(nextId: string) {
    setProfileId(nextId);
    setClientId("");
    const next = profiles?.find((profile) => profile.id === nextId);
    if (!next) return;
    setCurrency(next.settings.currency);
    setTaxRate(next.settings.taxRate);
    setPaymentTerms(next.settings.paymentTerms);
    setTemplateId(next.settings.templateId);
    setDueDate(dateValue(addDays(new Date(issueDate), next.settings.dueDateDuration)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!profileId || !clientId) {
      toast({
        variant: "error",
        title: "Choose a profile and client",
        description: "Both are required before you can save an invoice.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        profileId,
        clientId,
        issueDate,
        dueDate,
        currency,
        lineItems: lineItems.map(({ id, description, quantity, rate }) => ({
          ...(id ? { id } : {}),
          description,
          quantity,
          rate,
        })),
        taxRate,
        discountType,
        discountValue: discountType === "none" ? "0" : discountValue,
        notes,
        paymentTerms,
        templateId,
      };
      const saved = await invoicingRequest<Invoice>(
        editing ? `/api/invoicing/invoices/${invoice!.id}` : "/api/invoicing/invoices",
        {
          method: editing ? "PUT" : "POST",
          ...jsonBody(payload),
        },
        ["invoice"]
      );
      toast({
        variant: "success",
        title: editing ? "Invoice updated" : "Invoice created",
        description: `${saved.formattedNumber || "Your draft"} is ready.`,
      });
      router.push(`/invoices/${saved.id}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "error",
        title: "Invoice not saved",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (profilesLoading || clientsLoading) return <LoadingState rows={6} />;
  if (profilesError || clientsError) {
    return <ErrorState message={(profilesError || clientsError)?.message} />;
  }

  if (!profiles?.length) {
    return (
      <ErrorState message="Create an invoice profile in invoicing settings before making an invoice." />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 animate-fade-in">
      <Link
        href={editing ? `/invoices/${invoice!.id}` : "/invoices"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {editing ? "invoice" : "invoices"}
      </Link>
      <PageHeading
        title={editing ? `Edit ${invoice!.formattedNumber}` : "Create invoice"}
        description={
          editing
            ? "Update this draft invoice before publishing it."
            : "Build a detailed invoice, review the total, then save it as a draft."
        }
        action={
          <div className="flex gap-2">
            <Button asChild type="button" variant="outline">
              <Link href="/invoicing-settings">Invoice settings</Link>
            </Button>
            <SubmitButton pending={saving}>
              <FileCheck2 className="h-4 w-4" />
              {editing ? "Save changes" : "Save draft"}
            </SubmitButton>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Invoice details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Business profile">
                <select
                  value={profileId}
                  disabled={editing}
                  onChange={(event) => changeProfile(event.target.value)}
                  className={selectClassName}
                  required
                >
                  {profiles.map((profile) => (
                    <option value={profile.id} key={profile.id}>
                      {profile.name} · {profile.company}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bill to">
                <select
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className={selectClassName}
                  required
                >
                  <option value="">Choose a client</option>
                  {filteredClients.map((client) => (
                    <option value={client.id} key={client.id}>
                      {client.name}{client.company ? ` · ${client.company}` : ""}
                    </option>
                  ))}
                </select>
                {!filteredClients.length && (
                  <Link href="/clients" className="block text-xs text-primary hover:underline">
                    Add a client to this profile
                  </Link>
                )}
              </Field>
              <Field label="Issue date">
                <Input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  required
                  min={issueDate}
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </Field>
              <Field label="Currency">
                <Input
                  required
                  minLength={3}
                  maxLength={3}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Payment terms">
                <Input
                  required
                  value={paymentTerms}
                  onChange={(event) => setPaymentTerms(event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
            <CardContent>
              <LineItemEditor items={lineItems} currency={currency} onChange={setLineItems} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Taxes and discount</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Discount type">
                <select
                  value={discountType}
                  onChange={(event) =>
                    setDiscountType(event.target.value as InvoiceTotals["discountType"])
                  }
                  className={selectClassName}
                >
                  <option value="none">No discount</option>
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </Field>
              <Field label={discountType === "percent" ? "Discount %" : "Discount amount"}>
                <Input
                  type="number"
                  min="0"
                  max={discountType === "percent" ? "100" : undefined}
                  step="any"
                  disabled={discountType === "none"}
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                />
              </Field>
              <Field label="Tax rate %">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Thank your client or add payment instructions."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template</CardTitle>
              <p className="text-sm text-muted-foreground">Choose one of 15 invoice designs.</p>
            </CardHeader>
            <CardContent>
              <TemplatePicker value={templateId} onChange={setTemplateId} compact />
            </CardContent>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle>Invoice summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedProfile?.company || "Your business"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span><span>{formatInvoiceMoney(totals.subtotal, currency)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount</span><span>-{formatInvoiceMoney(totals.discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({Number(taxRate) || 0}%)</span>
                <span>{formatInvoiceMoney(totals.tax, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-lg font-semibold tabular-nums text-foreground">
                <span>Total</span><span>{formatInvoiceMoney(totals.total, currency)}</span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                The server validates and recalculates all monetary values when saved.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}
