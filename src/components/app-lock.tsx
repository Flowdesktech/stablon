"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { signOutUser } from "@/lib/firebase/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from "lucide-react";

// Auto-lock the app after this much inactivity.
const LOCK_AFTER_MS = 60 * 60 * 1000; // 1 hour
const LAST_ACTIVITY_KEY = "stablon:lastActivity";
const LOCKED_KEY = "stablon:locked";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

export function AppLock() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(0);
  const lockedRef = useRef(false);

  const setLockedState = useCallback((value: boolean) => {
    lockedRef.current = value;
    setLocked(value);
    try {
      if (value) localStorage.setItem(LOCKED_KEY, "1");
      else localStorage.removeItem(LOCKED_KEY);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
    } catch {
      // ignore
    }
  }, []);

  const lock = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLockedState(true);
  }, [setLockedState]);

  const arm = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const remaining = Math.max(0, LOCK_AFTER_MS - (Date.now() - lastActivityRef.current));
    timerRef.current = setTimeout(lock, remaining);
  }, [lock]);

  // Load whether a passcode is configured.
  useEffect(() => {
    let active = true;
    fetch("/api/account/passcode")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => {
        if (active) setEnabled(Boolean(d.enabled));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Arm the inactivity timer + activity listeners while the lock is enabled.
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const unlockTimer = window.setTimeout(() => setLockedState(false), 0);
      return () => window.clearTimeout(unlockTimer);
    }

    const storedActivity = readNumber(LAST_ACTIVITY_KEY);
    lastActivityRef.current = storedActivity || Date.now();
    let wasLocked = false;
    try {
      wasLocked = localStorage.getItem(LOCKED_KEY) === "1";
    } catch {
      // ignore
    }

    let initialLockTimer: number | null = null;
    if (wasLocked || Date.now() - lastActivityRef.current > LOCK_AFTER_MS) {
      initialLockTimer = window.setTimeout(lock, 0);
    } else {
      markActivity();
      arm();
    }

    let throttled = false;
    const onActivity = () => {
      if (lockedRef.current || throttled) return;
      throttled = true;
      setTimeout(() => (throttled = false), 1000);
      markActivity();
      arm();
    };

    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        !lockedRef.current &&
        Date.now() - lastActivityRef.current > LOCK_AFTER_MS
      ) {
        lock();
      }
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (initialLockTimer) window.clearTimeout(initialLockTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, arm, lock, markActivity, setLockedState]);

  const handleUnlocked = useCallback(() => {
    markActivity();
    setLockedState(false);
    arm();
  }, [arm, markActivity, setLockedState]);

  const handleRecovered = useCallback(() => {
    setEnabled(false);
    setLockedState(false);
  }, [setLockedState]);

  if (!enabled || !locked) return null;

  return (
    <LockScreen
      onUnlocked={handleUnlocked}
      onRecovered={handleRecovered}
      onSignOut={async () => {
        await signOutUser();
        router.push("/login");
      }}
    />
  );
}

function LockScreen({
  onUnlocked,
  onRecovered,
  onSignOut,
}: {
  onUnlocked: () => void;
  onRecovered: () => void;
  onSignOut: () => void;
}) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [recovering, setRecovering] = useState(false);
  const [password, setPassword] = useState("");
  const [recovError, setRecovError] = useState("");
  const [resetting, setResetting] = useState(false);

  async function submitPasscode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/account/passcode/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        setError("Incorrect passcode. Try again.");
        setPasscode("");
        return;
      }
      onUnlocked();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRecovery(e: React.FormEvent) {
    e.preventDefault();
    setResetting(true);
    setRecovError("");
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user?.email) throw new Error("Your session expired — please sign in again.");

      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      const idToken = await user.getIdToken(true);

      const res = await fetch("/api/account/passcode", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Could not reset your passcode.");
      onRecovered();
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential")
      ) {
        setRecovError("Incorrect password.");
      } else {
        setRecovError(err instanceof Error ? err.message : "Could not reset your passcode.");
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 text-center shadow-[var(--shadow-md)]">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-info-muted">
          <Lock className="h-6 w-6 text-info" />
        </div>

        {!recovering ? (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Locked</h1>
            <p className="mb-6 mt-2 text-muted-foreground">
              Enter your passcode to unlock Stablon.
            </p>

            <form onSubmit={submitPasscode} className="space-y-4">
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
                placeholder="Passcode"
                maxLength={8}
                className="text-center tracking-[0.5em] text-lg"
                autoFocus
                required
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting || passcode.length < 4}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <button
                onClick={() => {
                  setRecovering(true);
                  setError("");
                }}
                className="text-primary hover:underline"
              >
                Forgot passcode?
              </button>
              <span className="text-border-strong">•</span>
              <button onClick={onSignOut} className="text-muted-foreground hover:text-foreground hover:underline">
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Reset passcode</h1>
            <p className="mb-6 mt-2 text-muted-foreground">
              Confirm your account password to remove the passcode lock.
            </p>

            <form onSubmit={submitRecovery} className="space-y-4">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password"
                autoFocus
                required
              />
              {recovError && <p className="text-sm text-danger">{recovError}</p>}
              <Button type="submit" className="w-full" disabled={resetting || !password}>
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset & unlock"}
              </Button>
            </form>

            <button
              onClick={() => {
                setRecovering(false);
                setRecovError("");
                setPassword("");
              }}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Back to passcode
            </button>
          </>
        )}
      </div>
    </div>
  );
}
