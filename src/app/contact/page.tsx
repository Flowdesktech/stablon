import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquareText } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with the Stablon team. Questions, feedback, or support — we reply by email.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <nav
          aria-label="Contact page"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        >
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              S
            </span>
            <span>Stablon</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(460px,1.2fr)] lg:gap-16">
          <section className="pt-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Contact
            </p>
            <h1 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
              How can we help?
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              Send a question about Stablon, your account, or a product workflow. Our team will
              respond by email.
            </p>

            <div className="mt-8 space-y-5 border-t border-border pt-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info-muted">
                  <MessageSquareText className="h-4 w-4 text-info" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-medium">Include useful context</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Describe what you were trying to do and what happened.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-subtle">
                  <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-medium">Replies are sent by email</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Use an address you can access and check for a response.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <ContactForm />
        </div>
      </main>
    </div>
  );
}
