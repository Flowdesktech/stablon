import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.bridgeCustomerId) {
      return NextResponse.json({ total_earned: "0", current_apy: "5.0", currency: "usdb" });
    }

    const rewards = await bridge.getRewardsSummary(user.bridgeCustomerId);
    return NextResponse.json(rewards);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
