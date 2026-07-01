import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import * as bridge from "@/lib/bridge";

// Called right after a Firebase account is created and a session is established.
// The Firebase user (email/password) and the Firestore profile already exist by
// this point; here we persist the display name and best-effort link a Bridge
// customer so the user doesn't have to do it manually later.
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const { name } = await req.json().catch(() => ({}));
    const displayName = typeof name === "string" && name.trim() ? name.trim() : user.name;

    if (displayName && displayName !== user.name) {
      await updateUserDoc(user.uid, { name: displayName });
    }

    // Best-effort: registration still succeeds if Bridge is unavailable (e.g.
    // missing API key) — the dashboard banner remains as a fallback.
    if (!user.bridgeCustomerId) {
      try {
        const customer = await bridge.createCustomer({
          full_name: displayName || user.email,
          email: user.email,
          type: "individual",
        });
        await updateUserDoc(user.uid, { bridgeCustomerId: customer.id });
      } catch (err) {
        console.error("Bridge customer creation failed during registration:", err);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
