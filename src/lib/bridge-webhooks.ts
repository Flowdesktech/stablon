import { createVerify } from "crypto";

const MAX_WEBHOOK_AGE_MS = 10 * 60 * 1000;

export interface BridgeWebhookPayload {
  event_id: string;
  event_type: string;
  event_category?: string;
  event_created_at?: string;
  event_object: Record<string, unknown>;
}

function decodeBase64Strict(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) return null;
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    const decoded = Buffer.from(padded, "base64");
    if (decoded.toString("base64").replace(/=+$/, "") !== value.replace(/=+$/, "")) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function verifyBridgeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const publicKey = process.env.BRIDGE_WEBHOOK_PUBLIC_KEY?.replace(/\\n/g, "\n");
  if (!publicKey || !signatureHeader) return false;

  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const separator = part.indexOf("=");
      return [
        separator === -1 ? part.trim() : part.slice(0, separator).trim(),
        separator === -1 ? "" : part.slice(separator + 1).trim(),
      ];
    })
  );
  const timestamp = parts.get("t");
  const encodedSignature = parts.get("v0");
  if (!timestamp || !/^\d{10,16}$/.test(timestamp) || !encodedSignature) return false;

  const timestampMs = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > MAX_WEBHOOK_AGE_MS
  ) {
    return false;
  }

  const signature = decodeBase64Strict(encodedSignature);
  if (!signature) return false;

  try {
    // createVerify("RSA-SHA256") performs the SHA-256 digest itself. Passing a
    // pre-hashed digest here would hash twice and reject every valid Bridge
    // signature.
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${timestamp}.${rawBody}`, "utf8");
    verifier.end();
    return verifier.verify(publicKey, signature);
  } catch {
    return false;
  }
}

export function parseBridgeWebhook(rawBody: string): BridgeWebhookPayload | null {
  try {
    const value = JSON.parse(rawBody) as Partial<BridgeWebhookPayload>;
    if (
      typeof value.event_id !== "string" ||
      value.event_id.length < 1 ||
      value.event_id.length > 256 ||
      typeof value.event_type !== "string" ||
      value.event_type.length < 1 ||
      value.event_type.length > 128 ||
      !value.event_object ||
      typeof value.event_object !== "object" ||
      Array.isArray(value.event_object)
    ) {
      return null;
    }
    return {
      event_id: value.event_id,
      event_type: value.event_type,
      event_category:
        typeof value.event_category === "string" ? value.event_category : undefined,
      event_created_at:
        typeof value.event_created_at === "string" ? value.event_created_at : undefined,
      event_object: value.event_object,
    };
  } catch {
    return null;
  }
}
