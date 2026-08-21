"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import { InvoicePreview } from "@/components/invoicing/invoice-preview";
import { calculateInvoiceTotals } from "@/lib/invoicing/money";
import { INVOICE_TEMPLATES } from "@/lib/invoicing/templates";
import type { RenderableInvoice } from "@/lib/invoicing/renderable";

interface PartyForm {
  name: string;
  company: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface LineForm {
  id: string;
  description: string;
  quantity: string;
  rate: string;
}

const inputClass =
  "w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground shadow-[var(--shadow-sm)] outline-none transition-colors placeholder:text-muted-foreground focus:border-focus focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:bg-surface-muted";

function isoDate(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function InvoiceGeneratorForm() {
  const [sender, setSender] = useState<PartyForm>({
    name: "",
    company: "",
    email: "",
    street: "",
    city: "",
    postalCode: "",
    country: "USA",
  });
  const [client, setClient] = useState<PartyForm>({
    name: "",
    company: "",
    email: "",
    street: "",
    city: "",
    postalCode: "",
    country: "USA",
  });
  const [invoiceNumber, setInvoiceNumber] = useState("INV-00001");
  const [issueDate, setIssueDate] = useState(() => isoDate());
  const [dueDate, setDueDate] = useState(() => isoDate(7));
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on receipt");
  const [templateId, setTemplateId] = useState("modern-blue");
  const [lineItems, setLineItems] = useState<LineForm[]>([
    { id: "item-1", description: "Professional services", quantity: "1", rate: "500" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo<RenderableInvoice>(() => {
    const safeItems = lineItems.map((item) => ({
      ...item,
      description: item.description || "Line item",
      quantity: /^\d+(?:\.\d+)?$/.test(item.quantity) && Number(item.quantity) > 0 ? item.quantity : "1",
      rate: /^\d+(?:\.\d+)?$/.test(item.rate) ? item.rate : "0",
    }));
    const safeTax = /^\d+(?:\.\d+)?$/.test(taxRate) && Number(taxRate) <= 100 ? taxRate : "0";
    const computed = calculateInvoiceTotals(safeItems, currency || "USD", safeTax);

    return {
      formattedNumber: invoiceNumber || "INV-00001",
      issueDate,
      dueDate,
      currency: currency || "USD",
      lineItems: computed.lineItems,
      totals: computed.totals,
      notes,
      paymentTerms,
      templateId,
      sender: {
        profileId: "preview",
        displayName: sender.name || "Your name",
        company: sender.company || sender.name || "Your business",
        email: sender.email || "you@example.com",
        address: {
          street: sender.street,
          city: sender.city,
          postalCode: sender.postalCode,
          country: sender.country,
        },
      },
      client: {
        clientId: "preview",
        name: client.name || "Client name",
        company: client.company || undefined,
        email: client.email || "client@example.com",
        address: {
          street: client.street,
          city: client.city,
          postalCode: client.postalCode,
          country: client.country,
        },
      },
    };
  }, [
    client,
    currency,
    dueDate,
    invoiceNumber,
    issueDate,
    lineItems,
    notes,
    paymentTerms,
    sender,
    taxRate,
    templateId,
  ]);

  function updateParty(
    setter: React.Dispatch<React.SetStateAction<PartyForm>>,
    key: keyof PartyForm,
    value: string
  ) {
    setter((current) => ({ ...current, [key]: value }));
  }

  function updateLine(id: string, key: keyof Omit<LineForm, "id">, value: string) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  }

  function addLine() {
    if (lineItems.length >= 25) return;
    setLineItems((items) => [
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: "1", rate: "0" },
    ]);
  }

  async function downloadPdf(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/invoice-generator/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          issueDate,
          dueDate,
          currency,
          sender: partyPayload(sender),
          client: partyPayload(client),
          lineItems: lineItems.map(({ description, quantity, rate }) => ({
            description,
            quantity,
            rate,
          })),
          taxRate,
          discountType: "none",
          discountValue: "0",
          notes,
          paymentTerms,
          templateId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          issues?: Array<{ message: string }>;
        };
        throw new Error(body.issues?.[0]?.message || body.error || "Could not generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber.replace(/[^A-Za-z0-9_-]+/g, "-") || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate PDF");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={downloadPdf} className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)]">
      <div className="space-y-6">
        <FormSection title="Invoice details" description="Set the invoice reference, dates, currency, and document style.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice number">
              <input className={inputClass} value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} required maxLength={40} />
            </Field>
            <Field label="Currency">
              <input className={inputClass} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required minLength={3} maxLength={3} />
            </Field>
            <Field label="Issue date">
              <input className={inputClass} type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
            </Field>
            <Field label="Due date">
              <input className={inputClass} type="date" value={dueDate} min={issueDate} onChange={(event) => setDueDate(event.target.value)} required />
            </Field>
            <Field label="Template" wide>
              <select className={inputClass} value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {INVOICE_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id} className="bg-surface text-foreground">
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>

