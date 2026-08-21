import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

const effectiveDate = "August 20, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms governing access to Stablon business payment, invoicing, recurring billing, and invoice PDF services.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
    title: "Terms of Service",
    description:
      "Terms governing access to Stablon business payment and invoicing services.",
  },
  twitter: {
    card: "summary",
    title: "Stablon Terms of Service",
    description:
      "Terms governing access to Stablon business payment and invoicing services.",
  },
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    paragraphs: [
      <>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of Stablon,
        including its websites, applications, invoicing tools, payment workflows, and related
        services (collectively, the &quot;Services&quot;). By creating an account or using the
        Services, you agree to these Terms and our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </>,
      "If you use the Services for a company or other organization, you represent that you have authority to accept these Terms on its behalf.",
    ],
  },
  {
    id: "services",
    title: "The Services",
    paragraphs: [
      "Stablon provides software for business payment workflows, client and invoice management, PDF generation, recurring invoice schedules, email delivery, public invoice links, and payment-status tracking.",
      "Some payment, account, card, transfer, conversion, identity-verification, or settlement features are supplied by third-party financial infrastructure providers. Features can differ by account, currency, asset, network, jurisdiction, verification status, and provider availability.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility and accounts",
    paragraphs: [
      "You must be legally capable of entering into these Terms and must use the Services only for lawful business or professional purposes. Payment features may have additional age, residency, business, or eligibility requirements imposed by a provider or applicable law.",
    ],
    bullets: [
      "Provide accurate, current, and complete account and business information.",
      "Keep credentials, authentication codes, recovery codes, and devices secure.",
      "Notify us promptly through the contact page if you suspect unauthorized access.",
      "Remain responsible for activity performed through your account unless prohibited by law.",
    ],
  },
  {
    id: "providers",
    title: "Third-party financial services",
    paragraphs: [
      "Stablon is an application interface and is not itself a bank. Bridge and other identified providers may supply regulated financial infrastructure, account details, identity checks, transfers, settlement, or payment processing. Their separate terms, privacy notices, restrictions, and decisions may apply.",
      "A provider may approve, reject, delay, reverse, limit, or investigate a transaction or account. Stablon cannot guarantee provider approval, uninterrupted access to a payment rail, or a fixed settlement time.",
    ],
  },
  {
    id: "verification",
    title: "Identity verification and compliance",
    paragraphs: [
      "Creating an invoice PDF does not require payment-account verification. Enabling payment collection or other regulated features can require identity or business verification and continuing compliance review.",
      "You authorize Stablon to transmit information needed to the relevant provider and acknowledge that the provider may request additional information. You must not misrepresent your identity, business, transaction purpose, source of funds, or beneficial ownership.",
    ],
  },
  {
    id: "invoicing",
    title: "Invoices and user content",
    paragraphs: [
      "You are responsible for invoice numbers, customer details, line items, taxes, discounts, due dates, payment terms, branding, attachments, and other content you create or upload. Stablon does not determine whether an invoice satisfies legal, tax, accounting, recordkeeping, or disclosure requirements.",
      "You retain ownership of your content. You grant Stablon a limited right to host, process, reproduce, and transmit it only as needed to operate, secure, and improve the Services or comply with law.",
    ],
  },
  {
    id: "payments",
    title: "Payment instructions and transaction risks",
    paragraphs: [
      "Review the invoice issuer, amount, currency, asset, network, destination, bank details, reference, and fees before sending money. Blockchain transfers and some bank transfers can be irreversible. Sending the wrong asset, using the wrong network, omitting a required reference, or paying altered instructions can result in delayed or lost funds.",
      "Provider-reported status is the authoritative source for an integrated payment. Screenshots, transaction hashes, or messages from a payer do not by themselves establish final settlement.",
    ],
  },
  {
    id: "fees",
    title: "Fees and taxes",
    paragraphs: [
      "Fees may apply to account provisioning, transfers, payment processing, conversion, blockchain networks, cards, or other provider services. Applicable fees can vary by account, route, asset, network, and destination. Review the transaction information presented before confirming an action.",
      "You are responsible for taxes, duties, reporting, withholding, and professional advice related to your business, invoices, receipts, and use of the Services.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: ["You may not use or attempt to use the Services to:"],
    bullets: [
      "Violate law, sanctions, provider restrictions, or another person's rights.",
      "Facilitate fraud, money laundering, deceptive invoices, phishing, or unauthorized payments.",
      "Distribute malware, probe security controls, disrupt the Services, or access another account.",
      "Provide false information, impersonate another party, or conceal a transaction's true purpose.",
      "Copy, resell, reverse engineer, or abuse the Services except where applicable law permits it.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Stablon intellectual property",
    paragraphs: [
      "The Services, software, design, documentation, and Stablon branding are protected by applicable intellectual-property laws. These Terms grant you a limited, revocable, non-exclusive, non-transferable right to use the Services in accordance with these Terms. They do not transfer ownership of Stablon technology or branding.",
    ],
  },
  {
    id: "availability",
    title: "Availability and changes",
    paragraphs: [
      "We may maintain, modify, suspend, or discontinue features to address security, legal, provider, operational, or product requirements. We do not guarantee that every feature or payment route will always be available or that the Services will be uninterrupted or error-free.",
      "You should keep copies of invoices and records needed for your business and should not rely on Stablon as your only recordkeeping system.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      "To the maximum extent permitted by law, the Services are provided on an \"as is\" and \"as available\" basis without warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted availability, or guaranteed financial outcome.",
      "Stablon does not provide legal, tax, accounting, investment, or financial advice. Information in the Services, FAQ, and guides is general information and should not replace qualified professional advice.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, Stablon and its operators, affiliates, personnel, and service providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, data, goodwill, business opportunities, or digital assets arising from the Services.",
      "Nothing in these Terms excludes liability that cannot legally be excluded or limited. Your local law may provide rights or remedies that override part of this section.",
    ],
  },
  {
    id: "suspension",
    title: "Suspension and termination",
    paragraphs: [
      "You may stop using the Services at any time. We may restrict, suspend, or terminate access when reasonably necessary to address suspected fraud, security risk, legal obligations, provider requirements, unpaid fees, prohibited activity, or material breach of these Terms.",
      "Termination does not cancel completed transactions or obligations that arose before termination. Sections that by their nature should survive termination will remain effective.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    paragraphs: [
      "We may update these Terms as the Services, providers, or legal requirements change. We will publish the updated version and revise the effective date. When required, we will provide additional notice. Continued use after an update becomes effective constitutes acceptance to the extent permitted by law.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      <>
        Questions about these Terms can be sent through the <Link href="/contact" className="text-primary hover:underline">Stablon contact page</Link>. Account-specific support requests should include enough context to identify the issue, but never include passwords, authentication codes, private keys, or full payment credentials.
      </>,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms explain the rules and responsibilities that apply when you access Stablon payment and invoicing services."
      effectiveDate={effectiveDate}
      sections={sections}
    />
  );
}
