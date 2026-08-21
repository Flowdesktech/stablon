import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { marketingFaqs } from "@/lib/marketing-content";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Business Payments & Invoice FAQ",
  description:
    "Answers about business money accounts, bank and stablecoin invoice payments, USDC checkout, verification, settlement, recurring invoices, PDF delivery, and payment tracking.",
  keywords: [
    "business payment FAQ",
    "invoice payment FAQ",
    "stablecoin invoice payment",
    "how to accept USDC invoice payment",
    "bank transfer invoice payment",
    "recurring invoice questions",
    "invoice PDF email",
  ],
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    url: "/faq",
    title: "Business Payments & Invoice FAQ",
    description:
      "Understand Stablon payment accounts, verification, bank and stablecoin checkout, settlement, invoicing, and recurring billing.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/faq#faq`,
      mainEntity: marketingFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "FAQ", item: `${siteUrl}/faq` },
      ],
    },
  ],
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-muted text-primary">
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Business payments and invoicing FAQ
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Clear answers about account verification, payment availability, invoice
              checkout, settlement status, PDF delivery, and recurring billing.
            </p>
          </div>
        </section>

        <section
          aria-label="Frequently asked questions"
          className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]">
            {marketingFaqs.map((faq) => (
              <details key={faq.question} className="group p-5 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-medium sm:text-base">
                  {faq.question}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-12 rounded-lg border border-border bg-surface p-8 text-center">
            <h2 className="text-xl font-semibold">Need help with a specific workflow?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Read the implementation guides or contact the Stablon team with your account
              and payment-route question.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/blog" className={buttonVariants({ variant: "outline" })}>
                Read payment guides
              </Link>
              <Link href="/contact" className={buttonVariants()}>
                Contact support
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
