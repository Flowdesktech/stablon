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
  const lastActivityRef = useRef<number>(Date.now());
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
      setLockedState(false);
      return;
    }

    const storedActivity = readNumber(LAST_ACTIVITY_KEY);
    lastActivityRef.current = storedActivity || Date.now();
    let wasLocked = false;
    try {
      wasLocked = localStorage.getItem(LOCKED_KEY) === "1";
    } catch {
      // ignore
    }

    if (wasLocked || Date.now() - lastActivityRef.current > LOCK_AFTER_MS) {
      lock();
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
    <div className="fixed inset-0 z-[200] bg-[#0a0a0f]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-6">
          <Lock className="w-7 h-7 text-white" />
        </div>

        {!recovering ? (
          <>
            <h1 className="text-2xl font-bold text-white">Locked</h1>
            <p className="text-white/60 mt-2 mb-6">
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
              {error && <p className="text-red-400 text-sm">{error}</p>}
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
                className="text-purple-400 hover:underline"
              >
                Forgot passcode?
              </button>
              <span className="text-white/20">•</span>
              <button onClick={onSignOut} className="text-white/40 hover:underline">
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white">Reset passcode</h1>
            <p className="text-white/60 mt-2 mb-6">
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
              {recovError && <p className="text-red-400 text-sm">{recovError}</p>}
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
              className="mt-6 text-sm text-white/40 hover:underline"
            >
              Back to passcode
            </button>
          </>
        )}
      </div>
    </div>
  );
}
