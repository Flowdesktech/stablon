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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-6">
          <MailCheck className="w-7 h-7 text-white" />
        </div>

        <h1 className="text-2xl font-bold text-white">Verify your email</h1>
        <p className="text-white/60 mt-2">
          We sent a verification link to{" "}
          <span className="text-white font-medium">{user.email}</span>. Click it to activate your
          account.
        </p>

        {notice && <p className="text-emerald-400 text-sm mt-4">{notice}</p>}
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        <div className="mt-8 space-y-3">
          <Button className="w-full" onClick={() => continueIfVerified(true)} disabled={checking}>
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                I&apos;ve verified — continue <ArrowRight className="w-4 h-4" />
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

        <p className="text-white/40 text-sm mt-6">
          Wrong account?{" "}
          <button onClick={handleSignOut} className="text-purple-400 hover:underline">
            Sign in with a different email
          </button>
        </p>
      </div>
    </div>
  );
}
