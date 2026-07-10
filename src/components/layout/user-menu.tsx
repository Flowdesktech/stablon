"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useProfile } from "@/hooks/use-profile";
import { signOutUser } from "@/lib/firebase/auth-actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, ChevronsUpDown } from "lucide-react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();

  const email = user?.email ?? profile?.email ?? "";
  const name =
    user?.displayName?.trim() || profile?.name?.trim() || email.split("@")[0] || "Account";
  const photoURL = user?.photoURL ?? null;

  async function handleSignOut() {
    onNavigate?.();
    await signOutUser();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5 cursor-pointer">
          <Avatar name={name} photoURL={photoURL} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            {email && <p className="truncate text-xs text-white/40">{email}</p>}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/30" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar name={name} photoURL={photoURL} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            {email && <p className="truncate text-xs text-white/40">{email}</p>}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings" onClick={onNavigate}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem variant="danger" onSelect={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ name, photoURL }: { name: string; photoURL: string | null }) {
  if (photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar host isn't in next/image remotePatterns
      <img
        src={photoURL}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-xs font-semibold text-white">
      {initials(name)}
    </div>
  );
}
