import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import { verifyTotp } from "@/lib/totp";
import { decryptSecret } from "@/lib/crypto";
import { consumeRecoveryCode, parseRecoveryCodes } from "@/lib/recovery-codes";

// Disables 2FA. Requires a valid current TOTP code or an unused recovery code
// so a hijacked session can't silently remove protection.
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    const { code } = await req.json().catch(() => ({}));

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ success: true, enabled: false });
    }

    let codeOk = false;
    if (code && user.twoFactorSecret) {
      const secret = decryptSecret(user.twoFactorSecret);
      codeOk = await verifyTotp(String(code), secret);
      // Fall back to a recovery code if the TOTP code didn't match.
      if (!codeOk) {
        const remaining = await consumeRecoveryCode(
          String(code),
          parseRecoveryCodes(user.twoFactorRecoveryCodes)
        );
        codeOk = remaining !== null;
      }
    }

    if (!codeOk) {
      return NextResponse.json(
        { error: "Enter a valid authentication code or recovery code to disable 2FA" },
        { status: 400 }
      );
    }

    await updateUserDoc(user.uid, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
    });

    return NextResponse.json({ success: true, enabled: false });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
