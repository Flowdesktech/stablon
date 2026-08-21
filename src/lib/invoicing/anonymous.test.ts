import { describe, expect, it } from "vitest";
import { anonymousInvoiceSchema, anonymousInvoiceToRenderable } from "./anonymous";

const validInput = {
  invoiceNumber: "INV-42",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  currency: "usd",
  sender: {
    name: "Sender",
    email: "sender@example.com",
    address: { street: "", city: "", postalCode: "", country: "USA" },
  },
  client: {
    name: "Client",
    email: "client@example.com",
    address: { street: "", city: "", postalCode: "", country: "GBR" },
  },
  lineItems: [{ description: "Design", quantity: "2", rate: "125.25" }],
  taxRate: "5",
  discountType: "none" as const,
  discountValue: "0",
  notes: "",
  paymentTerms: "Net 14",
  templateId: "modern-blue",
};

describe("anonymous invoice generator", () => {
  it("validates and calculates a render-only invoice", () => {
    const parsed = anonymousInvoiceSchema.parse(validInput);
    const invoice = anonymousInvoiceToRenderable(parsed);
    expect(invoice.currency).toBe("USD");
    expect(invoice.totals.subtotal).toBe("250.50");
    expect(invoice.totals.total).toBe("263.03");
    expect(invoice).not.toHaveProperty("ownerUid");
    expect(invoice).not.toHaveProperty("publicTokenHash");
  });

  it("rejects unknown templates and backwards due dates", () => {
    expect(
      anonymousInvoiceSchema.safeParse({ ...validInput, templateId: "unknown" }).success
    ).toBe(false);
    expect(
      anonymousInvoiceSchema.safeParse({ ...validInput, dueDate: "2026-07-31" }).success
    ).toBe(false);
  });
});
