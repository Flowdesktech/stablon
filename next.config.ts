import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Keep firebase-admin (and its native/optional deps) out of the bundle so it
  // runs in the Node serverless runtime instead of being traced/bundled.
  serverExternalPackages: [
    "firebase-admin",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  outputFileTracingIncludes: {
    "/api/invoice-generator/*": [
      "./src/lib/invoicing/html-templates/**/*.html",
      "node_modules/@sparticuz/chromium/bin/*.br",
    ],
    "/api/invoicing/invoices/**": [
      "./src/lib/invoicing/html-templates/**/*.html",
      "node_modules/@sparticuz/chromium/bin/*.br",
    ],
    "/api/invoicing/recurring/**": [
      "./src/lib/invoicing/html-templates/**/*.html",
      "node_modules/@sparticuz/chromium/bin/*.br",
    ],
    "/api/cron/recurring-invoices": [
      "./src/lib/invoicing/html-templates/**/*.html",
      "node_modules/@sparticuz/chromium/bin/*.br",
    ],
  },
};

export default nextConfig;
