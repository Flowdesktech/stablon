import { describe, expect, it } from "vitest";
import { invoiceAddressSchema } from "@/lib/invoicing/schemas";

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
