"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "@/components/ui/toast";
import { Eye, Loader2, LogOut } from "lucide-react";

export function ImpersonationBanner() {
  const { profile } = useProfile();
  const [exiting, setExiting] = useState(false);

  if (!profile?.impersonating) return null;

  async function exit() {
    setExiting(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to exit impersonation");
      }
      // Hard navigate back to admin so all cached hooks re-fetch as the admin.
      window.location.href = "/admin/users";
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't exit impersonation",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setExiting(false);
    }
  }

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-sm text-amber-200 backdrop-blur">
      <Eye className="w-4 h-4 shrink-0" />
      <span className="truncate">
        You are impersonating <span className="font-semibold">{profile.email}</span>
      </span>
      <button
        onClick={exit}
        disabled={exiting}
        className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-100 hover:bg-amber-400/20 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {exiting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        Exit impersonation
      </button>
    </div>
  );
}
