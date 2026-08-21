import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runRecurringInvoiceScheduler } from "@/lib/invoicing/recurring-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function validAuthorization(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  if (!validAuthorization(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runRecurringInvoiceScheduler();
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Recurring invoice cron failed:", error);
    return NextResponse.json(
      { error: "Recurring invoice scheduler failed" },
      { status: 500 }
    );
  }
}
