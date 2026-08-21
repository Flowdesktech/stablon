import type {
  Invoice,
  InvoiceAddress,
  InvoiceClientSnapshot,
  InvoiceLineItem,
  InvoiceSenderSnapshot,
  InvoiceTotals,
  PublicInvoice,
} from "@/types/invoicing";

export interface RenderableInvoice {
  formattedNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  totals: InvoiceTotals;
  notes: string;
  paymentTerms: string;
  templateId: string;
  sender: InvoiceSenderSnapshot;
  client: InvoiceClientSnapshot;
}

export function toRenderableInvoice(invoice: Invoice | PublicInvoice): RenderableInvoice {
  if ("senderSnapshot" in invoice) {
    return {
      formattedNumber: invoice.formattedNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      lineItems: invoice.lineItems,
      totals: invoice.totals,
      notes: invoice.notes,
      paymentTerms: invoice.paymentTerms,
      templateId: invoice.templateId,
      sender: invoice.senderSnapshot,
      client: invoice.clientSnapshot,
    };
  }

  return invoice;
}

export function formatInvoiceMoney(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency.toUpperCase()} ${value}`;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

export function formatInvoiceDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function invoiceAddressLines(address: InvoiceAddress): string[] {
  return [
    address.street,
    address.street2,
    [address.city, address.subdivision, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ].filter((value): value is string => Boolean(value?.trim()));
}

export function safeInvoiceFilename(number: string): string {
  const normalized = number.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${normalized || "invoice"}.pdf`;
}
