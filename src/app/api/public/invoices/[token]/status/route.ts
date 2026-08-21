import { NextResponse } from "next/server";
import { invoicePaymentError } from "@/lib/invoicing/payment-http";
import { refreshInvoicePayment } from "@/lib/invoicing/payments";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function GET(
  _request: Request,
  context: RouteContext<"/api/public/invoices/[token]/status">
) {
  try {
    const { token } = await context.params;
    return NextResponse.json(
      { data: await refreshInvoicePayment(token) },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return invoicePaymentError(error);
  }
}
