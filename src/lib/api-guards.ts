import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/server-auth";
import { ensureUserDoc, type UserDoc } from "@/lib/users";

type GuardResult = { user: UserDoc } | { error: NextResponse };

export async function requireUser(): Promise<GuardResult> {
  const session = await getSessionUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  // The Firestore document is created lazily on first authenticated request so
  // a verified session always resolves to a usable profile.
  const user = await ensureUserDoc(session.uid, { email: session.email });
  return { user };
}

// For money-moving actions: requires an authenticated user that is linked to a
// Bridge customer AND has completed KYC. Mirrors the client-side gating so the
// API can't be called directly to bypass verification.
export async function requireVerifiedCustomer(): Promise<GuardResult> {
  const result = await requireUser();
  if ("error" in result) return result;
  const { user } = result;

  if (!user.bridgeCustomerId) {
    return { error: NextResponse.json({ error: "No Bridge customer linked" }, { status: 400 }) };
  }
  if (user.kycStatus !== "approved") {
    return {
      error: NextResponse.json({ error: "Identity verification required" }, { status: 403 }),
    };
  }
  return { user };
}
