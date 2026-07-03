import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-guards";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { apiError } from "@/lib/api-error";

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
