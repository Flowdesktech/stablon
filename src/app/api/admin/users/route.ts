import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-guards";
import { getAdminDb } from "@/lib/firebase/admin";
import { apiError } from "@/lib/api-error";

// Admin: list every user profile. Returns non-sensitive fields only (no 2FA
// secrets, recovery codes, or passcode hashes).
export async function GET() {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  try {
    const snap = await getAdminDb().collection("users").get();
    const data = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        email: (d.email as string) ?? "",
        name: (d.name as string) ?? null,
        kycStatus: (d.kycStatus as string) ?? "none",
        bridgeCustomerId: (d.bridgeCustomerId as string) ?? null,
        twoFactorEnabled: Boolean(d.twoFactorEnabled),
        appLockEnabled: Boolean(d.appLockHash),
        superAdmin: Boolean(d.superAdmin),
        loginDisabled: Boolean(d.loginDisabled),
        createdAt: (d.createdAt as string) ?? null,
      };
    });
    // Newest first when a createdAt exists.
    data.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}