        <div className="grid gap-6 md:grid-cols-2">
          <PartySection title="From" party={sender} setter={setSender} updateParty={updateParty} />
          <PartySection title="Bill to" party={client} setter={setClient} updateParty={updateParty} />
        </div>

        <FormSection title="Line items" description="Describe each item and enter its quantity and rate.">
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface-muted p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_2.5rem] sm:border-0 sm:bg-transparent sm:p-0">
                <div className="col-span-2 sm:col-span-1">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                    Description
                  </span>
                  <input aria-label={`Item ${index + 1} description`} className={inputClass} placeholder="Description" value={item.description} onChange={(event) => updateLine(item.id, "description", event.target.value)} required maxLength={500} />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                    Quantity
                  </span>
                  <input aria-label={`Item ${index + 1} quantity`} className={inputClass} inputMode="decimal" placeholder="Qty" value={item.quantity} onChange={(event) => updateLine(item.id, "quantity", event.target.value)} required />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                    Rate
                  </span>
                  <input aria-label={`Item ${index + 1} rate`} className={inputClass} inputMode="decimal" placeholder="Rate" value={item.rate} onChange={(event) => updateLine(item.id, "rate", event.target.value)} required />
                </div>
                <button type="button" aria-label={`Remove item ${index + 1}`} disabled={lineItems.length === 1} onClick={() => setLineItems((items) => items.filter((entry) => entry.id !== item.id))} className="col-span-2 flex h-10 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface text-muted-foreground transition-colors hover:border-danger/40 hover:bg-danger-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs sm:sr-only">Remove item</span>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} disabled={lineItems.length >= 25} className="mt-4 inline-flex items-center gap-2 rounded-md text-sm font-medium text-primary hover:underline disabled:opacity-40">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add line item
          </button>
        </FormSection>

        <FormSection title="Notes and terms" description="Add tax, payment terms, or supporting notes shown on the PDF.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tax rate (%)">
              <input className={inputClass} inputMode="decimal" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} required />
            </Field>
            <Field label="Payment terms">
              <input className={inputClass} value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} maxLength={160} />
            </Field>
            <Field label="Notes" wide>
              <textarea className={`${inputClass} min-h-24 resize-y`} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={3000} placeholder="Thank you for your business." />
            </Field>
          </div>
        </FormSection>

        {error ? <p role="alert" className="rounded-md border border-danger/25 bg-danger-muted px-4 py-3 text-sm text-danger">{error}</p> : null}
        <button type="submit" disabled={submitting} aria-busy={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:border-primary-hover hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60">
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
          {submitting ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      <aside className="xl:sticky xl:top-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Live preview</p>
        <InvoicePreview invoice={preview} />
      </aside>
    </form>
  );
}

function partyPayload(party: PartyForm) {
  return {
    name: party.name,
    company: party.company || undefined,
    email: party.email,
    address: {
      street: party.street,
      city: party.city,
      postalCode: party.postalCode,
      country: party.country,
    },
  };
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function PartySection({
  title,
  party,
  setter,
  updateParty,
}: {
  title: string;
  party: PartyForm;
  setter: React.Dispatch<React.SetStateAction<PartyForm>>;
  updateParty: (
    setter: React.Dispatch<React.SetStateAction<PartyForm>>,
    key: keyof PartyForm,
    value: string
  ) => void;
}) {
  return (
    <FormSection title={title}>
      <div className="space-y-3">
        {([
          ["name", "Name", "Jane Smith"],
          ["company", "Company (optional)", "Acme Inc."],
          ["email", "Email", "jane@example.com"],
          ["street", "Street", "123 Main Street"],
          ["city", "City", "New York"],
          ["postalCode", "Postal code", "10001"],
          ["country", "Country", "USA"],
        ] as const).map(([key, label, placeholder]) => (
          <Field key={key} label={label}>
            <input
              className={inputClass}
              type={key === "email" ? "email" : "text"}
              value={party[key]}
              onChange={(event) => updateParty(setter, key, event.target.value)}
              placeholder={placeholder}
              required={key === "name" || key === "email"}
              maxLength={key === "email" ? 254 : 160}
            />
          </Field>
        ))}
      </div>
    </FormSection>
  );
}
