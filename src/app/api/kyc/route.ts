import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import * as bridge from "@/lib/bridge";
import type { BridgeKYCLink } from "@/types/bridge";

// Returns the two hosted links a customer must complete to onboard with Bridge:
//   1. tos_link  — accept Terms of Service
//   2. kyc_link  — identity verification (Persona)
// The customer is created at registration via /customers, so we fetch links for
// that existing customer (rather than POST /kyc_links, which creates a new one).
export async function POST() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    let customerId = user.bridgeCustomerId;
    if (!customerId) {
      const created = await bridge.createCustomer({
        full_name: user.name || user.email,
        email: user.email,
        type: "individual",
      });
      customerId = created.id;
      await updateUserDoc(user.uid, { bridgeCustomerId: customerId });
    }

    const customer = await bridge.getCustomer(customerId);

    // Prefer the existing-customer KYC link; fall back to POST /kyc_links (which
    // Bridge dedups by email) if that endpoint fails or returns no link, so the
    // client always gets a usable kyc_link.
    let kycLink: BridgeKYCLink | null = null;
    try {
      kycLink = await bridge.getCustomerKycLink(customerId, "sepa");
    } catch (err) {
      console.error("[kyc] getCustomerKycLink failed, falling back to /kyc_links:", err);
    }
    if (!kycLink?.kyc_link) {
      kycLink = await bridge.createKYCLink({
        full_name: user.name || user.email,
        email: user.email,
        type: "individual",
      });
    }

    const kyc_status = bridge.deriveKycStatus(customer);
    if (kyc_status !== user.kycStatus) {
      await updateUserDoc(user.uid, { kycStatus: kyc_status });
    }

    return NextResponse.json({
      customer_id: customerId,
      kyc_link: kycLink.kyc_link,
      tos_link: customer.tos_link ?? kycLink.tos_link ?? null,
      tos_accepted: Boolean(customer.has_accepted_terms_of_service),
      kyc_status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
