import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, LockKeyhole } from "lucide-react";
import { InvoiceGeneratorForm } from "@/components/invoicing/invoice-generator-form";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Free Online Invoice Generator — Create a PDF Invoice",
  description:
    "Create a professional invoice PDF online with 15 templates. Add client details, line items, tax and discounts, then download instantly without an account.",
  keywords: [
    "free invoice generator",
    "online invoice generator",
    "invoice PDF",
    "create invoice online",
    "freelance invoice template",
  ],
  alternates: { canonical: "/invoice-generator" },
  openGraph: {
    type: "website",
    url: "/invoice-generator",
    title: "Free Online Invoice Generator",
    description:
      "Create and download a professional invoice PDF with 15 templates. No account required.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Stablon Free Invoice Generator",
  url: `${siteUrl}/invoice-generator`,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Create and download a professional invoice PDF online with 15 invoice templates.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function InvoiceGeneratorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-border bg-surface">
        <nav
          aria-label="Invoice generator"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"
        >
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            Stablon
          </Link>
          <Link href="/" className="flex items-center gap-2 rounded-md text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 grid gap-6 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Public invoice tool
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Create a professional invoice PDF
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Add invoice details, choose a template, review the preview, and download the PDF
              when it is ready.
            </p>
          </div>
          <div className="flex max-w-md items-start gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Draft details stay in this browser for reload recovery. They are not saved to
              Stablon servers, emailed, or connected to payments.
            </p>
          </div>
        </div>

        <InvoiceGeneratorForm />
      </main>
    </div>
  );
}
