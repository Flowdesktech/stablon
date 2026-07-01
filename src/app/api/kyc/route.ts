import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import * as bridge from "@/lib/bridge";

export async function POST() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const kycLink = await bridge.createKYCLink({
      full_name: user.name || user.email,
      email: user.email,
      type: "individual",
    });

    // The KYC link (including the one returned for a duplicate request) carries
    // the Bridge customer id and current kyc status — persist both so the user
    // is properly linked and the UI reflects the real verification state.
    await updateUserDoc(user.uid, {
      ...(kycLink.customer_id && !user.bridgeCustomerId
        ? { bridgeCustomerId: kycLink.customer_id }
        : {}),
      kycStatus: kycLink.kyc_status || kycLink.status || "pending",
    });

    return NextResponse.json(kycLink, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
