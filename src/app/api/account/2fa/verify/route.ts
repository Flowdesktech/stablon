import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import { verifyTotp } from "@/lib/totp";
import { decryptSecret } from "@/lib/crypto";
import { generateRecoveryCodes, hashRecoveryCodes, serializeRecoveryCodes } from "@/lib/recovery-codes";

// Completes enrollment: verifies the first code against the pending secret,
// activates 2FA, and returns one-time recovery codes (shown once).
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Start two-factor setup first" },
        { status: 400 }
      );
    }

    const secret = decryptSecret(user.twoFactorSecret);
    if (!(await verifyTotp(String(code), secret))) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
    }

    const recoveryCodes = generateRecoveryCodes();
    const hashed = await hashRecoveryCodes(recoveryCodes);

    await updateUserDoc(user.uid, {
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: serializeRecoveryCodes(hashed),
    });

    return NextResponse.json({ success: true, enabled: true, recoveryCodes });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
