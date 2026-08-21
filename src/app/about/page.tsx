import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  Globe2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Stablon",
  description:
    "Learn why Stablon was built, how it supports professional invoicing and global payment workflows, and who develops the product.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: "/about",
    title: "About Stablon",
    description:
      "Stablon brings professional invoicing, client payment options, and payment tracking into one focused business platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Stablon",
    description:
      "Professional invoicing and global payment workflows developed by Flowdesk.tech.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${siteUrl}/about#about`,
  url: `${siteUrl}/about`,
  name: `About ${siteConfig.name}`,
  description: metadata.description,
  mainEntity: { "@id": `${siteUrl}/#organization` },
  creator: {
    "@type": "Organization",
    name: "Flowdesk.tech",
    url: "https://flowdesk.tech",
  },
};

const principles = [
  {
    icon: ReceiptText,
    title: "Clear business workflows",
    description:
      "Invoices, clients, recurring schedules, PDFs, delivery, and payment status belong in one understandable workflow.",
  },
  {
    icon: Globe2,
    title: "Practical global payments",
    description:
      "Payment options are presented according to supported currencies, jurisdictions, verification, and provider availability.",
  },
  {
    icon: ShieldCheck,
    title: "Security without inflated claims",
    description:
      "The product uses layered controls and direct disclosures while recognizing that financial services always carry operational risk.",
  },
  {
    icon: Code2,
    title: "Experienced product engineering",
    description:
      "Architecture and interfaces are shaped by more than a decade of full-stack development experience.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <p className="text-sm font-semibold text-primary">About Stablon</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Business invoicing and payment operations, made easier to manage.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
              Stablon helps businesses and independent professionals create invoices,
              organize recurring billing, offer supported bank and stablecoin payment
              routes, and track settlement without stitching together disconnected tools.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-primary">Why we built it</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                An invoice should connect the work to the payment.
              </h2>
              <div className="mt-6 space-y-4 text-base leading-7 text-muted-foreground">
                <p>
                  Many small businesses create an invoice in one system, collect payment
                  through another, and reconcile the result manually. International work
                  adds more complexity through currencies, bank rails, stablecoin networks,
                  provider verification, and payment references.
                </p>
                <p>
                  Stablon brings those steps into a focused workflow. Users can maintain
                  client records, generate professional invoice PDFs, schedule recurring
                  invoices, send secure public links, and monitor provider-reported payment
                  status from one application.
                </p>
                <p>
                  The free invoice generator remains available for anyone who only needs a
                  polished PDF. Account and payment features are available separately and
                  depend on verification and supported financial infrastructure.
                </p>
              </div>
            </div>

            <aside className="rounded-lg border border-border bg-surface p-7 shadow-[var(--shadow-sm)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Code2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Developed by Flowdesk.tech</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Stablon is developed by{" "}
                <a
                  href="https://flowdesk.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Flowdesk.tech
                </a>
                , backed by a full-stack developer with more than 10 years of experience
                building web applications, APIs, payment integrations, automation, and
                cloud-based systems.
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                That experience informs a product approach centered on maintainable
                software, transparent workflows, security controls, and interfaces that
                businesses can understand.
              </p>
              <a
                href="https://flowdesk.tech"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Visit Flowdesk.tech
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </aside>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-primary">Product principles</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">How Stablon is built</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {principles.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-lg border border-border bg-background p-6">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-border bg-surface p-8 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">
              Start with the invoicing workflow you need.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Create a PDF without an account, explore practical invoicing guides, or
              register to manage clients, recurring invoices, delivery, and eligible
              payment collection.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/invoice-generator" className={buttonVariants()}>
                Create a free invoice
              </Link>
              <Link href="/blog" className={buttonVariants({ variant: "outline" })}>
                Read the blog
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
