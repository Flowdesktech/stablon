import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/api-guards";
import { ADMIN_SESSION_COOKIE } from "@/lib/firebase/server-auth";

// Lightweight profile for the signed-in user. Powers client UI that needs to
// know identity/role (e.g. showing the admin nav) without exposing secrets.
export async function GET() {
  const guard = await requireUser();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  // Presence of the stashed admin session means this is an impersonated session.
  const store = await cookies();
  const impersonating = Boolean(store.get(ADMIN_SESSION_COOKIE)?.value);

  return NextResponse.json({
    uid: user.uid,
    email: user.email,
    name: user.name,
    kycStatus: user.kycStatus,
    twoFactorEnabled: user.twoFactorEnabled,
    superAdmin: user.superAdmin,
    impersonating,
  });
}
