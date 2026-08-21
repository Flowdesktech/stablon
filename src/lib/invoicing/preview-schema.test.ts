import { describe, expect, it } from "vitest";
import { invoicePreviewRequestSchema } from "@/lib/invoicing/preview-schema";
import { sampleRenderableInvoice } from "@/lib/invoicing/sample";

describe("invoice preview schema", () => {
  it("treats a stored null logo URL as an omitted optional logo", () => {
    const invoice = sampleRenderableInvoice("modern-blue");
    const parsed = invoicePreviewRequestSchema.parse({
      invoice: {
        ...invoice,
        sender: {
          ...invoice.sender,
          logoUrl: null,
        },
      },
    });

    expect(parsed.invoice.sender.logoUrl).toBeUndefined();
  });
});
