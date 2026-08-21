"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/firebase/auth-actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not send the reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title={sent ? "Check your email" : "Reset your password"}
      description={
        sent
          ? "If an account matches that email, Firebase has sent password reset instructions."
          : "Enter your account email and we’ll send you a secure password reset link."
      }
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-muted text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm leading-6 text-muted-foreground">
            Check your inbox and spam folder. The reset link expires automatically for your
            security.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setSent(false)}
          >
            Send another email
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          aria-describedby={error ? "password-reset-error" : undefined}
        >
          <div>
            <label
              htmlFor="password-reset-email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="password-reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="pl-9"
                required
                autoFocus
              />
            </div>
          </div>

          {error ? (
            <p
              id="password-reset-error"
              role="alert"
              className="rounded-md border border-danger/25 bg-danger-muted px-3 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending reset link…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
