"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import {
  completeVerifiedSignIn,
  resendVerificationEmail,
  signOutUser,
} from "@/lib/firebase/auth-actions";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busyRef = useRef(false);

  // If there's no signed-in Firebase user, there's nothing to verify here.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const continueIfVerified = useCallback(
    async (manual: boolean) => {
      if (busyRef.current || !user) return;
      busyRef.current = true;
      if (manual) {
        setChecking(true);
        setError("");
      }

      const res = await completeVerifiedSignIn();
      if (res.ok) {
        router.push("/dashboard");
        return; // stay "busy" — we're navigating away
      }
      // Verified but the account also has 2FA → finish through the normal login.
      if (res.code === "2FA_REQUIRED") {
        router.push("/login");
        return;
      }
      if (manual) {
        if (res.code === "EMAIL_UNVERIFIED") {
          setError(
            "We couldn't confirm your email yet. Click the link in the email, then try again."
          );
        } else if (res.code === "ERROR") {
          setError(res.message || "Something went wrong. Please try again.");
        }
        setChecking(false);
      }
      busyRef.current = false;
    },
    [user, router]
  );

  // Poll quietly so clicking the link in the email advances this tab automatically.
  useEffect(() => {
    if (loading || !user) return;
    const id = setInterval(() => continueIfVerified(false), 5000);
    return () => clearInterval(id);
  }, [loading, user, continueIfVerified]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleResend() {
    setResending(true);
    setError("");
    setNotice("");
    try {
      await resendVerificationEmail();
      setNotice("Verification email sent. Check your inbox and spam folder.");
      setCooldown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend the email.");
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    await signOutUser();
    router.push("/login");
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <span className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Checking your account…
        </span>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Confirm your email address"
      description="Verification helps protect account access and confirms where account notices should be sent."
      footer={
        <>
          Wrong account?{" "}
          <button onClick={handleSignOut} className="font-medium text-primary hover:underline">
            Sign in with a different email
          </button>
        </>
      }
    >
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-info-muted">
          <MailCheck className="h-5 w-5 text-info" aria-hidden="true" />
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{user.email}</span>. Open the link, then
          return here to continue.
        </p>

        <div aria-live="polite">
          {notice && (
            <p className="mt-4 rounded-md border border-success/25 bg-success-muted px-3 py-2.5 text-sm text-success">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-md border border-danger/25 bg-danger-muted px-3 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={() => continueIfVerified(true)} disabled={checking}>
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking verification…
              </>
            ) : (
              <>
                I&apos;ve verified my email <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
          >
            {resending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : cooldown > 0 ? (
              `Resend email in ${cooldown}s`
            ) : (
              "Resend verification email"
            )}
          </Button>
        </div>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          The link may take a few minutes to arrive. Check your spam folder before requesting
          another email.
        </p>
    </AuthShell>
  );
}
