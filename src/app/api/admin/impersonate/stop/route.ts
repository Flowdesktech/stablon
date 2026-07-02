import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from "@/lib/firebase/server-auth";
import { getUserDoc } from "@/lib/users";

// Ends an impersonation session by restoring the admin's stashed session cookie.
// Authorization is implicit: only whoever started the impersonation holds the
// httpOnly `admin_session` cookie. We still re-validate it belongs to a current
// super admin before restoring.
export async function POST() {
  const store = await cookies();
  const adminSession = store.get(ADMIN_SESSION_COOKIE)?.value;

  if (!adminSession) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(adminSession, true);
    const adminDoc = await getUserDoc(decoded.uid);
    if (!adminDoc?.superAdmin) {
      store.delete(ADMIN_SESSION_COOKIE);
      return NextResponse.json(
        { error: "Original admin session is no longer valid." },
        { status: 403 }
      );
    }

    store.set(SESSION_COOKIE, adminSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    store.delete(ADMIN_SESSION_COOKIE);

    return NextResponse.json({ success: true });
  } catch {
    store.delete(ADMIN_SESSION_COOKIE);
    return NextResponse.json(
      { error: "Your original session expired — please sign in again." },
      { status: 401 }
    );
  }
}
