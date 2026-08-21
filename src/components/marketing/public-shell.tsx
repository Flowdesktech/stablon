import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/#payments", label: "Payments" },
  { href: "/#invoicing", label: "Invoicing" },
  { href: "/invoice-generator", label: "Invoice generator" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${siteConfig.name} home`}>
      <span
        className={cn(
          "flex items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground",
          compact ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
        )}
        aria-hidden="true"
      >
        S
      </span>
      <span className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
        {siteConfig.name}
      </span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8"
      >
        <Brand />
        <div className="hidden items-center gap-5 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/blog"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "lg:hidden")}
          >
            Blog
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
          >
            Create account
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Brand compact />
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Business accounts, payment collection, and invoicing workflows powered by
            supported financial infrastructure providers.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Product
          </p>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/invoice-generator" className="text-muted-foreground hover:text-foreground">
              Free invoice generator
            </Link>
            <Link href="/register" className="text-muted-foreground hover:text-foreground">
              Create account
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Resources
          </p>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">
              Blog
            </Link>
            <Link href="/faq" className="text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">
              Contact
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Legal
          </p>
          <div className="mt-3 grid gap-2 text-sm">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} {siteConfig.name}</span>
          <span>
            Payment availability depends on verification, jurisdiction, currency, and provider support.
          </span>
        </div>
      </div>
    </footer>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
