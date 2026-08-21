import { NextResponse } from "next/server";
import { assertSameOrigin, parseJson } from "@/lib/invoicing/http";
import { invoicePaymentError } from "@/lib/invoicing/payment-http";
import { checkoutInvoice } from "@/lib/invoicing/payments";
import { checkoutInputSchema } from "@/lib/invoicing/schemas";

export const maxDuration = 45;

export async function POST(
  request: Request,
  context: RouteContext<"/api/public/invoices/[token]/checkout">
) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  try {
    const [{ token }, input] = await Promise.all([
      context.params,
      parseJson(request, checkoutInputSchema),
    ]);
    const payment = await checkoutInvoice(token, input.sourceRail, request);
    return NextResponse.json(
      { data: payment },
      {
        status: 201,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
  } catch (error) {
    return invoicePaymentError(error);
  }
}
