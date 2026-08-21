import { NextResponse } from "next/server";
import { compileInvoiceHtml } from "@/lib/invoicing/html-template-compiler";
import { assertSameOrigin } from "@/lib/invoicing/http";
import { invoicePreviewRequestSchema } from "@/lib/invoicing/preview-schema";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Preview request is too large" }, { status: 413 });
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Preview request is too large" }, { status: 413 });
    }

    const parsed = invoicePreviewRequestSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Complete the required invoice details to preview this invoice",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      html: compileInvoiceHtml(parsed.data.invoice, parsed.data.paymentUrl),
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Preview request must be valid JSON" }, { status: 400 });
    }
    console.error("[invoice-generator/preview] Failed to render preview:", error);
    return NextResponse.json({ error: "Could not render the invoice preview" }, { status: 500 });
  }
}
