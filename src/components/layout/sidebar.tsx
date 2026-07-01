"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutUser } from "@/lib/firebase/auth-actions";
import { cn } from "@/lib/utils";
import { useKycStatus } from "@/hooks/use-bridge";
import { isGatedPath } from "@/lib/feature-access";
import {
  LayoutDashboard,
  Landmark,
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  ArrowLeftRight,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Lock,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/card", label: "Card", icon: CreditCard },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/earn", label: "Earn", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isApproved } = useKycStatus();

  async function handleSignOut() {
    await signOutUser();
    router.push("/");
  }

  const nav = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <span className="text-white font-bold">S</span>
        </div>
        <span className="text-lg font-bold text-white">Stablon</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const locked = !isApproved && isGatedPath(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-disabled={locked}
              title={locked ? "Complete verification to unlock" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-purple-600/15 text-purple-300"
                  : locked
                  ? "text-white/30 hover:text-white/50 hover:bg-white/5"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
              {locked && <Lock className="ml-auto w-3.5 h-3.5 text-white/30" />}
              {active && !locked && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all w-full cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 bg-[#0c0c14] h-screen sticky top-0">
        {nav}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-surface border border-white/10 text-white cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 h-full bg-[#0c0c14] border-r border-white/5">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-white/40 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
