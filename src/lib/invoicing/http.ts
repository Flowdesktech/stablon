import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export function assertSameOrigin(request: Request): NextResponse | null {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") {
    return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => {
    throw new Error("Invalid JSON body");
  });
  return schema.parse(body);
}

export function invoicingError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid request", issues: error.issues },
      { status: 400 }
    );
  }
  const message = error instanceof Error ? error.message : "Internal error";
  const lower = message.toLowerCase();
  const status =
    lower.includes("not found")
      ? 404
      : lower.includes("cannot") ||
          lower.includes("invalid") ||
          lower.includes("configure") ||
          lower.includes("complete bridge") ||
          lower.includes("only draft")
        ? 400
        : 500;
  if (status === 500) console.error("Invoicing error:", error);
  return NextResponse.json(
    { error: status === 500 ? "Something went wrong. Please try again." : message },
    { status }
  );
}
