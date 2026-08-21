import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { decryptSecret } from "@/lib/crypto";
import { getInvoice } from "@/lib/invoicing/repository";
import { renderInvoicePdf } from "@/lib/invoicing/pdf";
import {
  safeInvoiceFilename,
  toRenderableInvoice,
} from "@/lib/invoicing/renderable";

export const runtime = "nodejs";
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const guard = await requireUser();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await context.params;
    const invoice = await getInvoice(guard.user.uid, id);
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin
    ).replace(/\/$/, "");
    const paymentUrl =
      invoice.publicTokenHash && invoice.publicTokenEncrypted
        ? new URL(
            `/pay/${encodeURIComponent(decryptSecret(invoice.publicTokenEncrypted))}`,
            baseUrl
          ).toString()
        : undefined;
    const buffer = await renderInvoicePdf(toRenderableInvoice(invoice), paymentUrl);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeInvoiceFilename(invoice.formattedNumber)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invoice not found") {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    console.error("[invoicing/invoices/pdf] Failed to render invoice:", error);
    return NextResponse.json({ error: "Could not generate the invoice PDF" }, { status: 500 });
  }
}
