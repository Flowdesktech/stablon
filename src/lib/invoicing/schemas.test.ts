import { describe, expect, it } from "vitest";
import { invoiceAddressSchema, invoiceInputSchema } from "@/lib/invoicing/schemas";

describe("invoice address country names", () => {
  it("accepts full country names without code normalization", () => {
    const address = invoiceAddressSchema.parse({
      street: "1 Rue de Rivoli",
      city: "Paris",
      postalCode: "75001",
      country: "Côte d’Ivoire",
    });

    expect(address.country).toBe("Côte d’Ivoire");
  });

  it("defaults new invoice addresses to United States", () => {
    const address = invoiceAddressSchema.parse({});
    expect(address.country).toBe("United States");
  });
});

describe("editable invoice numbers", () => {
  it("accepts and trims a custom display number", () => {
    const invoice = invoiceInputSchema.parse({
      profileId: "profile-1",
      clientId: "client-1",
      formattedNumber: "  ACME-2026-0042  ",
      issueDate: "2026-08-21",
      dueDate: "2026-08-28",
      currency: "USD",
      lineItems: [{ description: "Consulting", quantity: "1", rate: "100" }],
    });

    expect(invoice.formattedNumber).toBe("ACME-2026-0042");
  });
});
