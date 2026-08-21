"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CalendarClock,
  CreditCard,
  Files,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  PanelsTopLeft,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useKycStatus } from "@/hooks/use-bridge";
import { useProfile } from "@/hooks/use-profile";
import { UserMenu } from "@/components/layout/user-menu";
import { isGatedPath } from "@/lib/feature-access";
import { cn } from "@/lib/utils";

interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const paymentItems: NavigationItem[] = [
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/swap", label: "Convert", icon: ArrowLeftRight },
  { href: "/card", label: "Card", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/earn", label: "Earn", icon: TrendingUp },
];

const invoiceItems: NavigationItem[] = [
  { href: "/invoices", label: "Invoices", icon: Files },
  { href: "/clients", label: "Clients", icon: UserRound },
  { href: "/recurring-invoices", label: "Recurring", icon: CalendarClock },
  { href: "/invoice-templates", label: "Templates", icon: PanelsTopLeft },
  { href: "/invoicing-settings", label: "Invoice settings", icon: SlidersHorizontal },
];

const accountItems: NavigationItem[] = [
  { href: "/verify", label: "Verification", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/contact", label: "Support", icon: LifeBuoy },
];

const adminItems: NavigationItem[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/transactions", label: "Transactions", icon: ReceiptText },
];

function NavigationGroup({
  label,
  items,
  pathname,
  approved,
  onNavigate,
}: {
  label: string;
  items: NavigationItem[];
  pathname: string;
  approved: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const locked = !approved && isGatedPath(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-disabled={locked}
            title={locked ? "Complete identity verification to unlock" : undefined}
            className={cn(
              "flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-info-muted font-medium text-info"
                : locked
                  ? "text-muted-foreground/60 hover:bg-surface-subtle"
                  : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {locked ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { isApproved } = useKycStatus();
  const { isSuperAdmin } = useProfile();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          S
        </div>
        <div>
          <p className="text-sm font-semibold leading-4 text-foreground">Stablon</p>
          <p className="text-[11px] text-muted-foreground">Payments & invoicing</p>
        </div>
      </div>

      <nav aria-label="Product navigation" className="flex-1 overflow-y-auto px-3 py-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className={cn(
            "flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === "/dashboard"
              ? "bg-info-muted font-medium text-info"
              : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Overview
        </Link>

        {!isApproved ? (
          <Link
            href="/verify"
            onClick={onNavigate}
            className="mt-3 flex items-start gap-3 rounded-md border border-warning/25 bg-warning-muted px-3 py-2.5 text-sm text-foreground"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              <span className="block font-medium">Verify your identity</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Required for payment features
              </span>
            </span>
          </Link>
        ) : null}

        <NavigationGroup
          label="Payments"
          items={paymentItems}
          pathname={pathname}
          approved={isApproved}
          onNavigate={onNavigate}
        />
        <NavigationGroup
          label="Invoicing"
          items={invoiceItems}
          pathname={pathname}
          approved={isApproved}
          onNavigate={onNavigate}
        />
        <NavigationGroup
          label="Account"
          items={accountItems}
          pathname={pathname}
          approved={isApproved}
          onNavigate={onNavigate}
        />
        {isSuperAdmin ? (
          <NavigationGroup
            label="Admin"
            items={adminItems}
            pathname={pathname}
            approved={isApproved}
            onNavigate={onNavigate}
          />
        ) : null}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface lg:block">
        <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => onMobileOpenChange(false)}
          />
          <aside
            aria-label="Mobile product navigation"
            className="relative h-full w-[min(20rem,88vw)] border-r border-border bg-surface shadow-[var(--shadow-md)]"
          >
            <button
              type="button"
              onClick={() => onMobileOpenChange(false)}
              className="absolute right-3 top-3 z-10 rounded-md p-2 text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
