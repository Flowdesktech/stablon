import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { verifyPasscode } from "@/lib/passcode";

// Checks a passcode entered on the lock screen. The session cookie is still
// valid here — this only gates the client-side UI overlay.
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (!user.appLockHash) {
      return NextResponse.json({ success: true });
    }

    const { passcode } = await req.json().catch(() => ({}));
    if (typeof passcode !== "string" || !verifyPasscode(passcode, user.appLockHash)) {
      return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
