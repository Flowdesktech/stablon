import { NextResponse } from "next/server";
import { BridgeError, bridgeErrorMessage } from "@/lib/bridge";

// Standard API error response: surfaces Bridge's human-readable message (never
// the raw `Bridge API 4xx: {json}` blob) and preserves Bridge's status code.
export function apiError(error: unknown) {
  const status = error instanceof BridgeError ? error.status : 500;
  return NextResponse.json({ error: bridgeErrorMessage(error) }, { status });
}
