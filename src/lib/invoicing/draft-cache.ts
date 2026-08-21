import type { Invoice, InvoiceTotals } from "@/types/invoicing";

export interface InvoiceFormDraftData {
  profileId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: string;
    rate: string;
  }>;
  taxRate: string;
  discountType: InvoiceTotals["discountType"];
  discountValue: string;
  notes: string;
  paymentTerms: string;
  templateId: string;
}

export const INVOICE_DRAFT_STORAGE_PREFIX = "stablon:invoice-form-draft:v1";

export function invoiceDraftStorageKey(ownerUid: string, storageId = "create") {
  return `${INVOICE_DRAFT_STORAGE_PREFIX}:${ownerUid}:${storageId}`;
}

export function invoiceNumberForList(value: string, prefix: string) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return trimmed;
  return `${prefix}-${trimmed.padStart(5, "0")}`;
}

export function incrementInvoiceNumber(value: string) {
  const trimmed = value.trim();
  const match = /^(.*?)(\d+)$/.exec(trimmed);
  if (!match) return `${trimmed || "INV"}-2`;
  const nextDigits = (BigInt(match[2]) + BigInt(1))
    .toString()
    .padStart(match[2].length, "0");
  return `${match[1]}${nextDigits}`;
}

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addUtcDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function duplicateInvoiceFormDraft(
  invoice: Invoice,
  currentDate = new Date()
): InvoiceFormDraftData {
  const originalDuration = Math.max(
    0,
    Math.round(
      (new Date(`${invoice.dueDate}T00:00:00Z`).getTime() -
        new Date(`${invoice.issueDate}T00:00:00Z`).getTime()) /
        86_400_000
    )
  );
  const issueDate = localDateValue(currentDate);

  return {
    profileId: invoice.profileId,
    clientId: invoice.clientId,
    invoiceNumber: incrementInvoiceNumber(invoice.formattedNumber),
    issueDate,
    dueDate: addUtcDays(issueDate, originalDuration),
    currency: invoice.currency,
    lineItems: invoice.lineItems.map(({ description, quantity, rate }) => ({
      description,
      quantity,
      rate,
    })),
    taxRate: invoice.totals.taxRate,
    discountType: invoice.totals.discountType,
    discountValue: invoice.totals.discountValue,
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    templateId: invoice.templateId,
  };
}
