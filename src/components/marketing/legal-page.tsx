import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: React.ReactNode[];
  bullets?: React.ReactNode[];
}

export function LegalPage({
  eyebrow,
  title,
  description,
  effectiveDate,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main>
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              {description}
            </p>
            <p className="mt-5 text-sm text-muted-foreground">Effective {effectiveDate}</p>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8 lg:py-16">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav aria-label={`${title} sections`} className="rounded-lg border border-border bg-surface p-4">
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              <ol className="mt-3 space-y-1">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <Link
                      href={`#${section.id}`}
                      className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                    >
                      {index + 1}. {section.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0">
            <div className="space-y-10">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-8 border-b border-border pb-10 last:border-0 last:pb-0"
                >
                  <h2 className="text-xl font-semibold tracking-tight">
                    {index + 1}. {section.title}
                  </h2>
                  {section.paragraphs?.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="mt-4 text-sm leading-7 text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets?.length ? (
                    <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-7 text-muted-foreground marker:text-primary">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
