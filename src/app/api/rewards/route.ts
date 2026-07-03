import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";

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
    return apiError(error);
  }
}
