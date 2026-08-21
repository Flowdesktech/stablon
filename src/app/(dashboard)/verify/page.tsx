"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { CountrySelect, Combobox } from "@/components/ui/country-select";
import { toast } from "@/components/ui/toast";
import { useProfile } from "@/hooks/use-profile";
import { requestTosLink, submitDirectKyc, useCustomer, useOccupationCodes } from "@/hooks/use-bridge";
import { kycGaps, hasGaps } from "@/lib/kyc";
import type { BridgeCustomer, DirectKycMode } from "@/types/bridge";
import {
  ShieldCheck,
  Zap,
  FileCheck2,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Upload,
  ExternalLink,
} from "lucide-react";

// Database-verification ("little") mode identifies the user with a TAX ID
// (checked against Bridge's databases — no document photo is required). A
// government photo ID here would still count as a tax id without an image, and
// would leave the customer stuck on `government_id_document`.
const TAX_ID_TYPES = [
  { value: "tin", label: "Tax identification number (TIN)" },
  { value: "ssn", label: "Social Security number (US)" },
];

// Full verification uploads photos of a government-issued photo ID.
const GOV_ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "national_id", label: "National ID" },
  { value: "state_or_provincial_id", label: "State / provincial ID" },
];

const EMPLOYMENT = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
  { value: "homemaker", label: "Homemaker" },
];

const MONTHLY_VOLUME = [
  { value: "0_4999", label: "$0 – $4,999" },
  { value: "5000_9999", label: "$5,000 – $9,999" },
  { value: "10000_49999", label: "$10,000 – $49,999" },
  { value: "50000_plus", label: "$50,000+" },
];

const SOURCE_OF_FUNDS = [
  { value: "salary", label: "Salary" },
  { value: "company_funds", label: "Business / company funds" },
  { value: "investments_loans", label: "Investments / loans" },
  { value: "savings", label: "Savings" },
  { value: "inheritance", label: "Inheritance" },
  { value: "gifts", label: "Gifts" },
  { value: "government_benefits", label: "Government benefits" },
  { value: "pension_retirement", label: "Pension / retirement" },
];

const ACCOUNT_PURPOSE = [
  { value: "receive_payment_for_freelancing", label: "Receive freelance payments" },
  { value: "receive_salary", label: "Receive salary" },
  { value: "purchase_goods_and_services", label: "Purchase goods & services" },
  { value: "personal_or_living_expenses", label: "Personal / living expenses" },
  { value: "investment_purposes", label: "Investment purposes" },
  { value: "operating_a_company", label: "Operating a company" },
  { value: "other", label: "Other" },
];

// A contextual placeholder / format hint for the identifier number field.
const ID_NUMBER_PLACEHOLDER: Record<string, string> = {
  ssn: "e.g. 123-45-6789",
  tin: "e.g. 12-3456789",
};

