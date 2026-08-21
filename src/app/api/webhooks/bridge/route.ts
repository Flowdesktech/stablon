import { NextResponse } from "next/server";
import {
  parseBridgeWebhook,
  verifyBridgeWebhookSignature,
} from "@/lib/bridge-webhooks";
import { processBridgeWebhookEvent } from "@/lib/invoicing/payments";

export const maxDuration = 30;

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (
    !verifyBridgeWebhookSignature(
      rawBody,
      request.headers.get("x-webhook-signature")
    )
  ) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const event = parseBridgeWebhook(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    const result = await processBridgeWebhookEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("Failed to persist Bridge webhook:", error);
    return NextResponse.json({ error: "Webhook persistence failed" }, { status: 500 });
  }
}
