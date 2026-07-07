import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-guards";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { apiError } from "@/lib/api-error";
import { updateUserDoc } from "@/lib/users";

// Admin: enable/disable a user's ability to sign in. Disabling also revokes any
// existing sessions (refresh tokens) so the block takes effect immediately —
// `getSessionUser` verifies revocation on every request. Impersonation is
// unaffected: it mints a fresh token after the revoke, and skips the login gate.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  const { uid } = await params;
  const body = await req.json().catch(() => ({}));

  if (typeof body.loginDisabled !== "boolean") {
    return NextResponse.json(
      { error: "loginDisabled (boolean) is required." },
      { status: 400 }
    );
  }
  if (uid === guard.user.uid) {
    return NextResponse.json(
      { error: "You can't disable your own account." },
      { status: 400 }
    );
  }

  try {
    await updateUserDoc(uid, { loginDisabled: body.loginDisabled });
    if (body.loginDisabled) {
      await getAdminAuth()
        .revokeRefreshTokens(uid)
        .catch((err: unknown) => {
          const code = (err as { code?: string })?.code;
          if (code !== "auth/user-not-found") throw err;
        });
    }
    return NextResponse.json({ success: true, loginDisabled: body.loginDisabled });
  } catch (error) {
    return apiError(error);
  }
}

// Admin: permanently delete a user (Firebase Auth identity + Firestore profile).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  const { uid } = await params;
  if (uid === guard.user.uid) {
    return NextResponse.json(
      { error: "You can't delete your own account." },
      { status: 400 }
    );
  }

  try {
    // Remove the auth identity first; tolerate an already-missing record so we
    // can still clean up an orphaned Firestore profile.
    await getAdminAuth()
      .deleteUser(uid)
      .catch((err: unknown) => {
        const code = (err as { code?: string })?.code;
        if (code !== "auth/user-not-found") throw err;
      });

    await getAdminDb().collection("users").doc(uid).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
