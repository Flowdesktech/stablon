"use client";

import { useState } from "react";
import {
  signInWithGoogle,
  signInWithPassword,
  type SessionResult,
} from "@/lib/firebase/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState<"password" | "google" | null>(
    null
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const twoFactorRequired = twoFactorMethod !== null;

  function handleResult(
    res: SessionResult,
    method: "password" | "google"
  ): boolean {
    if (res.ok) {
      router.push("/dashboard");
      return true;
    }

    if (res.code === "EMAIL_UNVERIFIED") {
      router.push("/verify-email");
      return true;
    } else if (res.code === "2FA_REQUIRED") {
      setTwoFactorMethod(method);
      setError("");
    } else if (res.code === "2FA_INVALID") {
      setTwoFactorMethod(method);
      setError("Invalid authentication code");
    } else if (res.code === "ACCOUNT_DISABLED") {
      setError("Your account has been disabled. Please contact support.");
    } else if (res.code === "ERROR") {
      // Surface real server/config failures (e.g. Firebase Admin misconfig on
      // the server) instead of masking them as bad credentials.
      setError(res.message || "Something went wrong. Please try again.");
    } else {
      setError("Invalid email or password");
    }
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const method = twoFactorMethod ?? "password";
    const res =
      method === "google"
        ? await signInWithGoogle(totp || undefined)
        : await signInWithPassword(email, password, totp || undefined);

    if (handleResult(res, method)) return;
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    const res = await signInWithGoogle();
    if (handleResult(res, "google")) return;
    setGoogleLoading(false);
  }

  return (
    <AuthShell
      eyebrow="Account access"
      title="Sign in to Stablon"
      description="Use your account credentials to continue to your workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {!twoFactorRequired ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading || googleLoading}
            aria-busy={googleLoading}
            onClick={() => void handleGoogleSignIn()}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? "Connecting to Google…" : "Continue with Google"}
          </Button>
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or continue with email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
        <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? "login-error" : undefined}>
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={twoFactorRequired}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={twoFactorRequired}
            />
          </div>

          {twoFactorRequired && (
            <div className="animate-fade-in">
              <label htmlFor="login-totp" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Authentication code
              </label>
              <Input
                id="login-totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                placeholder="6-digit code from your app"
                autoFocus
                required
              />
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Enter the code from your authenticator app, or use a recovery code, to finish signing in.
              </p>
            </div>
          )}

          {error && (
            <p id="login-error" role="alert" className="rounded-md border border-danger/25 bg-danger-muted px-3 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || googleLoading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : twoFactorRequired ? (
              <>
                Verify and sign in <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              <>
                Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.37l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6.02 6.02 0 0 1 6.08 12c0-.67.12-1.32.31-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}
