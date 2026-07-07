"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  type UserCredential,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "./client";

export type SessionResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "2FA_REQUIRED"
        | "2FA_INVALID"
        | "INVALID_CREDENTIALS"
        | "EMAIL_UNVERIFIED"
        | "ACCOUNT_DISABLED"
        | "ERROR";
      message?: string;
    };

// Trades a Firebase ID token for our httpOnly session cookie. The server may
// reject it here when 2FA is required/invalid — the cookie is only set once all
// factors pass.
async function establishSession(idToken: string, totp?: string) {
  return fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, totp }),
  });
}

export async function signInWithPassword(
  email: string,
  password: string,
  totp?: string
): Promise<SessionResult> {
  let cred: UserCredential;
  try {
    cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  } catch {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  // Gate on a verified email before we ever mint a session cookie. The Firebase
  // client stays signed in so the /verify-email page can resend the email.
  if (!cred.user.emailVerified) {
    return { ok: false, code: "EMAIL_UNVERIFIED" };
  }

  const idToken = await cred.user.getIdToken();
  const res = await establishSession(idToken, totp);
  if (res.ok) return { ok: true };

  const data = await res.json().catch(() => ({}));
  if (data.error === "2FA_REQUIRED") return { ok: false, code: "2FA_REQUIRED" };
  if (data.error === "2FA_INVALID") return { ok: false, code: "2FA_INVALID" };
  if (data.error === "EMAIL_UNVERIFIED") return { ok: false, code: "EMAIL_UNVERIFIED" };
  if (data.error === "ACCOUNT_DISABLED") return { ok: false, code: "ACCOUNT_DISABLED" };
  return { ok: false, code: "ERROR", message: data.error };
}

// Creates the Firebase account and sends a verification email. No session cookie
// is issued yet — the user must confirm their email first (see completeVerifiedSignIn).
export async function registerWithPassword(
  name: string,
  email: string,
  password: string
): Promise<SessionResult> {
  let cred: UserCredential;
  try {
    cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  } catch (err) {
    const message =
      err instanceof FirebaseError ? mapAuthError(err.code) : "Registration failed";
    return { ok: false, code: "ERROR", message };
  }

  if (name) {
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch {
      // Non-fatal: the name also rides along in the ID token / is persisted later.
    }
  }

  try {
    await sendEmailVerification(cred.user);
  } catch (err) {
    // Non-fatal: the verify page offers a resend button.
    console.error("[auth] failed to send verification email:", err);
  }

  return { ok: true };
}

// Resends the verification email to the currently signed-in (unverified) user.
export async function resendVerificationEmail(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Your session expired — please sign in again.");
  }
  if (user.emailVerified) return;

  try {
    await sendEmailVerification(user);
  } catch (err) {
    if (err instanceof FirebaseError && err.code === "auth/too-many-requests") {
      throw new Error("Too many attempts. Please wait a minute and try again.");
    }
    throw new Error("Could not send the verification email. Please try again.");
  }
}

// Called from the /verify-email page. Refreshes the user, and once the email is
// confirmed, exchanges a fresh ID token (carrying email_verified) for a session
// cookie and persists the profile / links a Bridge customer.
export async function completeVerifiedSignIn(): Promise<SessionResult> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return { ok: false, code: "ERROR", message: "Your session expired — please sign in again." };
  }

  await user.reload();
  if (!user.emailVerified) {
    return { ok: false, code: "EMAIL_UNVERIFIED" };
  }

  // Force-refresh so the token reflects the freshly verified email claim.
  const idToken = await user.getIdToken(true);
  const res = await establishSession(idToken);
  if (res.ok) {
    await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user.displayName ?? "" }),
    }).catch(() => {});
    return { ok: true };
  }

  const data = await res.json().catch(() => ({}));
  if (data.error === "2FA_REQUIRED") return { ok: false, code: "2FA_REQUIRED" };
  if (data.error === "EMAIL_UNVERIFIED") return { ok: false, code: "EMAIL_UNVERIFIED" };
  if (data.error === "ACCOUNT_DISABLED") return { ok: false, code: "ACCOUNT_DISABLED" };
  return { ok: false, code: "ERROR", message: data.error };
}

export async function signOutUser(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
  await signOut(getFirebaseAuth()).catch(() => {});
}

// Reauthenticates with the current password, then sets a new one. Firebase
// requires a recent login to change credentials, which the reauth provides.
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) throw new Error("You must be signed in to change your password.");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (err) {
    if (
      err instanceof FirebaseError &&
      (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential")
    ) {
      throw new Error("Current password is incorrect");
    }
    throw new Error("Could not verify your current password");
  }

  try {
    await firebaseUpdatePassword(user, newPassword);
  } catch (err) {
    if (err instanceof FirebaseError && err.code === "auth/weak-password") {
      throw new Error("New password is too weak");
    }
    throw new Error("Could not update password");
  }
}

function mapAuthError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists";
    case "auth/invalid-email":
      return "Enter a valid email address";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    default:
      return "Registration failed";
  }
}
