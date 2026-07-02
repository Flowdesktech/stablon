import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// One-way hashing for the app-lock passcode. Stored as `salt:hash` (base64).
// A passcode is a convenience lock on top of the real Firebase auth session, so
// scrypt with a per-passcode random salt is sufficient.

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(passcode, salt, 32);
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(passcode, salt, expected.length);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
