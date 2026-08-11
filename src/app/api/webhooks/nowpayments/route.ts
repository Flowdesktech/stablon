import { NextResponse } from "next/server";
import { verifyIpnSignature } from "@/lib/nowpayments";
import { updateUserDoc } from "@/lib/users";

export const maxDuration = 30;

// NOWPayments IPN callback. Verifies the HMAC signature, then flips the user's
// vaFeePaid flag once the payment reaches a final successful state. Always
// returns 200 quickly so NOWPayments doesn't keep retrying; only signature
// failures are rejected.
export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const signature = req.headers.get("x-nowpayments-sig");
  if (!verifyIpnSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const status = String(payload.payment_status || "").toLowerCase();
  const uid = String(payload.order_id || "");

  if ((status === "finished" || status === "confirmed") && uid) {
    try {
      // Idempotent: setting the flag again on a duplicate IPN is a no-op.
      await updateUserDoc(uid, { vaFeePaid: true });
    } catch (error) {
      console.error("Failed to mark vaFeePaid for", uid, error);
      // Still 200: don't surface internal errors to NOWPayments retries.
    }
  }

  return NextResponse.json({ ok: true });
}
