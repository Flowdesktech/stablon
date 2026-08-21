import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError, parseJson } from "@/lib/invoicing/http";
import { invoiceClientInputSchema } from "@/lib/invoicing/schemas";
import {
  deleteInvoiceClient,
  getInvoiceClient,
  updateInvoiceClient,
} from "@/lib/invoicing/repository";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { id } = await context.params;
    return NextResponse.json({ data: await getInvoiceClient(guard.user.uid, id) });
  } catch (error) {
    return invoicingError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const [{ id }, input] = await Promise.all([
      context.params,
      parseJson(request, invoiceClientInputSchema),
    ]);
    return NextResponse.json({ data: await updateInvoiceClient(guard.user.uid, id, input) });
  } catch (error) {
    return invoicingError(error);
  }
}

export async function DELETE(
  request: Request,
  context: Context
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { id } = await context.params;
    await deleteInvoiceClient(guard.user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return invoicingError(error);
  }
}
