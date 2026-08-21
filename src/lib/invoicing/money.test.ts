import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals } from "./money";

describe("calculateInvoiceTotals", () => {
  it("uses decimal arithmetic for line items, discounts and tax", () => {
    const result = calculateInvoiceTotals(
      [
        { id: "one", description: "Service", quantity: "3", rate: "0.10" },
        { id: "two", description: "Support", quantity: "1", rate: "99.95" },
      ],
      "USD",
      "7.5",
      "percent",
      "10"
    );

    expect(result.lineItems[0].amount).toBe("0.30");
    expect(result.totals.subtotal).toBe("100.25");
    expect(result.totals.discountAmount).toBe("10.03");
    expect(result.totals.taxAmount).toBe("6.77");
    expect(result.totals.total).toBe("96.99");
  });

  it("rejects invalid negative values", () => {
    expect(() =>
      calculateInvoiceTotals(
        [{ id: "one", description: "Service", quantity: "1", rate: "-1" }],
        "USD",
        "0"
      )
    ).toThrow("cannot be negative");
  });
});
