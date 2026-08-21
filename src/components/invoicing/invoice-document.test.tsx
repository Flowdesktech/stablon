import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { InvoiceDocument } from "./invoice-document";
import { INVOICE_TEMPLATES } from "@/lib/invoicing/templates";
import type { RenderableInvoice } from "@/lib/invoicing/renderable";

const invoice: RenderableInvoice = {
  formattedNumber: "INV-00001",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  currency: "USD",
  lineItems: [
    {
      id: "line-1",
      description: "Product design",
      quantity: "2",
      rate: "150.00",
      amount: "300.00",
    },
  ],
  totals: {
    subtotal: "300.00",
    discountType: "none",
    discountValue: "0",
    discountAmount: "0.00",
    taxableAmount: "300.00",
    taxRate: "0",
    taxAmount: "0.00",
    total: "300.00",
  },
  notes: "Thank you for your business.",
  paymentTerms: "Due within 14 days",
  templateId: "modern-blue",
  sender: {
    profileId: "profile-1",
    displayName: "Stablon Studio",
    company: "Stablon Studio",
    email: "billing@example.com",
    address: {
      street: "1 Market Street",
      city: "San Francisco",
      postalCode: "94105",
      country: "USA",
    },
  },
  client: {
    clientId: "client-1",
    name: "Alex Client",
    email: "alex@example.com",
    address: {
      street: "2 Main Street",
      city: "New York",
      postalCode: "10001",
      country: "USA",
    },
  },
};

describe("invoice PDF templates", () => {
  it(
    "renders all 15 template variants as PDFs",
    async () => {
      expect(INVOICE_TEMPLATES).toHaveLength(15);
      for (const template of INVOICE_TEMPLATES) {
        const buffer = await renderToBuffer(
          <InvoiceDocument invoice={{ ...invoice, templateId: template.id }} />
        );
        expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
        expect(buffer.byteLength).toBeGreaterThan(1_000);
      }
    },
    30_000
  );
});
