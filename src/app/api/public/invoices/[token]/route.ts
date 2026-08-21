import { NextResponse } from "next/server";
import { getPublicInvoiceCheckout } from "@/lib/invoicing/payments";
import { invoicePaymentError } from "@/lib/invoicing/payment-http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/public/invoices/[token]">
) {
  try {
    const { token } = await context.params;
    const data = await getPublicInvoiceCheckout(token, true);
    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return invoicePaymentError(error);
  }
}
