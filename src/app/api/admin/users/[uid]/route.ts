import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-guards";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { apiError } from "@/lib/api-error";
import { getUserDoc, updateUserDoc } from "@/lib/users";
import { updateCustomerEmail } from "@/lib/bridge";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin: update a user. The body carries exactly one of:
// - `loginDisabled` — enable/disable the user's ability to sign in. Disabling
//   also revokes any existing sessions (refresh tokens) so the block takes
//   effect immediately — `getSessionUser` verifies revocation on every request.
//   Impersonation is unaffected: it mints a fresh token after the revoke, and
//   skips the login gate.
// - `email` — change the user's email in Firebase Auth, on their linked Bridge
//   customer, and on the Firestore profile.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  const { uid } = await params;
  const body = await req.json().catch(() => ({}));

  if (typeof body.email === "string") {
    return updateEmail(uid, body.email);
  }

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

// Firebase Auth is the uniqueness gate, so it's updated first. If Bridge then
// rejects the change, the Auth email is rolled back so the two stay in sync.
// The admin vouches for the new address, so it's marked verified — otherwise the
// user would be locked out by the verified-email check at sign-in.
async function updateEmail(uid: string, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 1024) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    const userDoc = await getUserDoc(uid);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const auth = getAdminAuth();
    const authUser = await auth.getUser(uid);
    const previous = {
      email: authUser.email,
      emailVerified: authUser.emailVerified,
    };
    if (previous.email?.toLowerCase() === email && userDoc.email === email) {
      return NextResponse.json({ success: true, email });
    }

    try {
      await auth.updateUser(uid, { email, emailVerified: true });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "Another account already uses that email." },
          { status: 409 }
        );
      }
      if (code === "auth/invalid-email") {
        return NextResponse.json(
          { error: "Enter a valid email address." },
          { status: 400 }
        );
      }
      throw err;
    }

    if (userDoc.bridgeCustomerId) {
      try {
        await updateCustomerEmail(userDoc.bridgeCustomerId, email);
      } catch (err) {
        await auth.updateUser(uid, previous).catch(() => {});
        throw err;
      }
    }

    await updateUserDoc(uid, { email });
    return NextResponse.json({ success: true, email });
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
