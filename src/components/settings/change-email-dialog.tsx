"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { requestEmailChange } from "@/lib/firebase/auth-actions";
import { Loader2 } from "lucide-react";

export function ChangeEmailDialog({
  open,
  onOpenChange,
  currentEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setPassword("");
    setError(null);
    setSentTo(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await requestEmailChange(password, email);
      setSentTo(email.trim().toLowerCase());
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email</DialogTitle>
          <DialogDescription>
            {sentTo
              ? "Confirm the change from your new inbox."
              : `Your current email is ${currentEmail}. We'll send a confirmation link to the new address.`}
          </DialogDescription>
        </DialogHeader>

        {sentTo ? (
          <div className="space-y-4">
            <Alert
              variant="success"
              title="Check your inbox"
              description={`We sent a confirmation link to ${sentTo}. Your email changes once you open it, and you'll then need to sign in again with the new address.`}
            />
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="New email">
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                maxLength={1024}
                required
                autoFocus
              />
            </Field>
            <Field label="Current password" error={error ?? undefined}>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send confirmation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
