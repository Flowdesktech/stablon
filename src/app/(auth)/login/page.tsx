"use client";

import { useState } from "react";
import { signInWithPassword } from "@/lib/firebase/auth-actions";
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
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signInWithPassword(email, password, totp || undefined);

    if (res.ok) {
      router.push("/dashboard");
      return;
    }

    if (res.code === "EMAIL_UNVERIFIED") {
      router.push("/verify-email");
      return;
    } else if (res.code === "2FA_REQUIRED") {
      setTwoFactorRequired(true);
      setError("");
    } else if (res.code === "2FA_INVALID") {
      setTwoFactorRequired(true);
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
    setLoading(false);
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
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
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

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
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
