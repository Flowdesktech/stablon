import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import * as bridge from "@/lib/bridge";

// Returns the customer to the client with a normalized `kyc_status`, and keeps
// the Firestore `kycStatus` in sync so server-side guards stay accurate.
async function respondWithCustomer(
  uid: string,
  storedStatus: string,
  customer: Awaited<ReturnType<typeof bridge.getCustomer>>,
  init?: { status?: number }
) {
  const kyc_status = bridge.deriveKycStatus(customer);
  if (kyc_status !== storedStatus) {
    await updateUserDoc(uid, { kycStatus: kyc_status });
  }
  return NextResponse.json({ ...customer, kyc_status }, init);
}

export async function POST() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (user.bridgeCustomerId) {
      try {
        const customer = await bridge.getCustomer(user.bridgeCustomerId);
        return respondWithCustomer(user.uid, user.kycStatus, customer);
      } catch (error) {
        if (!bridge.isBridgeNotFound(error)) throw error;
        // The linked customer was removed on Bridge — drop it and create a fresh one.
        await updateUserDoc(user.uid, { bridgeCustomerId: null, kycStatus: "none" });
      }
    }

    const customer = await bridge.createCustomer({
      full_name: user.name || user.email,
      email: user.email,
      type: "individual",
    });

    await updateUserDoc(user.uid, { bridgeCustomerId: customer.id });

    return respondWithCustomer(user.uid, "none", customer, { status: 201 });
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

    try {
      const customer = await bridge.getCustomer(user.bridgeCustomerId);
      return respondWithCustomer(user.uid, user.kycStatus, customer);
    } catch (error) {
      if (!bridge.isBridgeNotFound(error)) throw error;
      // Customer no longer exists on Bridge → unlink and reset so the client
      // treats this as a fresh, unverified account and can re-onboard.
      await updateUserDoc(user.uid, { bridgeCustomerId: null, kycStatus: "none" });
      return NextResponse.json({
        id: null,
        kyc_status: "none",
        customer_removed: true,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
