import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/invoicing/invoice-document";
import type { RenderableInvoice } from "@/lib/invoicing/renderable";

export async function renderInvoicePdf(
  invoice: RenderableInvoice,
  paymentUrl?: string
): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} paymentUrl={paymentUrl} />);
}
