"use client";

import { useState } from "react";
import { signInWithPassword } from "@/lib/firebase/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

    if (res.code === "2FA_REQUIRED") {
      setTwoFactorRequired(true);
      setError("");
    } else if (res.code === "2FA_INVALID") {
      setTwoFactorRequired(true);
      setError("Invalid authentication code");
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-2xl font-bold text-white">Stablon</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-white/60 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={twoFactorRequired}
            />
          </div>

          {twoFactorRequired && (
            <div className="animate-fade-in">
              <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Authentication Code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                placeholder="6-digit code from your app"
                autoFocus
                required
              />
              <p className="text-xs text-white/40 mt-1.5">
                Enter the code from your authenticator app, or use a recovery code, to finish signing in.
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : twoFactorRequired ? (
              <>
                Verify &amp; Sign In <ShieldCheck className="w-4 h-4" />
              </>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-purple-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
