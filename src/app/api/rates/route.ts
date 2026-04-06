import { NextResponse } from "next/server";
import * as bridge from "@/lib/bridge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || "usdc";
    const to = searchParams.get("to") || "usd";

    const rate = await bridge.getExchangeRate(from, to);
    return NextResponse.json(rate);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
