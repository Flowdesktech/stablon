import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "session";

// Protected app paths (the (dashboard) route group). Cookie presence is enough
// for redirect UX here — the cookie's validity is verified server-side in the
// API routes via the Firebase Admin SDK on every data request.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/accounts",
  "/deposit",
  "/withdraw",
  "/card",
  "/swap",
  "/earn",
  "/settings",
  "/admin",
  "/verify",
];

const AUTH_PATHS = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Signed-in users shouldn't see the marketing/intro or auth pages — send them
  // straight to the app.
  if ((pathname === "/" || AUTH_PATHS.includes(pathname)) && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/accounts/:path*",
    "/deposit/:path*",
    "/withdraw/:path*",
    "/card/:path*",
    "/swap/:path*",
    "/earn/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/verify/:path*",
    "/login",
    "/register",
  ],
};
