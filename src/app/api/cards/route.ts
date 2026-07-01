import { NextResponse } from "next/server";
import { requireUser, requireVerifiedCustomer } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.bridgeCustomerId) {
      return NextResponse.json({ data: [] });
    }

    const cards = await bridge.getCardAccounts(user.bridgeCustomerId);
    return NextResponse.json(cards);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireVerifiedCustomer();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const body = await req.json();
    const card = await bridge.provisionCard(user.bridgeCustomerId!, body);
    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
