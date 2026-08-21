import { describe, expect, it } from "vitest";
import { calculateInvoiceFit, INVOICE_PAGE } from "@/lib/invoicing/page-fit";

describe("invoice page fitting", () => {
  it("keeps content at full size when it fits", () => {
    expect(calculateInvoiceFit(700, 900)).toMatchObject({
      fits: true,
      scale: 1,
    });
  });

  it("compacts content uniformly within the readable range", () => {
    const fit = calculateInvoiceFit(700, 1200);
    expect(fit.fits).toBe(true);
    expect(fit.scale).toBeCloseTo(INVOICE_PAGE.contentHeightPx / 1200);
  });

  it("marks content that requires unreadable scaling as overflow", () => {
    const fit = calculateInvoiceFit(700, 2000);
    expect(fit.fits).toBe(false);
    expect(fit.scale).toBe(INVOICE_PAGE.minimumScale);
  });
});
