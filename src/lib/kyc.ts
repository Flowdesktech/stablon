import type { BridgeCustomer } from "@/types/bridge";

// Friendly labels for the Bridge requirement codes a user can actually act on.
const REQUIREMENT_LABELS: Record<string, string> = {
  government_id_document: "Government ID document",
  id_document: "Government ID document",
  proof_of_address: "Proof of address",
  selfie_verification: "Selfie verification",
  address_of_residence: "Residential address",
  date_of_birth: "Date of birth",
  tax_identification_number: "Tax ID number",
  first_name: "First name",
  last_name: "Last name",
  email_address: "Email address",
  terms_of_service_v1: "Terms of Service",
  terms_of_service_v2: "Terms of Service",
  external_account: "Linked bank account",
};

// Requirement codes Bridge resolves internally — never actionable by the user,
// so we hide them from the "what's left" checklist.
const INTERNAL_REQUIREMENTS = new Set([
  "post_processing",
  "sanctions_screen",
  "pep_screen",
  "blocklist_lookup",
  "pre_onboarding_check",
  "keyword_screening_individual",
  "kyc_approval",
  "kyc_with_proof_of_address",
  "min_age_18",
  "valid_date_of_birth",
  "duplicate_check_tax_id_hash",
  "duplicate_check_name_dob",
  "stripe_database_lookup_bridge_address",
  "stripe_database_lookup_global_dob",
]);

function humanize(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Collects the user-actionable requirements Bridge still needs across all
 * endorsements, deduped and mapped to friendly labels. Internal checks that
 * Bridge runs on its own are filtered out.
 */
export function outstandingKycRequirements(
  customer: Pick<BridgeCustomer, "endorsements"> | null | undefined
): string[] {
  const codes = new Set<string>();
  for (const endorsement of customer?.endorsements ?? []) {
    const missing = endorsement.requirements?.missing;
    if (!missing) continue;
    for (const code of [...(missing.all_of ?? []), ...(missing.any_of ?? [])]) {
      if (!INTERNAL_REQUIREMENTS.has(code)) codes.add(code);
    }
  }
  return [...codes].map((code) => REQUIREMENT_LABELS[code] ?? humanize(code));
}
