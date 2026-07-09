import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";

// Valid occupation codes for the advanced-KYC `most_recent_occupation` field.
// The list is effectively static, so allow the client/CDN to cache it.
export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;

    const data = await bridge.getOccupationCodes();
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, max-age=86400" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
