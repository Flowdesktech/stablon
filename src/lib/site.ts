// Central site metadata used across SEO surfaces (layout metadata, sitemap,
// robots, manifest, JSON-LD). Keep marketing copy here so it stays consistent.

function resolveSiteUrl(): string {
  // Explicit override wins (set NEXT_PUBLIC_SITE_URL to your custom domain).
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  // On Vercel, fall back to the production deployment URL automatically.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();

export const siteConfig = {
  name: "Stablon",
  shortName: "Stablon",
  url: siteUrl,
  title: "Stablon — Business Payments & Invoicing",
  tagline: "Manage payments. Invoice clients. Track settlement.",
  description:
    "Manage supported business money accounts, bank and stablecoin payment workflows, professional invoices, recurring billing, and payment reconciliation in one platform.",
  ogDescription:
    "Manage business payments and create professional invoices with supported ACH, wire, SEPA, USDC, and USDT workflows.",
  keywords: [
    "invoice software",
    "online invoice generator",
    "stablecoin payments",
    "business payment platform",
    "global business account",
    "business money account",
    "stablecoin invoicing",
    "USDC invoice",
    "recurring invoices",
    "freelancer invoicing",
    "international invoice payments",
    "ACH invoice payment",
    "SEPA invoice payment",
    "stablecoin banking",
    "USD account",
    "EUR account",
    "on-ramp",
    "off-ramp",
    "USDC",
    "USDT",
    "global payments",
    "SEPA",
    "ACH",
    "Bridge.xyz",
    "digital dollar account",
  ],
  locale: "en_US",
  twitter: "@stablon",
  creator: "Stablon",
} as const;
