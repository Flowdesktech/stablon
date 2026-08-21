import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, FileText } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { blogPosts } from "@/lib/blog";
import { siteConfig, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Business Payment & Invoice Guides",
  description:
    "Practical guides to business payments, professional invoices, ACH and SEPA collection, stablecoin settlement, USDC payments, and recurring billing.",
  keywords: [
    "business payment guides",
    "invoice guides",
    "stablecoin payments",
    "USDC invoice",
    "freelancer invoicing",
    "global business payments",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Business Payment & Invoice Guides",
    description:
      "Learn how to manage payment workflows, invoice global clients, and understand bank and stablecoin rails.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${siteUrl}/blog#blog`,
  url: `${siteUrl}/blog`,
  name: `${siteConfig.name} Business Payments & Invoicing Guides`,
  description: metadata.description,
  publisher: { "@id": `${siteUrl}/#organization` },
  blogPost: blogPosts.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    url: `${siteUrl}/blog/${post.slug}`,
  })),
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <main>
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Stablon blog
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Practical invoice and payment guides for growing businesses
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Explanations for businesses and independent professionals managing client
              invoices, bank transfers, stablecoin routes, and recurring collection.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="latest-guides"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <h2 id="latest-guides" className="text-2xl font-semibold">
            Latest articles
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {blogPosts.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-sm)] transition-colors hover:border-border-strong"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-full border border-primary/20 bg-info-muted px-2.5 py-1 text-info">
                    {post.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {post.readingTime}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold leading-snug group-hover:text-primary">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                  {post.description}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary"
                >
                  Read article <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-lg border border-border bg-surface p-8 sm:p-10">
            <FileText className="h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold">Need an invoice PDF now?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Create an itemized PDF using one of 15 designs. No account or payment setup is required.
            </p>
            <Link href="/invoice-generator" className={`${buttonVariants()} mt-6`}>
              Open free invoice generator <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
