"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const routeTitles: Array<[string, string]> = [
  ["/dashboard", "Overview"],
  ["/accounts", "Accounts"],
  ["/deposit", "Deposit"],
  ["/withdraw", "Withdraw"],
  ["/swap", "Convert"],
  ["/card", "Card"],
  ["/transactions", "Transactions"],
  ["/earn", "Earn"],
  ["/invoices", "Invoices"],
  ["/clients", "Clients"],
  ["/recurring-invoices", "Recurring invoices"],
  ["/invoice-templates", "Invoice templates"],
  ["/invoicing-settings", "Invoice settings"],
  ["/verify", "Verification"],
  ["/settings", "Settings"],
  ["/contact", "Contact support"],
  ["/admin/users", "User administration"],
  ["/admin/wallets", "Wallet administration"],
  ["/admin/transactions", "Transaction administration"],
];

function titleForPath(pathname: string) {
  return routeTitles.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ??
    "Stablon";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground hover:bg-surface-subtle hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm font-medium text-foreground">{titleForPath(pathname)}</p>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
