import { NextResponse } from "next/server";
import * as bridge from "@/lib/bridge";
import { apiError } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || "usdc";
    const to = searchParams.get("to") || "usd";

    const rate = await bridge.getExchangeRate(from, to);
    return NextResponse.json(rate);
  } catch (error) {
    return apiError(error);
  }
}
