import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError, parseJson } from "@/lib/invoicing/http";
import {
  createRecurringSchedule,
  listRecurringSchedules,
} from "@/lib/invoicing/recurring-service";
import { recurringInvoiceInputSchema } from "@/lib/invoicing/schemas";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    return NextResponse.json({
      data: await listRecurringSchedules(guard.user.uid),
    });
  } catch (error) {
    return invoicingError(error);
  }
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const input = await parseJson(request, recurringInvoiceInputSchema);
    return NextResponse.json(
      { data: await createRecurringSchedule(guard.user.uid, input) },
      { status: 201 }
    );
  } catch (error) {
    return invoicingError(error);
  }
}
