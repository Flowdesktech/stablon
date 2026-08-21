import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError } from "@/lib/invoicing/http";
import { publishInvoice } from "@/lib/invoicing/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(
  request: Request,
  context: Context
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { id } = await context.params;
    const result = await publishInvoice(guard.user, id);
    return NextResponse.json({
      data: result.invoice,
      publicUrl: `${new URL(request.url).origin}/pay/${result.token}`,
    });
  } catch (error) {
    return invoicingError(error);
  }
}
