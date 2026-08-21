"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useKycStatus } from "@/hooks/use-bridge";
import { isGatedPath } from "@/lib/feature-access";
import { Lock, Clock, ShieldCheck, ArrowRight } from "lucide-react";

export function FeatureGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, isApproved, isLoading } = useKycStatus();

  if (!isGatedPath(pathname) || isApproved) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-40" />
      </div>
    );
  }

  const pending = status === "pending";

  return (
    <div className="flex min-h-[60vh] items-center justify-center animate-fade-in">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-muted">
            {pending ? (
              <Clock className="h-6 w-6 text-warning" />
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {pending ? (
            <>
              <h2 className="text-xl font-semibold text-foreground">Verification in progress</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Your identity information is being reviewed by the provider. This feature
                becomes available when the account is approved.
              </p>
              <Button asChild variant="outline">
                <Link href="/settings">Check status <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground">Verification required</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Complete provider identity verification before using deposits, withdrawals,
                conversion, card, and other regulated payment features.
              </p>
              <Button asChild>
                <Link href="/settings">
                  <ShieldCheck className="w-4 h-4" /> Verify my identity
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
