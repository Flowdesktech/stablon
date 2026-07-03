import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-guards";
import { getAdminDb } from "@/lib/firebase/admin";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";
import type { BridgeWallet } from "@/types/bridge";

interface AdminWallet extends BridgeWallet {
  owner: { uid: string; email: string; name: string | null };
}

// Admin: aggregate wallets across every user linked to a Bridge customer. Each
// customer's wallets are fetched independently; a failure for one customer
// won't sink the whole response.
export async function GET() {
  const guard = await requireSuperAdmin();
  if ("error" in guard) return guard.error;

  try {
    const snap = await getAdminDb().collection("users").get();
    const owners = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          uid: doc.id,
          email: (d.email as string) ?? "",
          name: (d.name as string) ?? null,
          bridgeCustomerId: (d.bridgeCustomerId as string) ?? null,
        };
      })
      .filter((o): o is typeof o & { bridgeCustomerId: string } =>
        Boolean(o.bridgeCustomerId)
      );

    const nested = await Promise.all(
      owners.map(async (o) => {
        try {
          const res = await bridge.getWallets(o.bridgeCustomerId);
          return (res.data ?? []).map(
            (w): AdminWallet => ({
              ...w,
              owner: { uid: o.uid, email: o.email, name: o.name },
            })
          );
        } catch {
          return [] as AdminWallet[];
        }
      })
    );

    return NextResponse.json({ data: nested.flat() });
  } catch (error) {
    return apiError(error);
  }
}
