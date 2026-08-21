"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { ArrowLeft, Edit3, Eye, FileCheck2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { InvoicePreview } from "@/components/invoicing/invoice-preview";
import { ClientDialog } from "@/components/invoicing/client-dialog";
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
import type { RenderableInvoice } from "@/lib/invoicing/renderable";
import type { InvoiceFit } from "@/lib/invoicing/page-fit";

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
  const { data: clients, error: clientsError, isLoading: clientsLoading, mutate: mutateClients } =
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pageFit, setPageFit] = useState<InvoiceFit | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientDialogClient, setClientDialogClient] = useState<InvoiceClient | null>(null);

  const selectedProfile = profiles?.find((profile) => profile.id === profileId);
  const selectedClient = clients?.find((client) => client.id === clientId);
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

  const previewInvoice = useMemo<RenderableInvoice>(() => {
    const amount = (value: number) => (Number.isFinite(value) ? value : 0).toFixed(2);
    const fallbackAddress = {
      street: "",
      city: "",
      postalCode: "",
      country: "",
    };

    return {
      formattedNumber:
        invoice?.formattedNumber ||
        `${selectedProfile?.settings.prefix || "INV"}-PREVIEW`,
      issueDate,
      dueDate,
      currency,
      lineItems: lineItems.map((item, index) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        return {
          id: item.id || `preview-${index}`,
          description: item.description.trim() || "Service or product",
          quantity: item.quantity || "0",
          rate: item.rate || "0",
          amount: amount(quantity * rate),
        };
      }),
      totals: {
        subtotal: amount(totals.subtotal),
        discountType,
        discountValue: discountType === "none" ? "0" : discountValue,
        discountAmount: amount(totals.discount),
        taxableAmount: amount(Math.max(totals.subtotal - totals.discount, 0)),
        taxRate,
        taxAmount: amount(totals.tax),
        total: amount(totals.total),
      },
      notes,
      paymentTerms,
      templateId,
      sender: selectedProfile
        ? {
            profileId: selectedProfile.id,
            displayName: selectedProfile.displayName,
            company: selectedProfile.company,
            email: selectedProfile.email,
            phone: selectedProfile.phone,
            address: selectedProfile.address,
            logoUrl: selectedProfile.logoUrl,
          }
        : {
            profileId: "preview",
            displayName: "Your name",
            company: "Your business",
            email: "you@example.com",
            address: fallbackAddress,
          },
      client: selectedClient
        ? {
            clientId: selectedClient.id,
            name: selectedClient.name,
            company: selectedClient.company,
            email: selectedClient.email,
            phone: selectedClient.phone,
            address: selectedClient.address,
          }
        : {
            clientId: "preview",
            name: "Client name",
            email: "client@example.com",
            address: fallbackAddress,
          },
    };
  }, [
    currency,
    discountType,
    discountValue,
    dueDate,
    invoice?.formattedNumber,
    issueDate,
    lineItems,
    notes,
    paymentTerms,
    selectedClient,
    selectedProfile,
    taxRate,
    templateId,
    totals,
  ]);

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
    if (!pageFit) {
      toast({
        variant: "info",
        title: "Checking invoice layout",
        description: "Wait for the one-page preview check to finish, then save again.",
      });
      return;
    }
    if (!pageFit.fits) {
      toast({
        variant: "error",
        title: "Invoice is too long",
        description:
          "Shorten line-item descriptions, remove items, or reduce the notes so it fits on one readable A4 page.",
      });
      setPreviewOpen(true);
      return;
    }
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
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline">
              <Link href="/invoicing-settings">Invoice settings</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <SubmitButton pending={saving} disabled={!pageFit?.fits}>
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
              </Field>
              <div className="rounded-md border border-border bg-surface-muted p-4 sm:col-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1 text-sm">
                    {selectedClient ? (
                      <>
                        <p className="font-medium text-foreground">
                          {selectedClient.name}
                          {selectedClient.company ? ` · ${selectedClient.company}` : ""}
                        </p>
                        <p className="text-muted-foreground">
                          {[selectedClient.email, selectedClient.phone].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-muted-foreground">
                          {[
                            selectedClient.address.street,
                            selectedClient.address.street2,
                            selectedClient.address.city,
                            selectedClient.address.subdivision,
                            selectedClient.address.postalCode,
                            selectedClient.address.country,
                          ].filter(Boolean).join(", ") || "No billing address"}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">
                        Select a client to review their contact and billing address.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!profileId}
                      onClick={() => {
                        setClientDialogClient(null);
                        setClientDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add client
                    </Button>
                    {selectedClient && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setClientDialogClient(selectedClient);
                          setClientDialogOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" /> Edit client
                      </Button>
                    )}
                  </div>
                </div>
              </div>
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
              {!pageFit ? (
                <p className="text-xs text-muted-foreground">Checking one-page A4 fit…</p>
              ) : !pageFit.fits ? (
                <p role="alert" className="text-xs leading-5 text-danger">
                  This invoice is too long for one readable page. Preview it and shorten the
                  line items or notes before saving.
                </p>
              ) : (
                <p className="text-xs text-success">Fits on one A4 page.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[94vh] w-[min(calc(100vw-2rem),72rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Invoice preview</DialogTitle>
            <DialogDescription>
              This preview uses the current form values and selected template. Save the draft to
              create the final invoice number.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface-muted p-3 sm:p-6">
            <div className="mx-auto min-w-[46rem] max-w-[50rem]">
              <InvoicePreview invoice={previewInvoice} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Continue editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-10000px] top-0 w-[794px] opacity-0"
      >
        <InvoicePreview
          invoice={previewInvoice}
          paymentUrl="https://stablon.app/pay/preview"
          onFitChange={setPageFit}
        />
      </div>
      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        client={clientDialogClient}
        profiles={profiles}
        initialProfileId={profileId}
        lockProfile
        onSaved={async (savedClient) => {
          await mutateClients();
          setClientId(savedClient.id);
        }}
      />
    </form>
  );
}
