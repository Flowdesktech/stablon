import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { assertSameOrigin, invoicingError, parseJson } from "@/lib/invoicing/http";
import { invoiceClientInputSchema } from "@/lib/invoicing/schemas";
import { createInvoiceClient, listInvoiceClients } from "@/lib/invoicing/repository";

export async function GET(request: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const profileId = new URL(request.url).searchParams.get("profileId") || undefined;
    return NextResponse.json({
      data: await listInvoiceClients(guard.user.uid, profileId),
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
    const input = await parseJson(request, invoiceClientInputSchema);
    return NextResponse.json(
      { data: await createInvoiceClient(guard.user.uid, input) },
      { status: 201 }
    );
  } catch (error) {
    return invoicingError(error);
  }
}
