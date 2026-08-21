import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

const effectiveDate = "August 20, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Stablon collects, uses, shares, stores, and protects information when providing business payment and invoicing services.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    title: "Privacy Policy",
    description:
      "How Stablon handles information used for business payment and invoicing services.",
  },
  twitter: {
    card: "summary",
    title: "Stablon Privacy Policy",
    description:
      "How Stablon handles information used for business payment and invoicing services.",
  },
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope",
    paragraphs: [
      "This Privacy Policy explains how Stablon collects, uses, discloses, and protects information when you visit our website, create an account, use invoicing tools, access payment workflows, contact support, or otherwise use the Services.",
      <>
        This policy should be read with our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>. Third-party financial providers can process information under their own privacy notices when they provide identity verification, accounts, transfers, settlement, or other regulated services.
      </>,
    ],
  },
  {
    id: "information-collected",
    title: "Information we collect",
    paragraphs: ["Depending on the features you use, we can collect the following categories:"],
    bullets: [
      "Account information, such as name, email address, authentication identifiers, profile details, preferences, and security settings.",
      "Business and verification information, such as business name, address, contact details, occupation, intended account use, and information requested by a financial provider.",
      "Invoice and client information, including sender and recipient details, line items, taxes, discounts, terms, notes, templates, due dates, email-delivery status, and recurring schedules.",
      "Payment and transaction information, such as provider identifiers, account and wallet references, payment routes, currencies, assets, amounts, destinations, references, fees, and status updates.",
      "Support communications and information you submit through contact forms.",
      "Technical and security information, including IP address, browser and device data, request logs, session activity, rate-limit signals, and events used to prevent fraud or protect accounts.",
    ],
  },
  {
    id: "sources",
    title: "Sources of information",
    paragraphs: ["We can receive information:"],
    bullets: [
      "Directly from you when you register, complete forms, create invoices, configure payments, or contact support.",
      "From your organization or an authorized account administrator.",
      "From Bridge and other service providers that return verification, account, transfer, payment, or delivery status.",
      "Automatically from your browser, device, cookies, local storage, and server logs.",
    ],
  },
  {
    id: "use",
    title: "How we use information",
    paragraphs: ["We use information as reasonably necessary to:"],
    bullets: [
      "Create and secure accounts, authenticate users, and provide requested product features.",
      "Generate, store, deliver, and display invoices and recurring schedules.",
      "Initiate provider workflows and reconcile payment or transfer updates.",
      "Perform identity, eligibility, fraud, sanctions, security, and compliance checks directly or through providers.",
      "Provide support, communicate service or security information, and respond to requests.",
      "Maintain, troubleshoot, analyze, and improve reliability, accessibility, and user experience.",
      "Enforce terms, protect users and the Services, and comply with legal obligations.",
    ],
  },
  {
    id: "legal-bases",
    title: "Legal bases",
    paragraphs: [
      "Where data-protection law requires a legal basis, we process information to perform a contract with you, comply with legal obligations, protect legitimate interests such as security and service improvement, protect vital interests, or act with consent where consent is required.",
      "You can withdraw consent for future processing where consent is the applicable basis. Withdrawal does not affect processing already performed or processing supported by another lawful basis.",
    ],
  },
  {
    id: "sharing",
    title: "How we share information",
    paragraphs: [
      "We do not sell personal information for money. We can disclose information to the following recipients when needed for the purposes described in this policy:",
    ],
    bullets: [
      "Bridge and other financial infrastructure providers that support verification, accounts, transfers, settlement, cards, or payment services.",
      "Firebase and Google services used for authentication, server administration, and application data storage.",
      "Hosting, infrastructure, security, monitoring, and deployment providers such as Vercel.",
      "Email providers such as Resend when you send invoices or support requests.",
      "Payment processors such as NOWPayments if an enabled account-setup billing flow is used.",
      "Professional advisers, auditors, authorities, or other parties when required by law or reasonably necessary to protect rights, safety, and the Services.",
      "A successor or transaction participant in a merger, financing, reorganization, sale, or transfer of all or part of the service, subject to appropriate safeguards.",
    ],
  },
  {
    id: "provider-roles",
    title: "Financial-provider privacy",
    paragraphs: [
      "A financial provider can act as an independent controller or equivalent decision-maker for information it needs to meet legal, risk, verification, or transaction obligations. Its privacy notice and retention requirements may apply in addition to this policy.",
      "Stablon does not control a provider's independent eligibility, compliance, or retention decisions. Review the provider disclosures shown during onboarding or payment setup.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    paragraphs: [
      "Stablon uses essential session cookies to keep authenticated users signed in and protect restricted pages. The application can also use browser local storage for preferences and security-related state, including the selected color theme and app-lock activity.",
      "These technologies are used for service operation, security, and preferences rather than cross-site advertising. Blocking essential storage can prevent authentication or product features from working correctly.",
    ],
  },
  {
    id: "public-invoices",
    title: "Public invoice links",
    paragraphs: [
      "When an account holder publishes or sends an invoice, people with its unguessable public link can view the information included in the public invoice and, where enabled, access payment options. Account holders should include only information appropriate for sharing with the intended payer.",
      "Do not post public invoice links in public channels unless you intend the linked invoice information to be accessible there. Contact the invoice issuer if you receive a link unexpectedly or believe payment instructions were altered.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "We retain information for as long as reasonably necessary to provide the Services, maintain business and security records, resolve disputes, enforce agreements, and satisfy legal, tax, accounting, fraud-prevention, and provider obligations.",
      "Retention periods differ by data type and context. Deleting an account does not always require immediate deletion of records that must be retained by law, a financial provider, or legitimate security and dispute-resolution needs.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "Stablon uses controls designed to protect information, including server-side authorization, protected session cookies, restricted Firestore client access, encryption of selected sensitive account values, optional two-factor authentication, unguessable public invoice tokens, rate limiting, and signed payment-webhook verification.",
      "No service or transmission method is completely secure. Keep credentials and devices protected, verify payment instructions, and notify us if you suspect unauthorized account activity.",
    ],
  },
  {
    id: "choices",
    title: "Your choices and rights",
    paragraphs: [
      "Depending on your location, you may have rights to access, correct, delete, restrict, object to, or obtain a copy of personal information, and to appeal or complain to a data-protection authority. These rights can be limited by legal, security, identity-verification, or financial-record obligations.",
      "You can update certain profile and security information in the application. For other requests, use the contact page. We may need to verify your identity and authority before fulfilling a request.",
    ],
  },
  {
    id: "international",
    title: "International processing",
    paragraphs: [
      "Stablon and its providers can process information in countries other than where you live. Those countries may have different data-protection laws. Where required, appropriate contractual or legal safeguards are used for international transfers.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "The Services are intended for business and professional users and are not directed to children. Do not create an account or provide personal information if you are below the minimum age required to enter a binding contract in your location or below any higher age required by an applicable financial provider.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this policy as the Services, providers, or legal requirements change. We will publish the revised policy and update the effective date. When required, we will provide additional notice or request consent.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      <>
        To ask a privacy question or submit a rights request, use the <Link href="/contact" className="text-primary hover:underline">Stablon contact page</Link>. Do not include passwords, authentication codes, private keys, or full payment credentials in your message.
      </>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="This policy explains the information Stablon handles, why it is used, and the choices available to users."
      effectiveDate={effectiveDate}
      sections={sections}
    />
  );
}
