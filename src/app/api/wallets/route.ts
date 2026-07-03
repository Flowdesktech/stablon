import { NextResponse } from "next/server";
import { requireUser, requireVerifiedCustomer } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.bridgeCustomerId) {
      return NextResponse.json({ data: [] });
    }

    const wallets = await bridge.getWallets(user.bridgeCustomerId);
    return NextResponse.json(wallets);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireVerifiedCustomer();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const { network } = await req.json();
    const wallet = await bridge.createWallet(user.bridgeCustomerId!, { network });
    return NextResponse.json(wallet, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
