import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "session";
// Holds the admin's own session cookie while they impersonate another user, so
// the original session can be restored on "exit impersonation".
export const ADMIN_SESSION_COOKIE = "admin_session";
// Firebase session cookies can live up to 2 weeks.
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  uid: string;
  email: string;
}

// Reads and verifies the Firebase session cookie. Returns null when absent or
// invalid (expired, revoked, tampered). Checks revocation against the backend.
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    return { uid: decoded.uid, email: decoded.email ?? "" };
  } catch {
    // The cookie is present but invalid (expired, revoked, or the user was
    // deleted). Drop it so the proxy middleware — which only checks for the
    // cookie's presence — stops treating this as a signed-in session, and the
    // client gets bounced to /login instead of a broken authed render.
    store.delete(SESSION_COOKIE);
    store.delete(ADMIN_SESSION_COOKIE);
    return null;
  }
}
