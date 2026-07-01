import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import * as bridge from "@/lib/bridge";

export async function POST() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (user.bridgeCustomerId) {
      const customer = await bridge.getCustomer(user.bridgeCustomerId);
      return NextResponse.json(customer);
    }

    const customer = await bridge.createCustomer({
      full_name: user.name || user.email,
      email: user.email,
      type: "individual",
    });

    await updateUserDoc(user.uid, { bridgeCustomerId: customer.id });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.bridgeCustomerId) {
      return NextResponse.json({ id: null, kyc_status: user.kycStatus || "none" });
    }

    const customer = await bridge.getCustomer(user.bridgeCustomerId);
    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
