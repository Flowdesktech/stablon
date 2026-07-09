"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useProfile } from "@/hooks/use-profile";
import { requestTosLink, submitDirectKyc, useOccupationCodes } from "@/hooks/use-bridge";
import type { DirectKycMode } from "@/types/bridge";
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

const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "national_id", label: "National ID" },
  { value: "state_or_provincial_id", label: "State / provincial ID" },
  { value: "ssn", label: "SSN (US)" },
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
  const { occupations, isLoading: occupationsLoading } = useOccupationCodes();

  const occupationOptions = useMemo(
    () => occupations.map((o) => ({ value: o.code, label: o.display_name })),
    [occupations]
  );

  const [mode, setMode] = useState<DirectKycMode>("little");
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

  const [idType, setIdType] = useState("passport");
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
      window.open(url, "bridge-tos", "width=520,height=720");
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
    if (file.size > 15 * 1024 * 1024) {
      toast({ variant: "error", title: "File too large", description: "Max size is 15MB." });
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

  const canSubmit = useMemo(
    () => Boolean(signedAgreementId) && !submitting,
    [signedAgreementId, submitting]
  );

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
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-white font-medium">You&apos;re already verified</p>
            <p className="text-sm text-white/50">Your identity has been approved by Bridge.</p>
            <Link href="/settings">
              <Button variant="outline">Back to settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Verify your identity</h1>
        <p className="text-white/50 mt-1">
          Complete verification in-app to unlock deposits, payouts, and cards.
        </p>
      </div>

      {/* Mode selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModeCard
          active={mode === "little"}
          onClick={() => setMode("little")}
          icon={<Zap className="w-5 h-5 text-amber-400" />}
          title="Quick verification"
          desc="Basic details only — no documents. Fastest way to get started."
        />
        <ModeCard
          active={mode === "advanced"}
          onClick={() => setMode("advanced")}
          icon={<FileCheck2 className="w-5 h-5 text-purple-400" />}
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
            <div className="flex items-center gap-2 text-sm text-emerald-400">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="State / region code">
              <Input value={subdivision} onChange={(e) => setSubdivision(e.target.value)} placeholder="e.g. NY, MAN" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Postal code">
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </Field>
            <Field label="Country (3-letter code)">
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="USA, GBR, ARG…"
                maxLength={3}
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
              ? "Provide your ID number and upload photos of the document."
              : "Provide a government ID or tax number."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Document type">
              <Select value={idType} onChange={setIdType} options={ID_TYPES} />
            </Field>
            <Field label="Issuing country (3-letter)">
              <Input
                value={idCountry}
                onChange={(e) => setIdCountry(e.target.value.toUpperCase())}
                placeholder="USA, GBR…"
                maxLength={3}
              />
            </Field>
          </div>
          <Field label="Document / ID number">
            <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </Field>

          {mode === "advanced" && (
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Employment status">
                <Select value={employmentStatus} onChange={setEmploymentStatus} options={EMPLOYMENT} placeholder="Select…" />
              </Field>
              <Field label="Expected monthly volume">
                <Select value={monthlyVolume} onChange={setMonthlyVolume} options={MONTHLY_VOLUME} placeholder="Select…" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source of funds">
                <Select value={sourceOfFunds} onChange={setSourceOfFunds} options={SOURCE_OF_FUNDS} placeholder="Select…" />
              </Field>
              <Field label="Account purpose">
                <Select value={accountPurpose} onChange={setAccountPurpose} options={ACCOUNT_PURPOSE} placeholder="Select…" />
              </Field>
            </div>
            <Field label="Occupation (optional)">
              <Select
                value={occupation}
                onChange={setOccupation}
                options={occupationOptions}
                placeholder={occupationsLoading ? "Loading occupations…" : "Select occupation…"}
              />
            </Field>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/40">
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

      <p className="text-center text-xs text-white/30">
        Prefer the guided flow?{" "}
        <Link href="/settings" className="text-purple-400 hover:underline">
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
      className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
        active
          ? "border-purple-500/60 bg-purple-500/10"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-white font-medium">{title}</span>
        {active && <ShieldCheck className="w-4 h-4 text-purple-300 ml-auto" />}
      </div>
      <p className="text-xs text-white/50 mt-2">{desc}</p>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1">{label}</label>
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
      className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-2 text-sm text-white outline-none focus:border-purple-500/50 cursor-pointer"
    >
      {placeholder && <option value="" className="bg-[#14141c]">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#14141c]">
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
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1">{label}</label>
      <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors text-sm text-white/70">
        {value ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> File attached
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
