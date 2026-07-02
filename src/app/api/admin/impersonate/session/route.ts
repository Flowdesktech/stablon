import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSuperAdmin } from "@/lib/api-guards";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from "@/lib/firebase/server-auth";
import { ensureUserDoc } from "@/lib/users";

// Establishes an impersonated session cookie for the target user. Authorization
// is checked against the admin's *current* session cookie before it is
// overwritten, so this deliberately bypasses the 2FA / email-verification gates
// enforced on normal sign-in (the admin has already proven their identity).
export async function POST(req: Request) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    // Guarantee a profile exists for the impersonated user.
    await ensureUserDoc(decoded.uid, {
      email: decoded.email ?? "",
      name: decoded.name ?? null,
    });

    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const store = await cookies();
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    };

    // Preserve the admin's own session so they can return to it later. Don't
    // overwrite an existing stash (in case of nested impersonation attempts).
    const currentSession = store.get(SESSION_COOKIE)?.value;
    if (currentSession && !store.get(ADMIN_SESSION_COOKIE)?.value) {
      store.set(ADMIN_SESSION_COOKIE, currentSession, cookieOpts);
    }

    store.set(SESSION_COOKIE, sessionCookie, cookieOpts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/impersonate] failed to establish session:", error);
    return NextResponse.json({ error: "Impersonation failed" }, { status: 500 });
  }
}
