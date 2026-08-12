import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";
import { onlyTaxIdMissing } from "@/lib/kyc";
import type {
  BridgeCustomer,
  DirectKycMode,
  DirectKycPayload,
  KycDocument,
  KycIdentifyingInfo,
} from "@/types/bridge";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Bridge's limits: each document image ≤ 15MB, and front+back combined ≤ 24MB.
// We compare against the base64 data-uri length (~1.34x the raw bytes) and fail
// fast with a clear message instead of a slow failed Bridge round-trip.
const MAX_IMAGE_CHARS = Math.floor(15 * 1024 * 1024 * 1.4); // ≈ per-image
const MAX_COMBINED_ID_CHARS = Math.floor(24 * 1024 * 1024 * 1.4); // ≈ front+back
const TOO_LARGE_MESSAGE =
  "Your uploaded files are too large. Please upload smaller, compressed images (max 15MB each, 24MB combined) and try again.";

// Tax-id types (database check — no photo needed) vs. government photo-id types
// (photo required). Sending a photo-id type without an image leaves the customer
// stuck on the `government_id_document` requirement, so we validate the pairing.
const TAX_ID_TYPES = new Set([
  "ssn",
  "itin",
  "tin",
  "cpf",
  "curp",
  "rfc",
  "nino",
  "utr",
  "nif",
  "nie",
  "cf",
  "bsn",
  "sin",
  "pan",
  "tfn",
  "rut",
  "nit",
  "dni",
  "pesel",
]);
const GOV_ID_TYPES = new Set([
  "passport",
  "drivers_license",
  "national_id",
  "state_or_provincial_id",
  "permanent_residency_id",
  "visa",
  "military_id",
  "matriculate_id",
]);

const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// This route uploads base64 document images to Bridge and waits on their
// verification, which can be slow. Give the serverless function enough room to
// outlast Bridge's 60s upload timeout instead of being killed by the platform's
// shorter default. On Vercel, functions are fluid-compute billed while waiting.
export const maxDuration = 90;

// Direct (API-based) KYC submission. Builds a Customers API payload from the
// in-app form and creates or updates the Bridge customer. Sensitive fields
// (ID numbers, document images) are forwarded straight to Bridge and never
// persisted or logged here.
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    // Fail fast on oversized uploads (base64 images) instead of buffering a huge
    // body and hitting a platform limit with an opaque error. ~2.5x the largest
    // valid image set (24MB front+back + proof of address) as JSON overhead.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 80_000_000) {
      return NextResponse.json({ error: TOO_LARGE_MESSAGE }, { status: 413 });
    }

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
    if (birthDate && !BIRTH_DATE_RE.test(birthDate)) {
      return NextResponse.json(
        { error: "Date of birth must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }
    if (idType && !TAX_ID_TYPES.has(idType) && !GOV_ID_TYPES.has(idType)) {
      return NextResponse.json(
        { error: `Unsupported ID type "${idType}". Please choose a valid document type.` },
        { status: 400 }
      );
    }

    const idInfo: KycIdentifyingInfo = {
      type: idType,
      issuing_country: idCountry.toLowerCase(),
      number: idNumber,
    };
    const documents: KycDocument[] = [];

    // Top-up path: the customer is already on file and the only outstanding
    // requirement is a tax ID. In that case we send a minimal PUT with just the
    // tax identifier instead of re-validating/re-submitting the whole profile.
    if (user.bridgeCustomerId && idType && idNumber) {
      let existing: BridgeCustomer | null = null;
      try {
        existing = await bridge.getCustomer(user.bridgeCustomerId);
      } catch {
        existing = null;
      }
      if (existing && onlyTaxIdMissing(existing)) {
        if (!TAX_ID_TYPES.has(idType)) {
          return NextResponse.json(
            { error: "Please choose a valid tax ID type (e.g. SSN or TIN)." },
            { status: 400 }
          );
        }
        const customer = await bridge.submitDirectKyc(user.bridgeCustomerId, {
          identifying_information: [idInfo],
        });
        const kyc_status = bridge.deriveKycStatus(customer);
        await updateUserDoc(user.uid, { kycStatus: kyc_status });
        return NextResponse.json({
          customer_id: customer.id,
          kyc_status,
          endorsements: customer.endorsements ?? [],
        });
      }
    }

    if (mode === "advanced") {
      // Higher-assurance tier: require ID image + proof of address.
      const imageFront = str(body.id_image_front);
      const imageBack = str(body.id_image_back);
      const proof = str(body.proof_of_address);

      if ([imageFront, imageBack, proof].some((v) => v.length > MAX_IMAGE_CHARS)) {
        return NextResponse.json({ error: TOO_LARGE_MESSAGE }, { status: 413 });
      }
      if (imageFront.length + imageBack.length > MAX_COMBINED_ID_CHARS) {
        return NextResponse.json(
          {
            error:
              "Your ID front and back images together exceed the 24MB limit. Please compress them and try again.",
          },
          { status: 413 }
        );
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
