import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { invoicingError } from "@/lib/invoicing/http";
import { invoiceStats } from "@/lib/invoicing/repository";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    return NextResponse.json({ data: await invoiceStats(guard.user.uid) });
  } catch (error) {
    return invoicingError(error);
  }
}
