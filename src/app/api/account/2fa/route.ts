import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guards";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("error" in guard) return guard.error;
    return NextResponse.json({ enabled: Boolean(guard.user.twoFactorEnabled) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
