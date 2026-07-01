import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";

const CODE_COUNT = 10;

function normalize(code: string): string {
  return code.replace(/[\s-]/g, "").toLowerCase();
}

// Human-friendly codes like "a1b2c-3d4e5". Displayed once; only hashes stored.
export function generateRecoveryCodes(count = CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex"); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => hash(normalize(c), 10)));
}

export function serializeRecoveryCodes(hashes: string[]): string {
  return JSON.stringify(hashes);
}

export function parseRecoveryCodes(serialized: string | null | undefined): string[] {
  if (!serialized) return [];
  try {
    const parsed = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

// Returns the remaining hashes (with the matched one removed) if the input
// matches an unused recovery code, otherwise null.
export async function consumeRecoveryCode(
  input: string,
  hashes: string[]
): Promise<string[] | null> {
  const normalized = normalize(input);
  for (let i = 0; i < hashes.length; i++) {
    if (await compare(normalized, hashes[i])) {
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}
