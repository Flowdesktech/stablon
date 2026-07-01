import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;

    const { cardId } = await params;
    const transactions = await bridge.getCardTransactions(cardId);
    return NextResponse.json(transactions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
