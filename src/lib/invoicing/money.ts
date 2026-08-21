import Decimal from "decimal.js";
import type { InvoiceLineItem, InvoiceTotals } from "@/types/invoicing";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

function decimal(value: string | number | undefined): Decimal {
  const normalized = value === undefined || value === "" ? "0" : String(value);
  const result = new Decimal(normalized);
  if (!result.isFinite()) throw new Error("Invalid monetary value");
  return result;
}

export function currencyDecimals(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export function moneyString(value: Decimal.Value, currency: string): string {
  return new Decimal(value).toFixed(currencyDecimals(currency));
}

export function calculateInvoiceTotals(
  items: Array<Omit<InvoiceLineItem, "amount">>,
  currency: string,
  taxRate: string,
  discountType: InvoiceTotals["discountType"] = "none",
  discountValue = "0"
): { lineItems: InvoiceLineItem[]; totals: InvoiceTotals } {
  const normalizedItems = items.map((item) => {
    const quantity = decimal(item.quantity);
    const rate = decimal(item.rate);
    if (quantity.lte(0)) throw new Error("Line item quantity must be greater than zero");
    if (rate.lt(0)) throw new Error("Line item rate cannot be negative");
    return {
      ...item,
      quantity: quantity.toString(),
      rate: rate.toString(),
      amount: moneyString(quantity.mul(rate), currency),
    };
  });

  const subtotal = normalizedItems.reduce(
    (sum, item) => sum.plus(item.amount),
    new Decimal(0)
  );
  const discountValueDecimal = decimal(discountValue);
  if (discountValueDecimal.lt(0)) throw new Error("Discount cannot be negative");

  let discount = new Decimal(0);
  if (discountType === "percent") {
    if (discountValueDecimal.gt(100)) throw new Error("Discount cannot exceed 100%");
    discount = subtotal.mul(discountValueDecimal).div(100);
  } else if (discountType === "fixed") {
    discount = Decimal.min(discountValueDecimal, subtotal);
  }

  const taxableAmount = Decimal.max(subtotal.minus(discount), 0);
  const taxRateDecimal = decimal(taxRate);
  if (taxRateDecimal.lt(0) || taxRateDecimal.gt(100)) {
    throw new Error("Tax rate must be between 0 and 100");
  }
  const taxAmount = taxableAmount.mul(taxRateDecimal).div(100);
  const total = taxableAmount.plus(taxAmount);

  return {
    lineItems: normalizedItems,
    totals: {
      subtotal: moneyString(subtotal, currency),
      discountType,
      discountValue: discountValueDecimal.toString(),
      discountAmount: moneyString(discount, currency),
      taxableAmount: moneyString(taxableAmount, currency),
      taxRate: taxRateDecimal.toString(),
      taxAmount: moneyString(taxAmount, currency),
      total: moneyString(total, currency),
    },
  };
}
