import { NextResponse } from "next/server";
import { requireVerifiedCustomer } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const guard = await requireVerifiedCustomer();
    if ("error" in guard) return guard.error;

    const { cardId } = await params;
    await bridge.freezeCard(cardId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
