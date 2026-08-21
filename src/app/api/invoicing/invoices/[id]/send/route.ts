import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { decryptSecret } from "@/lib/crypto";
import { assertSameOrigin } from "@/lib/invoicing/http";
import {
  getInvoice,
  publishInvoice,
} from "@/lib/invoicing/repository";
import {
  InvoiceEmailConfigurationError,
  invoiceDeliveryKey,
  markInvoiceSent,
  sendInvoiceEmail,
} from "@/lib/invoicing/delivery";
import { renderInvoicePdf } from "@/lib/invoicing/pdf";
import { toRenderableInvoice } from "@/lib/invoicing/renderable";

export const runtime = "nodejs";
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };

function publicBaseUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin
  ).replace(/\/$/, "");
}

export async function POST(request: Request, context: Context) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const guard = await requireUser();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await context.params;
    let invoice = await getInvoice(guard.user.uid, id);
    if (invoice.status === "void") {
      return NextResponse.json({ error: "A void invoice cannot be sent" }, { status: 409 });
    }

    let publicToken: string;
    if (invoice.publicTokenHash && invoice.publicTokenEncrypted) {
      publicToken = decryptSecret(invoice.publicTokenEncrypted);
    } else {
      const published = await publishInvoice(guard.user, invoice.id);
      invoice = published.invoice;
      publicToken = published.token;
    }

    const paymentUrl = new URL(
      `/pay/${encodeURIComponent(publicToken)}`,
      publicBaseUrl(request)
    ).toString();
    const pdf = await renderInvoicePdf(toRenderableInvoice(invoice), paymentUrl);
    const deliveryKey = invoiceDeliveryKey(invoice);
    const messageId = await sendInvoiceEmail({
      invoice,
      pdf,
      paymentUrl,
      deliveryKey,
    });
    await markInvoiceSent(guard.user.uid, invoice.id, deliveryKey, messageId);

    return NextResponse.json({
      data: { sent: true, messageId, paymentUrl },
    });
  } catch (error) {
    if (error instanceof InvoiceEmailConfigurationError) {
      console.error("[invoicing/invoices/send] Email configuration is incomplete");
      return NextResponse.json({ error: "Invoice email is not configured" }, { status: 503 });
    }
    if (error instanceof Error && error.message === "Invoice not found") {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (
      error instanceof Error &&
      (error.message.includes("verification") ||
        error.message.includes("settlement") ||
        error.message.includes("cannot be published"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[invoicing/invoices/send] Failed to send invoice:", error);
    return NextResponse.json({ error: "Could not send the invoice" }, { status: 502 });
  }
}
