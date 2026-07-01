import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.bridgeCustomerId) {
      return NextResponse.json({ data: [] });
    }

    const history = await bridge.getRewardsHistory(user.bridgeCustomerId);
    return NextResponse.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
