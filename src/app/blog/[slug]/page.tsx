import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { blogPosts, getBlogPost } from "@/lib/blog";
import { siteConfig, siteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    authors: [{ name: siteConfig.name }],
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      section: post.category,
      tags: post.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${siteUrl}/blog/${post.slug}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: { "@id": `${siteUrl}/#organization` },
        publisher: { "@id": `${siteUrl}/#organization` },
        mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
        articleSection: post.category,
        keywords: post.keywords.join(", "),
        inLanguage: "en",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: `${siteUrl}/blog/${post.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <main>
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to blog
          </Link>

          <header className="mt-9 border-b border-border pb-10">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-primary/20 bg-info-muted px-3 py-1 text-info">
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {post.readingTime}
              </span>
              <time dateTime={post.publishedAt}>
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "long",
                  timeZone: "UTC",
                }).format(new Date(`${post.publishedAt}T12:00:00Z`))}
              </time>
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{post.introduction}</p>
          </header>

          <aside className="my-10 rounded-lg border border-info/25 bg-info-muted p-6">
            <h2 className="font-semibold text-foreground">Key takeaways</h2>
            <ul className="mt-4 space-y-3">
              {post.takeaways.map((takeaway) => (
                <li key={takeaway} className="flex gap-3 text-sm leading-6 text-foreground">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {takeaway}
                </li>
              ))}
            </ul>
          </aside>

          <div className="space-y-12">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="leading-7 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.bullets ? (
                  <ul className="mt-5 list-disc space-y-2 pl-6 text-muted-foreground marker:text-primary">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-14 rounded-lg border border-border bg-surface p-7 shadow-[var(--shadow-sm)]">
            <h2 className="text-xl font-semibold">Put the workflow into practice</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Start with the free PDF generator, or create an account to manage clients,
              recurring invoices, email delivery, and eligible payment collection.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/invoice-generator"
                className={buttonVariants({ variant: "outline" })}
              >
                Free invoice generator
              </Link>
              <Link href="/register" className={buttonVariants()}>
                Create an account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <p className="mt-8 text-xs leading-5 text-muted-foreground">
            This article is general information and is not legal, tax, accounting, or
            financial advice. Payment-route availability varies by provider and jurisdiction.
          </p>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
