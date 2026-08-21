import "server-only";
import { PDFDocument as PdfDocument } from "pdf-lib";
import type { Browser } from "puppeteer-core";
import { launchInvoiceBrowser } from "@/lib/invoicing/browser";
import { compileInvoiceHtml } from "@/lib/invoicing/html-template-compiler";
import { INVOICE_PAGE, type InvoiceFit } from "@/lib/invoicing/page-fit";
import type { RenderableInvoice } from "@/lib/invoicing/renderable";

const OVERFLOW_MESSAGE =
  "This invoice does not fit on one readable A4 page. Shorten line-item descriptions, remove items, or reduce the notes.";

export class InvoiceContentOverflowError extends Error {
  readonly code = "INVOICE_PAGE_OVERFLOW";
  readonly fit?: InvoiceFit;

  constructor(fit?: InvoiceFit) {
    super(OVERFLOW_MESSAGE);
    this.name = "InvoiceContentOverflowError";
    this.fit = fit;
  }
}

export function isInvoiceContentOverflowError(
  error: unknown
): error is InvoiceContentOverflowError {
  return (
    error instanceof InvoiceContentOverflowError ||
    (error instanceof Error &&
      "code" in error &&
      (error as Error & { code?: unknown }).code === "INVOICE_PAGE_OVERFLOW")
  );
}

export async function renderInvoicePdf(
  invoice: RenderableInvoice,
  paymentUrl?: string
): Promise<Buffer> {
  const browser = await launchInvoiceBrowser();

  try {
    return await renderInvoicePdfInBrowser(browser, invoice, paymentUrl);
  } finally {
    await browser.close();
  }
}

export async function renderInvoicePdfInBrowser(
  browser: Browser,
  invoice: RenderableInvoice,
  paymentUrl?: string
): Promise<Buffer> {
  const page = await browser.newPage();

  try {
    await page.emulateMediaType("print");
    await page.setContent(compileInvoiceHtml(invoice, paymentUrl), {
      waitUntil: "load",
      timeout: 15_000,
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const fit = await page.evaluate(
      ({ contentWidth, contentHeight, minimumScale }) => {
        const root = document.getElementById("invoice-print-root");
        if (!root) throw new Error("Invoice print root is missing");

        document.documentElement.style.width = `${contentWidth}px`;
        document.documentElement.style.overflow = "visible";
        document.body.style.width = `${contentWidth}px`;
        document.body.style.minHeight = "0";
        document.body.style.margin = "0";
        document.body.style.padding = "0";
        document.body.style.overflow = "visible";
        root.style.width = "100%";
        root.style.zoom = "1";

        const rectangle = root.getBoundingClientRect();
        const naturalWidth = Math.max(root.scrollWidth, rectangle.width);
        const naturalHeight = Math.max(root.scrollHeight, rectangle.height);
        const requestedScale = Math.min(
          1,
          contentWidth / Math.max(naturalWidth, 1),
          contentHeight / Math.max(naturalHeight, 1)
        );
        let fits = requestedScale >= minimumScale;
        const scale = fits ? requestedScale : minimumScale;
        root.style.zoom = String(scale);
        const renderedRectangle = root.getBoundingClientRect();
        fits =
          fits &&
          renderedRectangle.width <= contentWidth + 1 &&
          renderedRectangle.height <= contentHeight + 1;
        document.documentElement.style.height = `${contentHeight}px`;
        document.documentElement.style.overflow = "hidden";
        document.body.style.height = `${contentHeight}px`;
        document.body.style.overflow = "hidden";

        return {
          fits,
          scale,
          naturalWidth,
          naturalHeight,
        };
      },
      {
        contentWidth: INVOICE_PAGE.contentWidthPx,
        contentHeight: INVOICE_PAGE.contentHeightPx,
        minimumScale: INVOICE_PAGE.minimumScale,
      }
    );

    if (!fit.fits) {
      throw new InvoiceContentOverflowError(fit);
    }

    const bytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    const pdfDocument = await PdfDocument.load(bytes);
    if (pdfDocument.getPageCount() !== 1) {
      throw new InvoiceContentOverflowError(fit);
    }

    return Buffer.from(bytes);
  } finally {
    await page.close();
  }
}
