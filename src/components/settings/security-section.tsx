"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { changePassword } from "@/lib/firebase/auth-actions";
import { Lock, Smartphone, Loader2, ShieldCheck, Copy, Check, Download } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
};

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function SecuritySection() {
  const { data, mutate } = useSWR<{ enabled: boolean }>("/api/account/2fa", fetcher);
  const twoFactorEnabled = Boolean(data?.enabled);

  const [pwOpen, setPwOpen] = useState(false);
  const [twoFaOpen, setTwoFaOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription>Password and two-factor authentication</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-sm text-white">Password</p>
                <p className="text-xs text-white/40">Keep your account secure with a strong password</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>Change</Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-white/40" />
              <div>
                <p className="text-sm text-white flex items-center gap-2">
                  Two-Factor Auth
                  {twoFactorEnabled && <Badge variant="success">Enabled</Badge>}
                </p>
                <p className="text-xs text-white/40">
                  {twoFactorEnabled
                    ? "An authenticator code is required at sign-in"
                    : "Add an extra layer of security with an authenticator app"}
                </p>
              </div>
            </div>
            <Button
              variant={twoFactorEnabled ? "outline" : "default"}
              size="sm"
              onClick={() => setTwoFaOpen(true)}
            >
              {twoFactorEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <TwoFactorDialog
        open={twoFaOpen}
        onOpenChange={setTwoFaOpen}
        enabled={twoFactorEnabled}
        onChanged={() => mutate()}
      />
    </>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast({ variant: "error", title: "Passwords don't match", description: "Re-enter your new password." });
      return;
    }
    if (next.length < 8) {
      toast({ variant: "error", title: "Password too short", description: "Use at least 8 characters." });
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      toast({ variant: "success", title: "Password updated", description: "Your password has been changed." });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't change password",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Current password</label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">New password</label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Confirm new password</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TwoFactorDialog({
  open,
  onOpenChange,
  enabled,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: boolean;
  onChanged: () => void;
}) {
  if (enabled) {
    return <DisableTwoFactor open={open} onOpenChange={onOpenChange} onChanged={onChanged} />;
  }
  return <EnableTwoFactor open={open} onOpenChange={onOpenChange} onChanged={onChanged} />;
}

function EnableTwoFactor({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);

  function reset() {
    setQrCode(null);
    setSecret("");
    setCode("");
    setRecoveryCodes(null);
    setCodesCopied(false);
  }

  async function begin() {
    setLoading(true);
    try {
      const data = await postJson("/api/account/2fa/setup");
      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't start setup",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    try {
      const data = await postJson("/api/account/2fa/verify", { code });
      toast({ variant: "success", title: "Two-factor enabled", description: "Save your recovery codes before closing." });
      onChanged();
      setRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
    } catch (err) {
      toast({
        variant: "error",
        title: "Verification failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setVerifying(false);
    }
  }

  function copyCodes() {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
  }

  function downloadCodes() {
    if (!recoveryCodes) return;
    const blob = new Blob([`Stablon recovery codes\n\n${recoveryCodes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stablon-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function finish() {
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Prevent dismissing while recovery codes are shown so they aren't lost.
        if (!o && recoveryCodes) return;
        onOpenChange(o);
        if (o && !qrCode && !loading) begin();
        if (!o) reset();
      }}
    >
      <DialogContent>
        {recoveryCodes ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your recovery codes</DialogTitle>
              <DialogDescription>
                Store these somewhere safe. Each code can be used once to sign in if you lose access to your authenticator. They won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 my-2">
              {recoveryCodes.map((rc) => (
                <code key={rc} className="text-sm text-white/80 font-mono text-center py-1">{rc}</code>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={copyCodes}>
                {codesCopied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={downloadCodes}>
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
            <Button type="button" className="w-full mt-3" onClick={finish}>
              I&apos;ve saved my codes
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Enable two-factor authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code.
              </DialogDescription>
            </DialogHeader>

            {loading || !qrCode ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              </div>
            ) : (
              <form onSubmit={verify} className="space-y-4">
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="2FA QR code" className="w-44 h-44 rounded-xl bg-white p-2" />
                </div>

                <div>
                  <p className="text-xs text-white/40 mb-1.5">Or enter this key manually:</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(secret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-left cursor-pointer hover:bg-white/[0.05] transition-colors"
                  >
                    <code className="text-xs text-white/70 font-mono break-all">{secret}</code>
                    {copied ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <Copy className="w-4 h-4 text-white/40 shrink-0" />}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Verification code</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button type="submit" disabled={verifying}>
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify &amp; enable</>}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DisableTwoFactor({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await postJson("/api/account/2fa/disable", { code });
      toast({ variant: "info", title: "Two-factor disabled", description: "Your account no longer requires a code at sign-in." });
      onChanged();
      setCode("");
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't disable 2FA",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCode(""); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication</DialogTitle>
          <DialogDescription>
            Enter a current code from your authenticator app (or a recovery code) to turn off 2FA.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Authentication code</label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
