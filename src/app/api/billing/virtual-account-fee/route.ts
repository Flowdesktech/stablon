import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { createInvoice } from "@/lib/nowpayments";

export const maxDuration = 30;

const FEE_USD = process.env.VIRTUAL_ACCOUNT_FEE_USD || "10";

function appUrl(req: Request): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return base.replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (user.vaFeePaid) {
      return NextResponse.json({ alreadyPaid: true });
    }

    const base = appUrl(req);
    const invoice = await createInvoice({
      priceAmount: FEE_USD,
      priceCurrency: "usd",
      orderId: user.uid,
      orderDescription: "Virtual account setup fee",
      ipnCallbackUrl: `${base}/api/webhooks/nowpayments`,
      successUrl: `${base}/accounts?paid=1`,
      cancelUrl: `${base}/accounts?payment=cancelled`,
    });

    return NextResponse.json({ invoiceUrl: invoice.invoice_url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create payment invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
