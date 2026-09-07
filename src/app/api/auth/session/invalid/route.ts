import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/firebase/server-auth";

export async function GET(request: Request) {
  await clearSessionCookies();

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
