import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError, parseJson } from "@/lib/invoicing/http";
import { invoiceInputSchema } from "@/lib/invoicing/schemas";
import {
  deleteInvoice,
  duplicateInvoice,
  getInvoice,
  updateInvoice,
  voidInvoice,
} from "@/lib/invoicing/repository";

const actionSchema = z.object({ action: z.enum(["void", "duplicate"]) });

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { id } = await context.params;
    return NextResponse.json({ data: await getInvoice(guard.user.uid, id) });
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
      parseJson(request, invoiceInputSchema),
    ]);
    return NextResponse.json({ data: await updateInvoice(guard.user.uid, id, input) });
  } catch (error) {
    return invoicingError(error);
  }
}

export async function PATCH(
  request: Request,
  context: Context
) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const [{ id }, { action }] = await Promise.all([
      context.params,
      parseJson(request, actionSchema),
    ]);
    return NextResponse.json({
      data:
        action === "void"
          ? await voidInvoice(guard.user.uid, id)
          : await duplicateInvoice(guard.user.uid, id),
    });
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
    await deleteInvoice(guard.user.uid, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return invoicingError(error);
  }
}
