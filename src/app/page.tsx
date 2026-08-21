import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  CircleDollarSign,
  FileText,
  Globe2,
  Landmark,
  RefreshCw,
  Repeat2,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  PublicFooter,
  PublicHeader,
  TextLink,
} from "@/components/marketing/public-shell";
import { blogPosts } from "@/lib/blog";
import { marketingFaqs } from "@/lib/marketing-content";
import { siteConfig, siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const paymentCapabilities = [
  {
    icon: Landmark,
    title: "Business money accounts",
    description:
      "Access supported USD, EUR, and GBP account details after provider onboarding and verification.",
  },
  {
    icon: Globe2,
    title: "Bank payment rails",
    description:
      "Send and receive through supported ACH, wire, SEPA, and Faster Payments routes.",
  },
  {
    icon: CircleDollarSign,
    title: "Stablecoin settlement",
    description:
      "Use supported stablecoins and networks when they are available for your account and jurisdiction.",
  },
  {
    icon: RefreshCw,
    title: "Conversion and activity",
    description:
      "Review balances, convert supported assets, and keep bank and stablecoin activity in one history.",
  },
];

const invoiceCapabilities = [
  "Itemized invoices with tax, discounts, terms, and due dates",
  "15 professional invoice designs with downloadable PDFs",
  "Email delivery and secure public invoice links",
  "Weekly, biweekly, monthly, quarterly, or yearly schedules",
  "Payment status linked to transaction activity",
];

const workflow = [
  {
    icon: Building2,
    title: "Set up your account",
    description:
      "Create a profile and complete the provider verification required for payment services.",
  },
  {
    icon: FileText,
    title: "Request payment",
    description:
      "Create an invoice or share supported account details and payment instructions with a client.",
  },
  {
    icon: BadgeCheck,
    title: "Track settlement",
    description:
      "Follow payment updates and match completed transfers to the relevant invoice and client.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#application`,
      name: siteConfig.name,
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      publisher: { "@id": `${siteUrl}/#organization` },
      featureList: [
        "Business money accounts",
        "Bank and stablecoin payment workflows",
        "Professional invoice creation",
        "Invoice PDF and email delivery",
        "Recurring invoice schedules",
        "Invoice payment reconciliation",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: marketingFaqs.slice(0, 6).map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ],
};

function ProductPreview() {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-md)] sm:p-4">
      <div className="flex items-center justify-between border-b border-border px-1 pb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Business overview</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">Payments and invoices</p>
        </div>
        <span className="rounded-full border border-success/25 bg-success-muted px-2.5 py-1 text-xs font-medium text-success">
          Operational
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>USD balance</span>
            <Landmark className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            $24,860.40
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Available balance</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Open invoices</span>
            <FileText className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            $8,420.00
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across 4 invoices</p>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3">
          <p className="text-xs font-semibold text-foreground">Recent activity</p>
          <span className="text-xs text-muted-foreground">Status</span>
        </div>
        {[
          {
            icon: ArrowDownLeft,
            title: "Invoice STB-1042",
            detail: "Client payment",
            amount: "+$2,400.00",
            status: "Completed",
            statusClass: "text-success",
          },
          {
            icon: Send,
            title: "Invoice STB-1045",
            detail: "Payment request sent",
            amount: "$1,800.00",
            status: "Awaiting payment",
            statusClass: "text-warning",
          },
          {
            icon: ArrowUpRight,
            title: "USD withdrawal",
            detail: "Bank transfer",
            amount: "-$950.00",
            status: "Processing",
            statusClass: "text-info",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0"
          >
            <span className="rounded-md bg-surface-subtle p-2 text-muted-foreground">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground tabular-nums">{item.amount}</p>
              <p className={cn("text-xs", item.statusClass)}>{item.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-28">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                Payment services powered by Bridge infrastructure
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
                Business payments and invoicing, in one practical workflow
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Manage supported business accounts, move money through bank or stablecoin
                rails, and create invoices that help clients pay with clear instructions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className={buttonVariants({ size: "lg" })}>
                  Create account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/invoice-generator"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Create a free invoice PDF
                </Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Invoice PDFs do not require verification. Payment features require provider
                onboarding and are subject to jurisdiction and route availability.
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="payments" aria-labelledby="payments-heading" className="scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Payments</p>
              <h2 id="payments-heading" className="mt-2 text-3xl font-semibold tracking-tight">
                Move business money through supported local and digital rails
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Account details, transfers, conversion, and transaction history stay
                connected so teams have a clear view of where funds came from and where they went.
              </p>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {paymentCapabilities.map((capability) => (
                <article key={capability.title} className="bg-surface p-6">
                  <capability.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-sm font-semibold">{capability.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {capability.description}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["ACH", "Wire", "SEPA", "Faster Payments", "USDC", "USDT"].map((rail) => (
                <span
                  key={rail}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {rail}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Workflow</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                From account setup to reconciled payment
              </h2>
            </div>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {workflow.map((item, index) => (
                <li key={item.title} className="rounded-lg border border-border bg-background p-6">
                  <div className="flex items-center justify-between">
                    <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="text-xs font-medium text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="invoicing" aria-labelledby="invoicing-heading" className="scroll-mt-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div>
              <p className="text-sm font-semibold text-primary">Invoicing</p>
              <h2 id="invoicing-heading" className="mt-2 text-3xl font-semibold tracking-tight">
                Turn payment collection into a repeatable client process
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Build a professional invoice, send a PDF and secure link, then keep its
                lifecycle connected to your payment activity. Use recurring schedules for
                repeat work without rebuilding the same invoice.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register" className={buttonVariants()}>
                  Start invoicing
                </Link>
                <TextLink href="/invoice-generator">Try the PDF generator</TextLink>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <span className="rounded-md bg-info-muted p-2 text-info">
                  <WalletCards className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Invoice collection toolkit</p>
                  <p className="text-xs text-muted-foreground">
                    Create, deliver, schedule, and reconcile
                  </p>
                </div>
              </div>
              <ul className="mt-5 grid gap-3">
                {invoiceCapabilities.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5">
                <div className="rounded-md bg-surface-muted p-3">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">15 PDF designs</p>
                </div>
                <div className="rounded-md bg-surface-muted p-3">
                  <Repeat2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">5 schedule cadences</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">From the blog</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  Understand invoice and payment workflows
                </h2>
              </div>
              <TextLink href="/blog">View all articles</TextLink>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {blogPosts.slice(0, 3).map((post) => (
                <article key={post.slug} className="rounded-lg border border-border bg-background p-6">
                  <p className="text-xs font-medium text-primary">{post.category}</p>
                  <h3 className="mt-3 text-base font-semibold leading-6">
                    <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {post.description}
                  </p>
                  <div className="mt-5">
                    <TextLink href={`/blog/${post.slug}`}>Read guide</TextLink>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-heading">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">FAQ</p>
              <h2 id="faq-heading" className="mt-2 text-3xl font-semibold tracking-tight">
                Questions about payments and invoices
              </h2>
              <p className="mt-3 text-muted-foreground">
                Availability and requirements can differ by account, currency, and jurisdiction.
              </p>
            </div>
            <div className="mt-9 divide-y divide-border rounded-lg border border-border bg-surface">
              {marketingFaqs.slice(0, 6).map((faq) => (
                <details key={faq.question} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                    {faq.question}
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
            <div className="mt-6 text-center">
              <TextLink href="/faq">Read all payment and invoicing answers</TextLink>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <h2 className="text-2xl font-semibold">Set up your payment and invoice workflow</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create an account for the full product, or generate a PDF invoice without signing in.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Create account
              </Link>
              <Link
                href="/invoice-generator"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Generate invoice PDF
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
