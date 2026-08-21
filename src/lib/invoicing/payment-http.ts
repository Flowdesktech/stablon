import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BridgeError } from "@/lib/bridge";
import { InvoicePaymentError } from "@/lib/invoicing/payments";

export function invoicePaymentError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid request" },
      { status: 400 }
    );
  }
  if (error instanceof InvoicePaymentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && error.message === "Invalid JSON body") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof BridgeError) {
    console.error("Bridge invoice payment error:", error);
    return NextResponse.json(
      { error: "The payment provider is temporarily unavailable." },
      { status: 502 }
    );
  }
  console.error("Invoice payment error:", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
