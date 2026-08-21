import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError, parseJson } from "@/lib/invoicing/http";
import {
  getRecurringScheduleDetails,
  updateRecurringSchedule,
} from "@/lib/invoicing/recurring-service";
import { recurringInvoiceInputSchema } from "@/lib/invoicing/schemas";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { id } = await context.params;
    return NextResponse.json({
      data: await getRecurringScheduleDetails(guard.user.uid, id),
    });
  } catch (error) {
    return invoicingError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const [{ id }, input] = await Promise.all([
      context.params,
      parseJson(request, recurringInvoiceInputSchema),
    ]);
    return NextResponse.json({
      data: await updateRecurringSchedule(guard.user.uid, id, input),
    });
  } catch (error) {
    return invoicingError(error);
  }
}
