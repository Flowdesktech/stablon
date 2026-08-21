import { describe, expect, it } from "vitest";
import {
  duplicateInvoiceFormDraft,
  incrementInvoiceNumber,
  invoiceNumberForList,
} from "@/lib/invoicing/draft-cache";
import type { Invoice } from "@/types/invoicing";

describe("invoice number helpers", () => {
  it("adds the configured prefix and standard padding to numeric-only input", () => {
    expect(invoiceNumberForList("158", "INV")).toBe("INV-00158");
  });

  it("increments the trailing number while retaining its prefix and width", () => {
    expect(incrementInvoiceNumber("INV-00158")).toBe("INV-00159");
    expect(incrementInvoiceNumber("158")).toBe("159");
  });
});

describe("duplicate invoice form drafts", () => {
  it("copies invoice fields without creating a record and advances dates and number", () => {
    const invoice = {
      profileId: "profile-1",
      clientId: "client-1",
      formattedNumber: "INV-00158",
      issueDate: "2026-08-01",
      dueDate: "2026-08-15",
      currency: "USD",
      lineItems: [
        {
          id: "original-line",
          description: "Consulting",
          quantity: "2",
          rate: "800",
          amount: "1600",
        },
      ],
      totals: {
        subtotal: "1600",
        discountType: "none",
        discountValue: "0",
        discountAmount: "0",
        taxableAmount: "1600",
        taxRate: "0",
        taxAmount: "0",
        total: "1600",
      },
      notes: "Original notes",
      paymentTerms: "Net 14",
      templateId: "modern-blue",
    } as Invoice;

    const draft = duplicateInvoiceFormDraft(
      invoice,
      new Date(2026, 7, 21, 12)
    );

    expect(draft.invoiceNumber).toBe("INV-00159");
    expect(draft.issueDate).toBe("2026-08-21");
    expect(draft.dueDate).toBe("2026-09-04");
    expect(draft.lineItems).toEqual([
      { description: "Consulting", quantity: "2", rate: "800" },
    ]);
    expect(draft.notes).toBe("Original notes");
  });
});
