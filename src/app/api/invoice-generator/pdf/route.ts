import { NextResponse } from "next/server";
import {
  anonymousInvoiceSchema,
  anonymousInvoiceToRenderable,
} from "@/lib/invoicing/anonymous";
import { consumeAnonymousPdfLimit } from "@/lib/invoicing/anonymous-rate-limit";
import { assertSameOrigin } from "@/lib/invoicing/http";
import {
  isInvoiceContentOverflowError,
  renderInvoicePdf,
} from "@/lib/invoicing/pdf";
import { safeInvoiceFilename } from "@/lib/invoicing/renderable";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 64 * 1024;

class PayloadTooLargeError extends Error {}

async function readLimitedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) throw new PayloadTooLargeError();
  if (!request.body) throw new Error("Missing request body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  try {
    const rateLimit = await consumeAnonymousPdfLimit(request);
    const rateHeaders = {
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
    };
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many PDF requests. Please try again later." },
        {
          status: 429,
          headers: { ...rateHeaders, "Retry-After": String(rateLimit.retryAfter) },
        }
      );
    }

    const body = await readLimitedJson(request);
    const parsed = anonymousInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid invoice data",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400, headers: rateHeaders }
      );
    }

    const invoice = anonymousInvoiceToRenderable(parsed.data);
    const buffer = await renderInvoicePdf(invoice);
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...rateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeInvoiceFilename(invoice.formattedNumber)}"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isInvoiceContentOverflowError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 422 }
      );
    }
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { error: `Request body must be ${MAX_BODY_BYTES / 1024} KB or smaller` },
        { status: 413 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    console.error("[invoice-generator/pdf] Failed to generate PDF:", error);
    return NextResponse.json({ error: "Could not generate the invoice PDF" }, { status: 500 });
  }
}
