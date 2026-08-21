"use client";

import { useState } from "react";
import { registerWithPassword } from "@/lib/firebase/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { ArrowRight, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await registerWithPassword(name, email, password);
      if (res.ok) {
        router.push("/verify-email");
      } else {
        setError(res.message || "Registration failed");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Create an account"
      title="Set up your Stablon account"
      description="Enter your details. You’ll verify your email before accessing your workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
        <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? "register-error" : undefined}>
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Full name
            </label>
            <Input
              id="register-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email address
            </label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Use at least 8 characters and a password you do not reuse elsewhere.
            </p>
          </div>

          {error && (
            <p id="register-error" role="alert" className="rounded-md border border-danger/25 bg-danger-muted px-3 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              <>
                Create account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
    </AuthShell>
  );
}
