import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from "@/lib/firebase/server-auth";
import { ensureUserDoc, updateUserDoc } from "@/lib/users";
import { verifyTotp } from "@/lib/totp";
import { decryptSecret } from "@/lib/crypto";
import {
  consumeRecoveryCode,
  parseRecoveryCodes,
  serializeRecoveryCodes,
} from "@/lib/recovery-codes";

// Exchanges a freshly-minted Firebase ID token for a long-lived, httpOnly
// session cookie. Two-factor authentication is enforced here (post sign-in)
// before the cookie is issued — without the cookie, every protected API stays
// locked even though Firebase considers the client signed in.
export async function POST(req: Request) {
  try {
    const { idToken, totp } = await req.json().catch(() => ({}));
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    // Token verification failure is an expected client-side condition (bad or
    // expired token) → 401. Everything after this is server infrastructure and
    // is treated as a 500 by the outer catch so real config errors surface in
    // the deployment logs instead of masquerading as "invalid credentials".
    let decoded;
    try {
      decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch (err) {
      console.error("[auth/session] ID token verification failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired sign-in. Please try again." },
        { status: 401 }
      );
    }

    const user = await ensureUserDoc(decoded.uid, {
      email: decoded.email ?? "",
      name: decoded.name ?? null,
    });

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const code = typeof totp === "string" ? totp.trim() : "";
      if (!code) {
        return NextResponse.json({ error: "2FA_REQUIRED" }, { status: 401 });
      }

      const secret = decryptSecret(user.twoFactorSecret);
      const totpOk = await verifyTotp(code, secret);

      if (!totpOk) {
        const remaining = await consumeRecoveryCode(
          code,
          parseRecoveryCodes(user.twoFactorRecoveryCodes)
        );
        if (remaining === null) {
          return NextResponse.json({ error: "2FA_INVALID" }, { status: 401 });
        }
        // Burn the used recovery code.
        await updateUserDoc(decoded.uid, {
          twoFactorRecoveryCodes: serializeRecoveryCodes(remaining),
        });
      }
    }

    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    // Config/infrastructure failures (missing FIREBASE_* admin credentials,
    // Firestore/createSessionCookie errors). Logged so it shows in Vercel's
    // runtime logs, and returned as 500 so the client stops calling it "auth".
    console.error("[auth/session] unexpected server error:", err);
    return NextResponse.json(
      { error: "Server error while establishing session" },
      { status: 500 }
    );
  }
}

// Clears the session cookie (sign out).
export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
