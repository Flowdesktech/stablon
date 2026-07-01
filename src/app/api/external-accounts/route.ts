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

    const accounts = await bridge.listExternalAccounts(user.bridgeCustomerId);
    return NextResponse.json(accounts);
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
    const account = await bridge.createExternalAccount(user.bridgeCustomerId!, body);
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
