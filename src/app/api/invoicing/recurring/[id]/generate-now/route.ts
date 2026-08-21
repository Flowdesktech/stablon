import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError } from "@/lib/invoicing/http";
import { generateRecurringInvoiceNow } from "@/lib/invoicing/recurring-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { id } = await context.params;
    return NextResponse.json({
      data: await generateRecurringInvoiceNow(guard.user.uid, id),
    });
  } catch (error) {
    return invoicingError(error);
  }
}
