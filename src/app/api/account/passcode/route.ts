import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import { hashPasscode, verifyPasscode } from "@/lib/passcode";
import { getAdminAuth } from "@/lib/firebase/admin";

const PASSCODE_RE = /^\d{4,8}$/;
const REAUTH_MAX_AGE_MS = 5 * 60 * 1000;

// Whether the inactivity app-lock passcode is configured.
export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    return NextResponse.json({ enabled: Boolean(guard.user.appLockHash) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Set (first time) or change the passcode. Changing requires the current one.
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const { passcode, current } = await req.json().catch(() => ({}));
    if (typeof passcode !== "string" || !PASSCODE_RE.test(passcode)) {
      return NextResponse.json({ error: "Passcode must be 4–8 digits" }, { status: 400 });
    }

    if (user.appLockHash) {
      if (typeof current !== "string" || !verifyPasscode(current, user.appLockHash)) {
        return NextResponse.json({ error: "Current passcode is incorrect" }, { status: 400 });
      }
    }

    await updateUserDoc(user.uid, { appLockHash: hashPasscode(passcode) });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove the passcode. Normally requires the current passcode; a fresh reauth ID
// token (from re-entering the account password) is accepted as a recovery path
// when the passcode is forgotten.
export async function DELETE(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.appLockHash) {
      return NextResponse.json({ success: true });
    }

    const { current, idToken } = await req.json().catch(() => ({}));

    if (typeof idToken === "string" && idToken) {
      let decoded;
      try {
        decoded = await getAdminAuth().verifyIdToken(idToken, true);
      } catch {
        return NextResponse.json({ error: "Please re-enter your password." }, { status: 401 });
      }
      const authTimeMs = (decoded.auth_time ?? 0) * 1000;
      if (decoded.uid !== user.uid || Date.now() - authTimeMs > REAUTH_MAX_AGE_MS) {
        return NextResponse.json({ error: "Please re-enter your password." }, { status: 401 });
      }
    } else if (typeof current !== "string" || !verifyPasscode(current, user.appLockHash)) {
      return NextResponse.json({ error: "Current passcode is incorrect" }, { status: 400 });
    }

    await updateUserDoc(user.uid, { appLockHash: null });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
