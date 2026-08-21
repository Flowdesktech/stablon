import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <nav
          aria-label="Authentication"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md font-semibold tracking-tight text-foreground"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            >
              S
            </span>
            <span>Stablon</span>
          </Link>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Secure account access
          </span>
        </nav>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl place-items-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          <section className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
            {children}
          </section>

          {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}

          <div className="mt-8 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Stablon will never ask you to share your password or authentication code by email.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
