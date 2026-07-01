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
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <Card className="max-w-md w-full border-purple-500/20">
        <CardContent className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            {pending ? (
              <Clock className="w-7 h-7 text-white" />
            ) : (
              <Lock className="w-7 h-7 text-white" />
            )}
          </div>

          {pending ? (
            <>
              <h2 className="text-xl font-bold text-white">Verification in progress</h2>
              <p className="text-sm text-white/60">
                Your identity is being reviewed. This usually takes between 1 and 24 hours.
                You&apos;ll be able to use this feature as soon as you&apos;re approved.
              </p>
              <Button asChild variant="outline">
                <Link href="/settings">Check status <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white">Verification required</h2>
              <p className="text-sm text-white/60">
                Complete identity verification (KYC) to unlock deposits, withdrawals, swaps,
                your card, and more. It only takes a couple of minutes.
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
