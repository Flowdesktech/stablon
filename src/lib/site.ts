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
  title: "Stablon — Global USD & EUR Accounts, Stablecoin Card & Yield",
  tagline: "One app. One card. Everything money.",
  description:
    "Stablon is a global money app: open USD and EUR accounts, move money by bank transfer or on-chain, spend stablecoins with a Visa card at 200M+ merchants, swap instantly, and earn up to 5% APY. Powered by Bridge.xyz.",
  ogDescription:
    "Open USD & EUR accounts, spend stablecoins with a Visa card, swap instantly, and earn up to 5% APY — from 160+ countries.",
  keywords: [
    "stablecoin banking",
    "USD account",
    "EUR account",
    "stablecoin Visa card",
    "crypto debit card",
    "stablecoin yield",
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
