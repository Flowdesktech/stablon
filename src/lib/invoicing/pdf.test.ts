import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { Browser } from "puppeteer-core";

vi.mock("server-only", () => ({}));

import { launchInvoiceBrowser } from "@/lib/invoicing/browser";
import {
  InvoiceContentOverflowError,
  renderInvoicePdfInBrowser,
} from "@/lib/invoicing/pdf";
import { sampleRenderableInvoice } from "@/lib/invoicing/sample";
import { INVOICE_TEMPLATES } from "@/lib/invoicing/templates";

describe("Chromium invoice PDFs", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchInvoiceBrowser();
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  it(
    "renders every canonical template as exactly one A4 PDF page",
    async () => {
      for (const template of INVOICE_TEMPLATES) {
        let bytes: Buffer;
        try {
          bytes = await renderInvoicePdfInBrowser(
            browser,
            sampleRenderableInvoice(template.id),
            "https://stablon.app/pay/example"
          );
        } catch (error) {
          if (error instanceof InvoiceContentOverflowError) {
            throw new Error(
              `${template.id} overflowed: ${JSON.stringify(error.fit)}`
            );
          }
          throw error;
        }
        expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
        const document = await PDFDocument.load(bytes);
        expect(document.getPageCount(), template.id).toBe(1);
      }
    },
    120_000
  );

  it(
    "rejects content that cannot fit at the minimum readable scale",
    async () => {
      const invoice = sampleRenderableInvoice("modern-blue");
      invoice.lineItems = Array.from({ length: 40 }, (_, index) => ({
        id: `overflow-${index}`,
        description:
          "A deliberately long professional services description that must remain readable on the generated invoice page.",
        quantity: "1",
        rate: "100.00",
        amount: "100.00",
      }));

      await expect(
        renderInvoicePdfInBrowser(browser, invoice)
      ).rejects.toBeInstanceOf(InvoiceContentOverflowError);
    },
    30_000
  );
});
