import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bridge from "@/lib/bridge";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as Record<string, unknown>).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.bridgeCustomerId) {
      return NextResponse.json({ total_earned: "0", current_apy: "5.0", currency: "usdb" });
    }

    const rewards = await bridge.getRewardsSummary(user.bridgeCustomerId);
    return NextResponse.json(rewards);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
