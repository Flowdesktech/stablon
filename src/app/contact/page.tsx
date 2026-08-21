import type { Metadata } from "next";
import { Mail, MessageSquareText } from "lucide-react";
import { AppLock } from "@/components/app-lock";
import { ContactForm } from "@/components/contact-form";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import { getSessionUser } from "@/lib/firebase/server-auth";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with the Stablon team. Questions, feedback, or support — we reply by email.",
  alternates: { canonical: "/contact" },
};

function ContactContent({ initialEmail = "" }: { initialEmail?: string }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(28rem,1fr)] lg:gap-12">
      <section className="pt-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Contact
        </p>
        <h1 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
          How can we help?
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
          Send a question about Stablon, your account, development, or a product
          workflow. Our team will respond by email.
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
              <h2 className="text-sm font-medium">Email support</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use the form or email{" "}
                <a
                  href="mailto:contact@stablon.app"
                  className="font-medium text-primary hover:underline"
                >
                  contact@stablon.app
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <ContactForm initialEmail={initialEmail} />
    </div>
  );
}

export default async function ContactPage() {
  const session = await getSessionUser();

  if (session) {
    return (
      <DashboardShell>
        <main className="min-w-0">
          <ImpersonationBanner />
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <ContactContent initialEmail={session.email} />
          </div>
        </main>
        <AppLock />
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <ContactContent />
      </main>
      <PublicFooter />
    </div>
  );
}
