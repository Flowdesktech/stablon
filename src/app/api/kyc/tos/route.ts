import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";

// Returns a hosted Bridge Terms-of-Service acceptance URL for direct (API-based)
// KYC. The page redirects back to `redirect_uri` with a `signed_agreement_id`
// query param once the user accepts — that id is required to create/update the
// customer via the Customers API.
export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;

    const { redirect_uri } = await req.json().catch(() => ({}));
    const link = await bridge.createTosLink(
      typeof redirect_uri === "string" && redirect_uri ? redirect_uri : undefined
    );
    return NextResponse.json(link);
  } catch (error) {
    return apiError(error);
  }
}
