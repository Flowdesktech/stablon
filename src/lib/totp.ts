import { generateSecret, generateURI, verify } from "otplib";

export const TOTP_ISSUER = "Stablon";

export function generateTotpSecret() {
  return generateSecret();
}

export function totpKeyUri(account: string, secret: string) {
  return generateURI({ issuer: TOTP_ISSUER, label: account, secret });
}

// Allow ±30s (one time-step) tolerance to absorb clock drift between the
// server and the user's device.
export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({
      secret,
      token: token.replace(/\s/g, ""),
      epochTolerance: 30,
    });
    return result.valid;
  } catch {
    return false;
  }
}
