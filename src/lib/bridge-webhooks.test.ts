import { generateKeyPairSync, sign } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { parseBridgeWebhook, verifyBridgeWebhookSignature } from "./bridge-webhooks";

describe("Bridge webhook verification", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  afterEach(() => {
    delete process.env.BRIDGE_WEBHOOK_PUBLIC_KEY;
  });

  it("verifies Bridge's timestamp.raw-body RSA-SHA256 signature", () => {
    const timestamp = String(Date.now());
    const body = JSON.stringify({
      event_id: "evt_123",
      event_type: "transfer.updated",
      event_object: { id: "transfer_123" },
    });
    const signature = sign(
      "RSA-SHA256",
      Buffer.from(`${timestamp}.${body}`),
      privateKey
    ).toString("base64");
    process.env.BRIDGE_WEBHOOK_PUBLIC_KEY = publicKey;

    expect(
      verifyBridgeWebhookSignature(body, `t=${timestamp},v0=${signature}`)
    ).toBe(true);
    expect(verifyBridgeWebhookSignature(`${body} `, `t=${timestamp},v0=${signature}`)).toBe(
      false
    );
  });

  it("rejects stale signatures and malformed payloads", () => {
    process.env.BRIDGE_WEBHOOK_PUBLIC_KEY = publicKey;
    expect(verifyBridgeWebhookSignature("{}", `t=${Date.now() - 700_000},v0=abc=`)).toBe(
      false
    );
    expect(parseBridgeWebhook('{"event_id":"x"}')).toBeNull();
  });
});
