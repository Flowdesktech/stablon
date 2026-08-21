import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError, parseJson } from "@/lib/invoicing/http";
import { pauseRecurringSchedule } from "@/lib/invoicing/recurring-service";

const pauseSchema = z.object({
  pausedUntil: z.string().date().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const [{ id }, { pausedUntil }] = await Promise.all([
      context.params,
      parseJson(request, pauseSchema),
    ]);
    return NextResponse.json({
      data: await pauseRecurringSchedule(guard.user.uid, id, pausedUntil),
    });
  } catch (error) {
    return invoicingError(error);
  }
}
