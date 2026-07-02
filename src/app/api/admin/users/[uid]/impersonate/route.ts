import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-guards";
import { getAdminAuth } from "@/lib/firebase/admin";

// Admin: mint a short-lived custom token for the target user. The client signs
// in with it to obtain an ID token, which is then exchanged for an impersonated
// session cookie (see /api/admin/impersonate/session).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  const { uid } = await params;
  try {
    const token = await getAdminAuth().createCustomToken(uid, {
      impersonatedBy: guard.user.uid,
    });
    return NextResponse.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
