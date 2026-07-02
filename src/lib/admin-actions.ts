"use client";

import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export async function deleteAdminUser(uid: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${uid}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to delete user");
  }
}

// Signs the admin in as the target user and swaps their session cookie. The
// caller should hard-navigate afterwards so all cached client state resets.
export async function impersonateUser(uid: string): Promise<void> {
  const tokenRes = await fetch(`/api/admin/users/${uid}/impersonate`, {
    method: "POST",
  });
  const tokenBody = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    throw new Error(tokenBody.error || "Failed to start impersonation");
  }

  const cred = await signInWithCustomToken(getFirebaseAuth(), tokenBody.token);
  const idToken = await cred.user.getIdToken();

  const sessRes = await fetch("/api/admin/impersonate/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!sessRes.ok) {
    const body = await sessRes.json().catch(() => ({}));
    throw new Error(body.error || "Failed to establish impersonated session");
  }
}
