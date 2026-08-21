import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import {
  createInvoiceProfile,
  ensureDefaultInvoiceProfile,
  listInvoiceProfiles,
} from "@/lib/invoicing/repository";
import { assertSameOrigin, invoicingError, parseJson } from "@/lib/invoicing/http";
import { invoiceProfileInputSchema } from "@/lib/invoicing/schemas";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    await ensureDefaultInvoiceProfile(guard.user);
    return NextResponse.json({ data: await listInvoiceProfiles(guard.user.uid) });
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
    const input = await parseJson(request, invoiceProfileInputSchema);
    return NextResponse.json(
      { data: await createInvoiceProfile(guard.user.uid, input) },
      { status: 201 }
    );
  } catch (error) {
    return invoicingError(error);
  }
}
