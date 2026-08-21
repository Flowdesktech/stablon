"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { stopImpersonation } from "@/lib/admin-actions";
import { toast } from "@/components/ui/toast";
import { Eye, Loader2, LogOut } from "lucide-react";

export function ImpersonationBanner() {
  const { profile } = useProfile();
  const [exiting, setExiting] = useState(false);

  if (!profile?.impersonating) return null;

  async function exit() {
    setExiting(true);
    try {
      await stopImpersonation();
      // Hard navigate back to admin so all cached hooks re-fetch as the admin.
      window.history.replaceState(null, "", "/admin/users");
      window.location.reload();
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
    <div className="sticky top-16 z-20 flex items-center justify-center gap-3 border-b border-warning/25 bg-warning-muted px-4 py-2 text-sm text-foreground">
      <Eye className="w-4 h-4 shrink-0" />
      <span className="truncate">
        You are impersonating <span className="font-semibold">{profile.email}</span>
      </span>
      <button
        onClick={exit}
        disabled={exiting}
        className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-warning/30 bg-surface px-2.5 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning-muted disabled:opacity-50"
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
