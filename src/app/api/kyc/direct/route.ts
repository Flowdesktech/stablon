import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";
import type {
  DirectKycMode,
  DirectKycPayload,
  KycDocument,
  KycIdentifyingInfo,
} from "@/types/bridge";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ~5 MB per image once base64-encoded. Bridge's upload gateway rejects larger
// payloads with a 413 / "entity too large", so we catch it up front for a fast,
// clear message instead of a slow failed round-trip.
const MAX_IMAGE_CHARS = 7_000_000;
const TOO_LARGE_MESSAGE =
  "Your uploaded files are too large. Please upload smaller, compressed images (under 5 MB each) and try again.";

// Direct (API-based) KYC submission. Builds a Customers API payload from the
// in-app form and creates or updates the Bridge customer. Sensitive fields
// (ID numbers, document images) are forwarded straight to Bridge and never
// persisted or logged here.
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const body = await req.json().catch(() => ({}));
    const mode: DirectKycMode = body.mode === "advanced" ? "advanced" : "little";

    const signedAgreementId = str(body.signed_agreement_id);
    const firstName = str(body.first_name);
    const lastName = str(body.last_name);
    const birthDate = str(body.birth_date);

    const address = body.address ?? {};
    const idType = str(body.id_type);
    const idCountry = str(body.id_country);
    const idNumber = str(body.id_number);

    // Baseline requirements shared by both tiers.
    const missing: string[] = [];
    if (!signedAgreementId) missing.push("Terms of Service acceptance");
    if (!firstName) missing.push("first name");
    if (!lastName) missing.push("last name");
    if (!birthDate) missing.push("date of birth");
    if (!str(address.street_line_1)) missing.push("street address");
    if (!str(address.city)) missing.push("city");
    if (!str(address.postal_code)) missing.push("postal code");
    if (!str(address.country)) missing.push("country");
    if (!idType || !idCountry || !idNumber) missing.push("ID document details");

    const idInfo: KycIdentifyingInfo = {
      type: idType,
      issuing_country: idCountry.toLowerCase(),
      number: idNumber,
    };
    const documents: KycDocument[] = [];

    if (mode === "advanced") {
      // Higher-assurance tier: require ID image + proof of address.
      const imageFront = str(body.id_image_front);
      const imageBack = str(body.id_image_back);
      const proof = str(body.proof_of_address);

      if ([imageFront, imageBack, proof].some((v) => v.length > MAX_IMAGE_CHARS)) {
        return NextResponse.json({ error: TOO_LARGE_MESSAGE }, { status: 413 });
      }

      if (imageFront) idInfo.image_front = imageFront;
      if (imageBack) idInfo.image_back = imageBack;
      if (proof) documents.push({ purposes: ["proof_of_address"], file: proof });

      if (!idInfo.image_front) missing.push("front image of your ID");
      if (!proof) missing.push("proof of address document");
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Please provide: ${missing.join(", ")}.` },
        { status: 400 }
      );
    }

    const payload: DirectKycPayload = {
      type: "individual",
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      birth_date: birthDate,
      residential_address: {
        street_line_1: str(address.street_line_1),
        street_line_2: str(address.street_line_2) || undefined,
        city: str(address.city),
        subdivision: str(address.subdivision) || undefined,
        postal_code: str(address.postal_code),
        country: str(address.country).toUpperCase(),
      },
      signed_agreement_id: signedAgreementId,
      // Advanced unlocks EUR/SEPA in addition to the base USD endorsement.
      endorsements: mode === "advanced" ? ["base", "sepa"] : ["base"],
      identifying_information: [idInfo],
    };

    if (str(body.phone)) payload.phone = str(body.phone);
    if (documents.length > 0) payload.documents = documents;

    if (mode === "advanced") {
      if (str(body.employment_status)) payload.employment_status = str(body.employment_status);
      if (str(body.expected_monthly_payments_usd))
        payload.expected_monthly_payments_usd = str(body.expected_monthly_payments_usd);
      if (str(body.source_of_funds)) payload.source_of_funds = str(body.source_of_funds);
      if (str(body.account_purpose)) payload.account_purpose = str(body.account_purpose);
      if (str(body.most_recent_occupation))
        payload.most_recent_occupation = str(body.most_recent_occupation);
    }

    const customer = await bridge.submitDirectKyc(user.bridgeCustomerId, payload);

    const kyc_status = bridge.deriveKycStatus(customer);
    const updates: Record<string, string> = { kycStatus: kyc_status };
    if (!user.bridgeCustomerId && customer.id) updates.bridgeCustomerId = customer.id;
    await updateUserDoc(user.uid, updates);

    return NextResponse.json({
      customer_id: customer.id,
      kyc_status,
      endorsements: customer.endorsements ?? [],
    });
  } catch (error) {
    return apiError(error);
  }
}
