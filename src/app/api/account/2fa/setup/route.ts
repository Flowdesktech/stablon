import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireUser } from "@/lib/api-guards";
import { updateUserDoc } from "@/lib/users";
import { generateTotpSecret, totpKeyUri } from "@/lib/totp";
import { encryptSecret } from "@/lib/crypto";

// Begins 2FA enrollment: generates a fresh secret, stores it (still disabled),
// and returns the otpauth URI + a QR code data URL for the authenticator app.
export async function POST() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    const { user } = guard;

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled" },
        { status: 400 }
      );
    }

    const secret = generateTotpSecret();
    const otpauthUrl = totpKeyUri(user.email, secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Persist the pending secret (encrypted); it only becomes active once
    // verified. Recovery codes are cleared until enrollment completes.
    await updateUserDoc(user.uid, {
      twoFactorSecret: encryptSecret(secret),
      twoFactorEnabled: false,
      twoFactorRecoveryCodes: null,
    });

    return NextResponse.json({ secret, otpauthUrl, qrCode });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