function idNumberPlaceholder(idType: string): string {
  return ID_NUMBER_PLACEHOLDER[idType] ?? "ID / document number";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function VerifyPage() {
  const router = useRouter();
  const { profile, mutate } = useProfile();
  const { customer } = useCustomer();
  const { occupations, isLoading: occupationsLoading } = useOccupationCodes();

  // Work out exactly which fields are still outstanding for this customer. For a
  // returning user we render ONLY the missing sections (a "top-up"); a brand-new
  // user gets the full questionnaire.
  const gaps = useMemo(() => kycGaps(customer as BridgeCustomer | null), [customer]);
  // A top-up applies to a customer already on file with something still missing
  // but without needing the ToS step again (that's handled separately).
  const hasCustomer = Boolean((customer as BridgeCustomer | null)?.id);
  const isTopUp = hasCustomer && hasGaps(gaps) && !gaps.terms;

  const occupationOptions = useMemo(
    () => occupations.map((o) => ({ value: o.code, label: o.display_name })),
    [occupations]
  );

  // Switching tier resets the ID type to a valid value for that tier (tax id for
  // database checks, photo id for document verification).
  function selectMode(next: DirectKycMode) {
    setMode(next);
    setIdType(next === "advanced" ? "passport" : "tin");
  }

  // During a top-up that requires a government photo ID we need a document
  // (advanced mode) even if the user's default tier is "little".
  const [mode, setMode] = useState<DirectKycMode>("little");
  const effectiveMode: DirectKycMode = isTopUp && gaps.govId ? "advanced" : mode;
  const idTypeOptions = effectiveMode === "advanced" ? GOV_ID_TYPES : TAX_ID_TYPES;
  const [signedAgreementId, setSignedAgreementId] = useState("");
  const [tosLoading, setTosLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");

  const [streetLine1, setStreetLine1] = useState("");
  const [streetLine2, setStreetLine2] = useState("");
  const [city, setCity] = useState("");
  const [subdivision, setSubdivision] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const [idType, setIdType] = useState("tin");
  const [idCountry, setIdCountry] = useState("");
  const [idNumber, setIdNumber] = useState("");

  const [idImageFront, setIdImageFront] = useState("");
  const [idImageBack, setIdImageBack] = useState("");
  const [proofOfAddress, setProofOfAddress] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [accountPurpose, setAccountPurpose] = useState("");
  const [occupation, setOccupation] = useState("");

  // Prefill name from the profile the first time it loads.
  useEffect(() => {
    if (!profile?.name || firstName || lastName) return;
    const parts = profile.name.trim().split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" ") || "");
  }, [profile?.name, firstName, lastName]);

  // On a top-up, prefill the issuing country from the customer's country of
  // residence.
  useEffect(() => {
    if (idCountry) return;
    const c = (customer as BridgeCustomer | null)?.residential_address?.country;
    if (c) setIdCountry(c.toUpperCase());
  }, [customer, idCountry]);

  // Keep the ID type valid for the effective mode. In a top-up the mode isn't
  // chosen via ModeCard, so we derive the right default from the gap itself.
  useEffect(() => {
    if (effectiveMode === "advanced" && !GOV_ID_TYPES.some((t) => t.value === idType)) {
      setIdType("passport");
    } else if (effectiveMode === "little" && !TAX_ID_TYPES.some((t) => t.value === idType)) {
      setIdType("tin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode]);

  // Receive the signed_agreement_id relayed from the ToS popup.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "bridge-tos-accepted" && e.data.signedAgreementId) {
        setSignedAgreementId(e.data.signedAgreementId);
        toast({ variant: "success", title: "Terms accepted", description: "You can finish verifying now." });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function handleAcceptTos() {
    setTosLoading(true);
    try {
      const redirectUri = `${window.location.origin}/kyc-callback`;
      const url = await requestTosLink(redirectUri);
      const popup = window.open(url, "bridge-tos", "width=520,height=720");
      // Popup blocked → fall back to a full tab so the user can still accept.
      if (!popup) window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't open Terms of Service",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setTosLoading(false);
    }
  }

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Bridge caps each document image at 15MB (and 24MB combined front+back).
    if (file.size > 15 * 1024 * 1024) {
      toast({
        variant: "error",
        title: "File too large",
        description: "Max size is 15MB per file. Please compress it and try again.",
      });
      return;
    }
    try {
      setter(await fileToDataUrl(file));
    } catch (err) {
      toast({
        variant: "error",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try another file.",
      });
    }
  }

  // A top-up only needs the fields that are actually outstanding.
  const topUpReady =
    (!gaps.taxId || Boolean(idNumber.trim())) &&
    (!gaps.govId || Boolean(idNumber.trim() && idImageFront)) &&
    (!gaps.proofOfAddress || Boolean(proofOfAddress)) &&
    (!gaps.questionnaire || Boolean(employmentStatus && sourceOfFunds && accountPurpose));

  const canSubmit = useMemo(
    () => !submitting && (isTopUp ? topUpReady : Boolean(signedAgreementId)),
    [submitting, isTopUp, topUpReady, signedAgreementId]
  );

  async function handleTopUpSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const fallbackCountry =
        idCountry || (customer as BridgeCustomer | null)?.residential_address?.country || "USA";
      const data = await submitDirectKyc({
        mode: effectiveMode,
        ...(gaps.taxId && { id_type: idType, id_country: fallbackCountry, id_number: idNumber }),
        ...(gaps.govId && {
          id_type: idType,
          id_country: fallbackCountry,
          id_number: idNumber,
          id_image_front: idImageFront,
          id_image_back: idImageBack,
        }),
        ...(gaps.proofOfAddress && { proof_of_address: proofOfAddress }),
        ...(gaps.questionnaire && {
          employment_status: employmentStatus,
          expected_monthly_payments_usd: monthlyVolume,
          source_of_funds: sourceOfFunds,
          account_purpose: accountPurpose,
          most_recent_occupation: occupation,
        }),
      });
      mutate();
      const status = data.kyc_status as string;
      toast({
        variant: "success",
        title: status === "approved" ? "You're verified!" : "Details submitted",
        description:
          status === "approved"
            ? "Your identity has been verified."
            : "Bridge is finishing up your verification — this usually takes under a minute.",
      });
      router.push("/settings");
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't submit your details",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const data = await submitDirectKyc({
        mode,
        signed_agreement_id: signedAgreementId,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        phone,
        address: {
          street_line_1: streetLine1,
          street_line_2: streetLine2,
          city,
          subdivision,
          postal_code: postalCode,
          country,
        },
        id_type: idType,
        id_country: idCountry,
        id_number: idNumber,
        ...(mode === "advanced" && {
          id_image_front: idImageFront,
          id_image_back: idImageBack,
          proof_of_address: proofOfAddress,
          employment_status: employmentStatus,
          expected_monthly_payments_usd: monthlyVolume,
          source_of_funds: sourceOfFunds,
          account_purpose: accountPurpose,
          most_recent_occupation: occupation,
        }),
      });
      mutate();
      const status = data.kyc_status as string;
      toast({
        variant: "success",
        title: status === "approved" ? "You're verified!" : "Verification submitted",
        description:
          status === "approved"
            ? "Your identity has been verified."
            : "Bridge is reviewing your details — this usually takes under a minute.",
      });
      router.push("/settings");
    } catch (err) {
      toast({
        variant: "error",
        title: "Verification failed",
        description: err instanceof Error ? err.message : "Please review your details and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (profile?.kycStatus === "approved") {
    return (
      <div className="max-w-2xl animate-fade-in">
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="font-medium text-foreground">You&apos;re already verified</p>
            <p className="text-sm text-muted-foreground">Your identity has been approved.</p>
            <Button asChild variant="outline">
              <Link href="/settings">Back to settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Top-up: the customer is already on file and only some fields are still
  // outstanding. Render ONLY those sections instead of the whole questionnaire.
  if (isTopUp) {
    return (
      <div className="space-y-6 animate-fade-in max-w-xl">
        <PageHeader
          title="Finish verifying"
          description="We already have most of your details. Complete the remaining items below."
        />

        {gaps.taxId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax ID number</CardTitle>
              <CardDescription>
                Checked against Bridge&apos;s databases — no photo needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Identifier type">
                  <Select value={idType} onChange={setIdType} options={TAX_ID_TYPES} />
                </Field>
                <Field label="Country of residence">
                  <CountrySelect value={idCountry} onChange={setIdCountry} placeholder="Select country…" />
                </Field>
              </div>
              <Field label="Tax ID number">
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={idNumberPlaceholder(idType)}
                />
              </Field>
            </CardContent>
          </Card>
        )}

        {gaps.govId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Government photo ID</CardTitle>
              <CardDescription>Provide your ID details and a photo of the front.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Document type">
                  <Select value={idType} onChange={setIdType} options={GOV_ID_TYPES} />
                </Field>
                <Field label="Issuing country">
                  <CountrySelect value={idCountry} onChange={setIdCountry} placeholder="Select country…" />
                </Field>
              </div>
              <Field label="Document number">
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={idNumberPlaceholder(idType)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <UploadField
                  label="ID front"
                  value={idImageFront}
                  onChange={(e) => handleUpload(e, setIdImageFront)}
                />
                <UploadField
                  label="ID back (optional)"
                  value={idImageBack}
                  onChange={(e) => handleUpload(e, setIdImageBack)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {gaps.proofOfAddress && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proof of address</CardTitle>
              <CardDescription>A recent utility bill or bank statement.</CardDescription>
            </CardHeader>
            <CardContent>
              <UploadField
                label="Proof of address"
                value={proofOfAddress}
                onChange={(e) => handleUpload(e, setProofOfAddress)}
              />
            </CardContent>
          </Card>
        )}

        {gaps.questionnaire && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">A few quick questions</CardTitle>
              <CardDescription>Bridge needs these to finish verifying you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Employment status">
                  <Select value={employmentStatus} onChange={setEmploymentStatus} options={EMPLOYMENT} placeholder="Select…" />
                </Field>
                <Field label="Expected monthly volume">
                  <Select value={monthlyVolume} onChange={setMonthlyVolume} options={MONTHLY_VOLUME} placeholder="Select…" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Source of funds">
                  <Select value={sourceOfFunds} onChange={setSourceOfFunds} options={SOURCE_OF_FUNDS} placeholder="Select…" />
                </Field>
                <Field label="Account purpose">
                  <Select value={accountPurpose} onChange={setAccountPurpose} options={ACCOUNT_PURPOSE} placeholder="Select…" />
                </Field>
              </div>
              <Field label="Occupation (optional)">
                <Combobox
                  value={occupation}
                  onChange={setOccupation}
                  options={occupationOptions}
                  placeholder={occupationsLoading ? "Loading occupations…" : "Select occupation…"}
                  searchPlaceholder="Type to search occupations…"
                />
              </Field>
            </CardContent>
          </Card>
        )}

        <Button className="w-full" disabled={!canSubmit} onClick={handleTopUpSubmit}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              Finish verification <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <PageHeader
        title="Verify your identity"
        description="Complete the required steps to unlock eligible account features."
      />

      {/* Mode selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModeCard
          active={mode === "little"}
          onClick={() => selectMode("little")}
          icon={<Zap className="h-5 w-5 text-warning" />}
          title="Quick verification"
          desc="Basic details only — no documents. Fastest way to get started."
        />
        <ModeCard
          active={mode === "advanced"}
          onClick={() => selectMode("advanced")}
          icon={<FileCheck2 className="h-5 w-5 text-info" />}
          title="Full verification"
          desc="Adds ID documents & proof of address. Unlocks EUR / SEPA and higher limits."
        />
      </div>

      {/* Terms of Service */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Accept Terms of Service</CardTitle>
          <CardDescription>Required before Bridge can verify your identity.</CardDescription>
        </CardHeader>
        <CardContent>
          {signedAgreementId ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="w-4 h-4" /> Terms of Service accepted
            </div>
          ) : (
            <Button variant="outline" onClick={handleAcceptTos} disabled={tosLoading}>
              {tosLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Review &amp; accept Terms
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Your details</CardTitle>
          <CardDescription>Enter your legal information exactly as on your ID.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date of birth">
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
            <Field label="Phone (optional)">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </Field>
          </div>

          <Field label="Street address">
            <Input value={streetLine1} onChange={(e) => setStreetLine1(e.target.value)} placeholder="123 Main St" />
          </Field>
          <Field label="Apt / suite (optional)">
            <Input value={streetLine2} onChange={(e) => setStreetLine2(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="State / region code">
              <Input value={subdivision} onChange={(e) => setSubdivision(e.target.value)} placeholder="e.g. NY, MAN" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Postal code">
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </Field>
            <Field label="Country">
              <CountrySelect
                value={country}
                onChange={(v) => {
                  setCountry(v);
                  // In quick mode the tax id is keyed to the country of residence,
                  // so keep the identifier country in sync as a sensible default.
                  if (!idCountry) setIdCountry(v);
                }}
                placeholder="Select country…"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Identity document */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Identity document</CardTitle>
          <CardDescription>
            {mode === "advanced"
              ? "Provide your government photo ID and upload photos of it."
              : "Provide the tax ID number for your country of residence (no photo needed)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={mode === "advanced" ? "Document type" : "Identifier type"}>
              <Select value={idType} onChange={setIdType} options={idTypeOptions} />
            </Field>
            <Field label={mode === "advanced" ? "Issuing country" : "Country of residence"}>
              <CountrySelect value={idCountry} onChange={setIdCountry} placeholder="Select country…" />
            </Field>
          </div>
          <Field label="Document / ID number">
            <Input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder={idNumberPlaceholder(idType)}
            />
          </Field>

          {mode === "advanced" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UploadField
                label="ID front"
                value={idImageFront}
                onChange={(e) => handleUpload(e, setIdImageFront)}
              />
              <UploadField
                label="ID back (optional)"
                value={idImageBack}
                onChange={(e) => handleUpload(e, setIdImageBack)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced-only questionnaire */}
      {mode === "advanced" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Additional details</CardTitle>
            <CardDescription>Required for full verification and EUR / SEPA access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadField
              label="Proof of address (utility bill / bank statement)"
              value={proofOfAddress}
              onChange={(e) => handleUpload(e, setProofOfAddress)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Employment status">
                <Select value={employmentStatus} onChange={setEmploymentStatus} options={EMPLOYMENT} placeholder="Select…" />
              </Field>
              <Field label="Expected monthly volume">
                <Select value={monthlyVolume} onChange={setMonthlyVolume} options={MONTHLY_VOLUME} placeholder="Select…" />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Source of funds">
                <Select value={sourceOfFunds} onChange={setSourceOfFunds} options={SOURCE_OF_FUNDS} placeholder="Select…" />
              </Field>
              <Field label="Account purpose">
                <Select value={accountPurpose} onChange={setAccountPurpose} options={ACCOUNT_PURPOSE} placeholder="Select…" />
              </Field>
            </div>
            <Field label="Occupation (optional)">
              <Combobox
                value={occupation}
                onChange={setOccupation}
                options={occupationOptions}
                placeholder={occupationsLoading ? "Loading occupations…" : "Select occupation…"}
                searchPlaceholder="Type to search occupations…"
              />
            </Field>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {signedAgreementId ? "Ready to submit." : "Accept the Terms of Service to continue."}
        </p>
        <Button disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              Submit verification <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Prefer the guided flow?{" "}
        <Link href="/settings" className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Use hosted verification
        </Link>
      </p>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        active
          ? "border-primary bg-info-muted"
          : "border-border bg-surface hover:bg-surface-muted"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-foreground">{title}</span>
        {active && <ShieldCheck className="ml-auto h-4 w-4 text-primary" />}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground shadow-[var(--shadow-sm)] outline-none transition-colors focus:border-focus focus:ring-2 focus:ring-focus/20"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function UploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-muted focus-within:ring-2 focus-within:ring-focus">
        {value ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-success" /> File attached
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" /> Choose file
          </>
        )}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onChange} />
      </label>
    </div>
  );
}
